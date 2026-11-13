import "server-only";
import { AuthSessionMissingError } from "@supabase/supabase-js";
import { sessionDb } from "./supabase";
import { databaseConfigured } from "./config";
import { HttpError } from "./http";

export async function optionalCustomerSession() {
  if (!databaseConfigured()) return null;
  const db = await sessionDb();
  const { data: { user }, error } = await db.auth.getUser();
  if (error) {
    if (error instanceof AuthSessionMissingError || error.status === 401 || error.code === "refresh_token_not_found") return null;
    throw error;
  }
  if (!user) return null;
  return { db, user };
}
export async function customerSession() {
  const session = await optionalCustomerSession();
  if (!session?.user.email || !session.user.email_confirmed_at) throw new HttpError(401, "Sign in with a verified email address to continue.");
  return session;
}
export async function customerSummary() {
  const session = await optionalCustomerSession();
  if (!session?.user.email_confirmed_at || !session.user.email) return null;
  const { data, error } = await session.db.from("customer_profiles").select("full_name,phone").eq("id", session.user.id).maybeSingle();
  if (error) throw error;
  return { email: session.user.email, full_name: data?.full_name ?? "", phone: data?.phone ?? "" };
}
export function customerAuthBlockers() {
  const blockers: string[] = [];
  if (!databaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) blockers.push("Database access");
  if (!process.env.APP_URL) blockers.push("Website address");
  if (!process.env.RATE_LIMIT_SECRET || process.env.RATE_LIMIT_SECRET.length < 32) blockers.push("Login protection");
  if (process.env.CUSTOMER_AUTH_ENABLED !== "true") blockers.push("Verified customer email delivery");
  if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) blockers.push("Login spam protection");
  return blockers;
}
