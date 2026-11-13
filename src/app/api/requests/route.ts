import { createHash, createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { serviceDb } from "@/lib/supabase";
import { appUrl, submissionBlockers, whatsappBlockers } from "@/lib/config";
import { apiError, HttpError, readJson, requireOrigin } from "@/lib/http";
import { priceCart, requestSchema, settingsSchema, validateEvent } from "@/lib/validation";
import { customerSession } from "@/lib/customer";

export async function POST(request: Request) {
  try {
    requireOrigin(request);
    if (submissionBlockers().length) throw new HttpError(503, "Online requests are not configured yet. Please contact the restaurant.");
    const input = requestSchema.parse(await readJson(request));
    const customer = input.customer_mode === "account" ? await customerSession() : null;
    if (customer && customer.user.email?.toLowerCase() !== input.email.toLowerCase()) {
      throw new HttpError(400, "Use your verified account email for this request.");
    }
    const db = serviceDb();
    // Vercel overwrites this header. Other hosts must supply an equivalent trusted proxy header.
    const ip = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() : "shared-origin";
    const key = createHmac("sha256", process.env.RATE_LIMIT_SECRET!).update(ip || "unknown").digest("hex");
    const { data: allowed, error: rateError } = await db.rpc("consume_rate_limit", { p_key: key, p_limit: process.env.VERCEL ? 10 : 60, p_window_seconds: 3600 });
    if (rateError) throw rateError;
    if (!allowed) throw new HttpError(429, "Too many attempts. Please try later or contact the restaurant.");
    const bypass = process.env.NODE_ENV === "development" && process.env.ALLOW_LOCAL_SUBMISSIONS === "true";
    if (!bypass) {
      const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST", body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: input.captcha_token }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new HttpError(503, "Spam verification is unavailable. Please retry.");
      const result: { success?: boolean; hostname?: string; action?: string } = await response.json();
      if (!result.success || result.hostname !== new URL(appUrl()).hostname || result.action !== "catering-request") {
        throw new HttpError(400, "Please complete the spam check again.");
      }
    }
    const { captcha_token: ignoredToken, website: ignoredWebsite, ...stableInput } = input;
    void ignoredToken; void ignoredWebsite;
    const hash = createHash("sha256").update(JSON.stringify({ ...stableInput, customer_id: customer?.user.id ?? null })).digest("hex");
    const { data: existing, error: existingError } = await db.from("catering_requests").select("reference,payload_hash,items,currency,known_subtotal_minor,has_unpriced_items").eq("idempotency_key", input.idempotency_key).maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      if (existing.payload_hash !== hash) throw new HttpError(409, "This submission was already received with different details. Start a new request.");
      return NextResponse.json({ reference: existing.reference, items: existing.items, currency: existing.currency, knownSubtotal: existing.known_subtotal_minor, hasUnpriced: existing.has_unpriced_items });
    }
    const [{ data: settings, error: settingsError }, { data: menu, error: menuError }, notifications] = await Promise.all([
      db.from("business_settings").select("*").eq("id", true).single(),
      db.from("menu_items").select("*").in("id", input.items.map(i => i.item_id)),
      db.from("notification_settings").select("whatsapp_enabled").eq("id", true).single(),
    ]);
    if (settingsError || menuError || notifications.error) throw settingsError || menuError || notifications.error;
    if (notifications.data.whatsapp_enabled && whatsappBlockers().length) throw new HttpError(503, "The restaurant's notification setup is incomplete. Please contact the team.");
    if (!settingsSchema.safeParse(settings).success) throw new HttpError(503, "Restaurant setup is incomplete. Please contact the restaurant.");
    validateEvent(input, settings);
    const priced = priceCart(input.items, menu);
    const { data, error } = await db.rpc("submit_catering_request", {
      p_key: input.idempotency_key, p_hash: hash, p_customer_id: customer?.user.id ?? null,
      p_payload: {
        customer_name: input.customer_name, email: input.email.toLowerCase(), phone: input.phone,
        preferred_contact: input.preferred_contact, event_type: input.event_type, event_date: input.event_date,
        event_time: input.event_time, timezone: settings.timezone, guests: input.guests, fulfillment: input.fulfillment,
        address: input.address, notes: input.notes, allergies: input.allergies, whatsapp_consent: input.whatsapp_consent,
        privacy_notice: settings.privacy_notice, privacy_accepted_at: new Date().toISOString(),
        currency: settings.currency, known_subtotal_minor: priced.knownSubtotal, has_unpriced_items: priced.hasUnpriced, items: priced.items,
      },
    });
    if (error?.message.includes("IDEMPOTENCY_CONFLICT")) throw new HttpError(409, "This submission has already been received with different details.");
    if (error?.message.includes("REQUESTS_PAUSED") || error?.message.includes("NOTIFICATION_RECIPIENTS_REQUIRED") || error?.message.includes("WHATSAPP_RECIPIENTS_REQUIRED")) throw new HttpError(503, "Online requests are currently paused. Please contact the restaurant.");
    if (error?.message.includes("VERIFIED_CUSTOMER_REQUIRED") || error?.message.includes("ACCOUNT_CONFLICT")) throw new HttpError(409, "Your account session changed. Sign in again and review the request.");
    if (error) throw error;
    if (!data?.[0]) throw new Error("Missing persisted request.");
    return NextResponse.json({ reference: data[0].reference, items: priced.items, currency: settings.currency, knownSubtotal: priced.knownSubtotal, hasUnpriced: priced.hasUnpriced }, { status: 201 });
  } catch (error) { return apiError(error); }
}
