import { NextResponse } from "next/server";
import { z } from "zod";
import { staffSession } from "@/lib/auth";
import { submissionBlockers, whatsappBlockers } from "@/lib/config";
import { apiError, HttpError, readJson, requireOrigin } from "@/lib/http";
import { settingsSchema } from "@/lib/validation";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const { db } = await staffSession(true);
    const input = z.object({
      settings: settingsSchema, recipients: z.array(z.email().max(254)).min(1).max(10),
      whatsapp_enabled: z.boolean(),
      whatsapp_recipients: z.array(z.string().regex(/^\+[1-9]\d{7,14}$/)).max(10),
      whatsapp_consent: z.boolean(),
    }).parse(await readJson(request));
    if (input.settings.accepting_requests && submissionBlockers().length) throw new HttpError(400, "Configure the missing server integrations before opening requests.");
    if (input.whatsapp_enabled && (!input.whatsapp_consent || !input.whatsapp_recipients.length)) throw new HttpError(400, "WhatsApp alerts need opted-in recipient numbers.");
    if (input.whatsapp_enabled && whatsappBlockers().length) throw new HttpError(400, "Configure WhatsApp credentials, an approved template and the webhook before enabling automatic WhatsApp alerts.");
    const { error } = await db.rpc("save_business_settings", {
      p_settings: input.settings, p_recipients: [...new Set(input.recipients.map(r => r.toLowerCase()))],
      p_whatsapp_enabled: input.whatsapp_enabled, p_whatsapp_recipients: [...new Set(input.whatsapp_recipients)],
      p_whatsapp_consent: input.whatsapp_consent,
    });
    if (error?.message.includes("CURRENCY_LOCKED")) throw new HttpError(400, "Currency cannot change while menu items exist. Contact your administrator to migrate prices safely.");
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
