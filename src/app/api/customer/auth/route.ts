import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { customerAuthSchema } from "@/lib/customer-validation";
import { customerAuthBlockers } from "@/lib/customer";
import { sessionDb, serviceDb } from "@/lib/supabase";
import { appUrl } from "@/lib/config";
import { apiError, HttpError, readJson, requireOrigin } from "@/lib/http";

export async function POST(request: Request) {
  try {
    requireOrigin(request);
    if (customerAuthBlockers().length) throw new HttpError(503, "Customer accounts are not open yet. You can still browse and continue as a guest.");
    const input = customerAuthSchema.parse(await readJson(request, 8192));
    const network = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() || "unknown" : "shared-origin";
    const admin = serviceDb();
    for (const [value, limit] of [[`customer-email:${input.email}`, 10], [`customer-network:${network}`, process.env.VERCEL ? 30 : 100]] as const) {
      const key = createHmac("sha256", process.env.RATE_LIMIT_SECRET!).update(value).digest("hex");
      const { data, error } = await admin.rpc("consume_rate_limit", { p_key: key, p_limit: limit, p_window_seconds: 900 });
      if (error) throw error;
      if (!data) throw new HttpError(429, "Too many attempts. Please wait 15 minutes before trying again.");
    }
    if (process.env.NODE_ENV === "production" && !input.captcha_token) throw new HttpError(400, "Complete the spam check.");
    const db = await sessionDb();
    const options = { captchaToken: input.captcha_token || undefined };
    if (input.action === "login") {
      const { data, error } = await db.auth.signInWithPassword({ email: input.email, password: input.password, options });
      if (error || !data.user) {
        if (error?.status && error.status >= 500) throw error;
        throw new HttpError(401, "Could not sign in. Check your credentials and verify your email, or request a password reset.");
      }
      if (!data.user.email_confirmed_at) {
        const { error: logoutError } = await db.auth.signOut();
        if (logoutError) throw logoutError;
        throw new HttpError(401, "Verify your email before signing in.");
      }
      return NextResponse.json({ ok: true, signedIn: true });
    }
    const redirect = `${appUrl()}/auth/callback`;
    const result = input.action === "signup"
      ? await db.auth.signUp({ email: input.email, password: input.password, options: { ...options, emailRedirectTo: redirect } })
      : input.action === "resend"
        ? await db.auth.resend({ type: "signup", email: input.email, options: { ...options, emailRedirectTo: redirect } })
        : await db.auth.resetPasswordForEmail(input.email, { ...options, redirectTo: `${redirect}?next=/account/password` });
    if (result.error) {
      // Avoid exposing whether an address already has an account.
      if (result.error.code !== "user_already_exists" && result.error.code !== "user_not_found") {
        console.error("Customer auth request failed", { action: input.action, code: result.error.code });
        throw new HttpError(503, "The account email could not be requested. Please wait and try again, or contact the restaurant.");
      }
    }
    if (input.action === "signup") {
      const { error } = await db.auth.signOut();
      if (error && error.status !== 403) throw error;
    }
    return NextResponse.json({
      ok: true,
      message: input.action === "reset"
        ? "If the address has an account, a password-reset email has been requested. Check your inbox and spam folder."
        : "If the address is eligible, a verification email has been requested. Check your inbox and spam folder. Existing customers can sign in or reset their password.",
    });
  } catch (error) { return apiError(error); }
}
