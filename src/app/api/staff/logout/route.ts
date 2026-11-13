import { NextResponse } from "next/server";
import { sessionDb } from "@/lib/supabase";
import { apiError, requireOrigin } from "@/lib/http";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const db = await sessionDb();
    const { error } = await db.auth.signOut();
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
