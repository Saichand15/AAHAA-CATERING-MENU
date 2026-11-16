import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceDb } from "@/lib/supabase";
import { apiError, HttpError, readJson, requireOrigin } from "@/lib/http";
import { authorizedRequest, chatForRequest, chatIdentity, chatLimit, chatMutationError, chatThread, chatToken, chatTokenHash, currentChat, linkChatRequest, setChatCookie, verifyChatCaptcha } from "@/lib/chat";
import { chatMessageSchema, chatStartSchema } from "@/lib/chat-types";

export async function GET(request: Request) {
  try {
    await chatLimit(request, "read", 120);
    const url = new URL(request.url);
    const requestId = z.uuid().optional().parse(url.searchParams.get("request_id") ?? undefined);
    const before = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional().parse(url.searchParams.get("before") ?? undefined);
    const identity = await chatIdentity();
    const linkedRequest = requestId ? await authorizedRequest(requestId, identity.userId) : null;
    const conversation = (linkedRequest ? await chatForRequest(linkedRequest) : null) ?? await currentChat(identity);
    return NextResponse.json(conversation ? await chatThread(conversation.id, before) : { conversation: null, messages: [], requests: [], hasMore: false }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const raw = await readJson(request, 16000);
    const { action } = z.object({ action: z.enum(["start", "send", "read"]) }).parse(raw);
    await chatLimit(request, action === "start" ? "start" : action, action === "start" ? 5 : 60, action === "start" ? 3600 : 60);
    const identity = await chatIdentity();
    const db = serviceDb();
    if (action === "start") {
      const input = chatStartSchema.parse(raw);
      await verifyChatCaptcha(input.captcha_token);
      const requestId = await authorizedRequest(input.request_id, identity.userId);
      const existing = (requestId ? await chatForRequest(requestId) : null) ?? await currentChat(identity);
      if (existing) throw new HttpError(409, "A conversation already exists. Refresh the chat to continue it.");
      const { data: settings, error: settingsError } = await db.from("business_settings").select("privacy_notice").eq("id", true).single();
      if (settingsError) throw settingsError;
      if (settings.privacy_notice.trim().length < 50) throw new HttpError(503, "The restaurant privacy notice is not configured. Please contact the team.");
      const token = chatToken(input.client_id);
      const { data: id, error } = await db.rpc("start_customer_chat", {
        p_access_hash: chatTokenHash(token), p_customer_id: identity.userId, p_name: input.customer_name, p_phone: input.phone,
        p_privacy: settings.privacy_notice, p_client_id: input.client_id, p_body: input.body,
      });
      if (error) chatMutationError(error);
      if (!id) throw new Error("Missing saved chat.");
      const response = NextResponse.json({ id }, { status: 201 });
      setChatCookie(response, token);
      if (requestId) {
        try { await linkChatRequest(id, requestId); }
        catch (error) { console.error("Chat saved but enquiry linking failed", { id, requestId, error }); return withLinkWarning(response); }
      }
      return response;
    }
    const requestId = await authorizedRequest(z.object({ request_id: z.uuid().optional() }).parse(raw).request_id, identity.userId);
    const conversation = (requestId ? await chatForRequest(requestId) : null) ?? await currentChat(identity);
    if (!conversation) throw new HttpError(401, "Your private chat session is not available. Reopen chat or sign in to your account.");
    if (requestId) await linkChatRequest(conversation.id, requestId);
    if (action === "read") {
      const { message_id } = z.object({ message_id: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) }).parse(raw);
      const { error } = await db.rpc("mark_chat_read", { p_id: conversation.id, p_sender: "customer", p_message_id: message_id });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    const input = chatMessageSchema.parse(raw);
    const { data, error } = await db.rpc("send_chat_message", {
      p_id: conversation.id, p_client_id: input.client_id, p_sender: "customer",
      p_author_id: conversation.customer_id ? identity.userId : null, p_body: input.body,
    });
    if (error) chatMutationError(error);
    return NextResponse.json({ message: data }, { status: 201 });
  } catch (error) { return apiError(error); }
}
function withLinkWarning(response: NextResponse) {
  response.headers.set("X-Chat-Link-Warning", "Enquiry linking failed; include your reference in the chat.");
  return response;
}
