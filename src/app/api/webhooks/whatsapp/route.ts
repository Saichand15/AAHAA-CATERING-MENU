import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceDb } from "@/lib/supabase";
import { apiError, HttpError } from "@/lib/http";

const statusSchema = z.object({
  id: z.string().min(1).max(512),
  status: z.enum(["sent", "delivered", "read", "failed"]),
  timestamp: z.string().regex(/^\d{1,12}$/),
  biz_opaque_callback_data: z.string().max(100).optional(),
  errors: z.array(z.object({ code: z.number().int() })).optional(),
});
const eventSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(z.object({
    changes: z.array(z.object({
      value: z.object({
        metadata: z.object({ phone_number_id: z.string() }).optional(),
        statuses: z.array(statusSchema).optional(),
      }),
    })),
  })),
});
function equal(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  const challenge = params.get("hub.challenge") ?? "";
  if (!token || params.get("hub.mode") !== "subscribe" || !equal(params.get("hub.verify_token") ?? "", token) || !/^\d{1,200}$/.test(challenge)) {
    return new NextResponse("Webhook verification denied.", { status: 403 });
  }
  return new NextResponse(challenge, { headers: { "Content-Type": "text/plain" } });
}
export async function POST(request: Request) {
  try {
    const secret = process.env.WHATSAPP_APP_SECRET;
    if (!secret) throw new HttpError(503, "WhatsApp webhook is not configured.");
    const reader = request.body?.getReader();
    if (!reader) throw new HttpError(400, "Missing webhook body.");
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.length;
      if (length > 256000) { await reader.cancel(); throw new HttpError(413, "Webhook is too large."); }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks);
    const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
    if (!equal(request.headers.get("x-hub-signature-256") ?? "", signature)) throw new HttpError(401, "Invalid webhook signature.");
    let input: unknown;
    try { input = JSON.parse(body.toString("utf8")); } catch { throw new HttpError(400, "Invalid webhook JSON."); }
    const event = eventSchema.parse(input);
    const db = serviceDb();
    for (const entry of event.entry) for (const change of entry.changes) {
      if (change.value.metadata?.phone_number_id !== process.env.WHATSAPP_PHONE_NUMBER_ID) continue;
      for (const status of change.value.statuses ?? []) {
        const [id, sendToken] = (status.biz_opaque_callback_data ?? "").split(":");
        if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(sendToken).success) {
          console.warn("Uncorrelated WhatsApp status ignored", { status: status.status });
          continue;
        }
        const timestamp = Number(status.timestamp) * 1000;
        if (!Number.isFinite(timestamp) || timestamp > Date.now() + 300000) throw new HttpError(400, "Invalid delivery timestamp.");
        const { error } = await db.rpc("record_whatsapp_status", {
          p_id: id, p_send_token: sendToken, p_provider_id: status.id, p_status: status.status,
          p_time: new Date(timestamp).toISOString(), p_error: status.status === "failed" ? `WhatsApp delivery failed (provider code ${status.errors?.[0]?.code ?? "unknown"}). Check Meta logs.` : "",
        });
        if (error) throw error;
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
