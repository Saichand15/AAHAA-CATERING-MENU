import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sessionDb, serviceDb } from "@/lib/supabase";
import { apiError, HttpError, readJson, requireOrigin } from "@/lib/http";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const input = z.object({ email: z.email().max(254), password: z.string().min(1).max(256) }).parse(await readJson(request, 4096));
    if (!process.env.RATE_LIMIT_SECRET) throw new HttpError(503, "Staff login protection is not configured.");
    const db = await sessionDb();
    const key = createHmac("sha256", process.env.RATE_LIMIT_SECRET).update(`login:${input.email.toLowerCase()}`).digest("hex");
    const { data: allowed, error: rateError } = await serviceDb().rpc("consume_rate_limit", { p_key: key, p_limit: 10, p_window_seconds: 900 });
    if (rateError) throw rateError;
    if (!allowed) throw new HttpError(429, "Too many sign-in attempts. Please wait 15 minutes.");
    const { data, error } = await db.auth.signInWithPassword(input);
    if (error || !data.user) throw new HttpError(401, "Unable to sign in with those credentials.");
    const { data: member, error: memberError } = await db.from("staff_members").select("role").eq("user_id", data.user.id).maybeSingle();
    if (memberError || !member) {
      const { error: signOutError } = await db.auth.signOut();
      if (signOutError) throw signOutError;
      if (memberError) throw memberError;
      throw new HttpError(401, "Unable to sign in with those credentials. Contact the owner for access.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
