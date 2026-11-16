import { NextResponse } from "next/server";
import { sessionDb } from "@/lib/supabase";
import { apiError, requireOrigin } from "@/lib/http";
import { clearChatCookies } from "@/lib/chat";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const db = await sessionDb();
    const { error } = await db.auth.signOut();
    if (error) throw error;
    const response = NextResponse.json({ ok: true });
    clearChatCookies(response);
    return response;
  } catch (error) { return apiError(error); }
}
