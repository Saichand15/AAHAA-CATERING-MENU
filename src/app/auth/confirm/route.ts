import { NextResponse } from "next/server";
import { z } from "zod";
import { sessionDb } from "@/lib/supabase";
import { appUrl } from "@/lib/config";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = params.get("token_hash");
  const type = z.enum(["signup", "email", "recovery"]).safeParse(params.get("type"));
  if (token && token.length <= 512 && type.success) {
    const db = await sessionDb();
    const { error } = await db.auth.verifyOtp({ token_hash: token, type: type.data });
    if (!error) return NextResponse.redirect(new URL(type.data === "recovery" ? "/account/password" : "/account", appUrl()));
    console.error("Customer email verification failed", { code: error.code });
  }
  return NextResponse.redirect(new URL("/login?error=verification", appUrl()));
}
