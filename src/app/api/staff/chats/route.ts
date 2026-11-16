import { NextResponse } from "next/server";
import { z } from "zod";
import { staffSession } from "@/lib/auth";
import { serviceDb } from "@/lib/supabase";
import { apiError } from "@/lib/http";
import { chatPublicColumns } from "@/lib/chat-types";

export async function GET(request: Request) {
  try {
    await staffSession();
    const url = new URL(request.url);
    const offset = z.coerce.number().int().min(0).max(100000).parse(url.searchParams.get("offset") ?? 0);
    const db = serviceDb();
    const [threads, unread] = await Promise.all([
      db.from("chat_conversations").select(chatPublicColumns).order("updated_at", { ascending: false }).order("id").range(offset, offset + 49),
      db.rpc("chat_unread_count", {}),
    ]);
    if (threads.error || unread.error) throw threads.error || unread.error;
    return NextResponse.json({ conversations: threads.data, unread: unread.data, hasMore: threads.data.length === 50 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
