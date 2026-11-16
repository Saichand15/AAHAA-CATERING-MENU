import { NextResponse } from "next/server";
import { z } from "zod";
import { staffSession } from "@/lib/auth";
import { serviceDb } from "@/lib/supabase";
import { apiError, HttpError, readJson, requireOrigin } from "@/lib/http";
import { chatMutationError, chatThread } from "@/lib/chat";
import { chatMessageSchema } from "@/lib/chat-types";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    await staffSession();
    const id = z.uuid().parse((await params).id);
    const before = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional().parse(new URL(request.url).searchParams.get("before") ?? undefined);
    return NextResponse.json(await chatThread(id, before), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request, { params }: Context) {
  try {
    requireOrigin(request);
    const { user } = await staffSession();
    const id = z.uuid().parse((await params).id);
    const input = z.discriminatedUnion("action", [
      chatMessageSchema.extend({ action: z.literal("send") }),
      z.object({ action: z.literal("read"), message_id: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) }),
      z.object({ action: z.literal("status"), status: z.enum(["open", "closed"]) }),
    ]).parse(await readJson(request, 12000));
    const db = serviceDb();
    if (input.action === "send") {
      const { data, error } = await db.rpc("send_chat_message", { p_id: id, p_client_id: input.client_id, p_sender: "staff", p_author_id: user.id, p_body: input.body });
      if (error) chatMutationError(error);
      return NextResponse.json({ message: data }, { status: 201 });
    }
    if (input.action === "read") {
      const { error } = await db.rpc("mark_chat_read", { p_id: id, p_sender: "staff", p_message_id: input.message_id });
      if (error) throw error;
    } else {
      const { data, error } = await db.from("chat_conversations").update({ status: input.status }).eq("id", id).select("id").maybeSingle();
      if (error) throw error;
      if (!data) throw new HttpError(404, "Conversation not found.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
