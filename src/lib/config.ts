export function databaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
export function submissionBlockers(): string[] {
  const missing: string[] = [];
  if (!databaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("Database connection");
  if (!process.env.APP_URL) missing.push("Public website address");
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) missing.push("Email delivery");
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 32) missing.push("Notification worker");
  if (!process.env.RATE_LIMIT_SECRET || process.env.RATE_LIMIT_SECRET.length < 32) missing.push("Submission protection");
  const localBypass = process.env.NODE_ENV === "development" && process.env.ALLOW_LOCAL_SUBMISSIONS === "true";
  if (!localBypass && (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || !process.env.TURNSTILE_SECRET_KEY)) missing.push("Spam protection");
  return missing;
}
export function appUrl() {
  const value = process.env.APP_URL;
  if (!value) throw new Error("APP_URL is not configured.");
  return new URL(value).origin;
}
export function whatsappBlockers() {
  const missing: string[] = [];
  if (!process.env.WHATSAPP_ACCESS_TOKEN) missing.push("WhatsApp access token");
  if (!/^\d+$/.test(process.env.WHATSAPP_PHONE_NUMBER_ID ?? "")) missing.push("WhatsApp sender phone ID");
  if (!/^v\d+\.\d+$/.test(process.env.WHATSAPP_API_VERSION ?? "")) missing.push("WhatsApp API version");
  if (!/^[a-z0-9_]+$/.test(process.env.WHATSAPP_TEMPLATE_NAME ?? "")) missing.push("Approved WhatsApp template");
  if (!process.env.WHATSAPP_TEMPLATE_LANGUAGE) missing.push("WhatsApp template language");
  if (!process.env.WHATSAPP_APP_SECRET || !process.env.WHATSAPP_VERIFY_TOKEN) missing.push("WhatsApp webhook verification");
  return missing;
}
