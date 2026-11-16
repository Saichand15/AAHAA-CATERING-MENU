import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { serviceDb } from "./supabase";
import { optionalCustomerSession } from "./customer";
import { appUrl, chatBlockers } from "./config";
import { HttpError } from "./http";
import { chatPublicColumns, type ChatThread } from "./chat-types";

const guestCookie = "aahaa_chat";
const requestCookie = "aahaa_chat_request";
const cookieOptions = () => ({ httpOnly: true, secure: new URL(appUrl()).protocol === "https:", sameSite: "lax" as const, path: "/", maxAge: 7 * 86400 });
const signature = (value: string) => createHmac("sha256", process.env.RATE_LIMIT_SECRET!).update(value).digest("hex");
export const chatToken = (clientId: string) => signature(`chat-guest:${clientId}`);
export const chatTokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export function verifyRequestProof(value: string | undefined, now = Date.now()) {
  if (!value) return null;
  const [id, expires, mac, extra] = value.split(".");
  if (extra || !/^[0-9a-f-]{36}$/i.test(id ?? "") || !/^\d+$/.test(expires ?? "") || !/^[a-f0-9]{64}$/.test(mac ?? "") || Number(expires) < now) return null;
  const expected = signature(`chat-request:${id}.${expires}`);
  return timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(expected, "hex")) ? id : null;
}
export async function chatIdentity() {
  const session = await optionalCustomerSession();
  const userId = session?.user.email_confirmed_at ? session.user.id : null;
  const token = (await cookies()).get(guestCookie)?.value;
  return { userId, token: token && /^[a-f0-9]{64}$/.test(token) ? token : null };
}
export async function currentChat(identity: Awaited<ReturnType<typeof chatIdentity>>) {
  const db = serviceDb();
  if (identity.token) {
    const { data, error } = await db.from("chat_conversations").select("*").eq("access_hash", chatTokenHash(identity.token)).maybeSingle();
    if (error) throw error;
    if (data && (!data.customer_id || data.customer_id === identity.userId)) return data;
  }
  if (identity.userId) {
    const { data, error } = await db.from("chat_conversations").select("*").eq("customer_id", identity.userId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data;
  }
  return null;
}
export async function authorizedRequest(requestId: string | undefined, userId: string | null) {
  const proofId = verifyRequestProof((await cookies()).get(requestCookie)?.value);
  const id = requestId ?? proofId;
  if (!id) return null;
  const { data, error } = await serviceDb().from("catering_requests").select("id,customer_id").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data || (data.customer_id ? data.customer_id !== userId : id !== proofId)) {
    if (!requestId) return null;
    throw new HttpError(403, "This enquiry is not available to this chat session.");
  }
  return id;
}
export async function chatForRequest(requestId: string) {
  const db = serviceDb();
  const { data, error } = await db.from("chat_request_links").select("conversation_id").eq("request_id", requestId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const thread = await db.from("chat_conversations").select("*").eq("id", data.conversation_id).single();
  if (thread.error) throw thread.error;
  return thread.data;
}
export async function linkChatRequest(conversationId: string, requestId: string) {
  const { error } = await serviceDb().from("chat_request_links").upsert({ conversation_id: conversationId, request_id: requestId }, { onConflict: "request_id", ignoreDuplicates: true });
  if (error) throw error;
}
export async function chatThread(id: string, before?: number): Promise<ChatThread> {
  const db = serviceDb();
  let query = db.from("chat_messages").select("*").eq("conversation_id", id).order("id", { ascending: false }).limit(101);
  if (before) query = query.lt("id", before);
  const [conversation, messages, links] = await Promise.all([
    db.from("chat_conversations").select(chatPublicColumns).eq("id", id).single(), query,
    db.from("chat_request_links").select("request_id").eq("conversation_id", id),
  ]);
  for (const result of [conversation, messages, links]) if (result.error) throw result.error;
  const ids = links.data!.map(link => link.request_id);
  const requests = ids.length ? await db.from("catering_requests").select("id,reference").in("id", ids).order("created_at", { ascending: false }) : { data: [], error: null };
  if (requests.error) throw requests.error;
  return { conversation: conversation.data, messages: messages.data!.slice(0, 100).reverse(), hasMore: messages.data!.length > 100, requests: requests.data! };
}
export async function chatLimit(request: Request, scope: string, limit: number, seconds = 60) {
  if (chatBlockers().length) throw new HttpError(503, "Chat is not available yet. Please contact the AAHAA team by phone.");
  const ip = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() : "shared-origin";
  const key = signature(`chat:${scope}:${ip || "unknown"}`);
  const { data, error } = await serviceDb().rpc("consume_rate_limit", { p_key: key, p_limit: limit, p_window_seconds: seconds });
  if (error) throw error;
  if (!data) throw new HttpError(429, "Too many chat attempts. Please wait a moment before trying again.");
}
export async function verifyChatCaptcha(token: string) {
  if (process.env.NODE_ENV === "development" && process.env.ALLOW_LOCAL_SUBMISSIONS === "true") return;
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token }), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new HttpError(503, "Spam verification is unavailable. Please retry.");
  const result: { success?: boolean; hostname?: string; action?: string } = await response.json();
  if (!result.success || result.hostname !== new URL(appUrl()).hostname || result.action !== "customer-chat") throw new HttpError(400, "Please complete the chat spam check again.");
}
export function setChatCookie(response: NextResponse, token: string) {
  response.cookies.set(guestCookie, token, cookieOptions());
}
export function clearChatCookies(response: NextResponse) {
  for (const name of [guestCookie, requestCookie]) response.cookies.set(name, "", { ...cookieOptions(), maxAge: 0 });
}
export async function connectRequestChat(response: NextResponse, requestId: string) {
  const expires = Date.now() + 7 * 86400000;
  response.cookies.set(requestCookie, `${requestId}.${expires}.${signature(`chat-request:${requestId}.${expires}`)}`, cookieOptions());
  const conversation = await currentChat(await chatIdentity());
  if (conversation) await linkChatRequest(conversation.id, requestId);
}
export function chatMutationError(error: { message: string }) {
  if (error.message.includes("CHAT_MESSAGE_CONFLICT")) throw new HttpError(409, "That message was already sent with different text. Refresh the conversation before sending again.");
  throw error;
}
