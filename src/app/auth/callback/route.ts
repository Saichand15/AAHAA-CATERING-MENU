import { NextResponse } from "next/server";
import { sessionDb } from "@/lib/supabase";
import { appUrl } from "@/lib/config";
import { customerRedirect } from "@/lib/customer-validation";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  if (code) {
    const db = await sessionDb();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(customerRedirect(params.get("next")), appUrl()));
    console.error("Customer email callback failed", { code: error.code });
  }
  return NextResponse.redirect(new URL("/login?error=verification", appUrl()));
}
