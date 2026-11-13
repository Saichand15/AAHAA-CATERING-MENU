import { NextResponse } from "next/server";
import { z } from "zod";
import { staffSession } from "@/lib/auth";
import { serviceDb } from "@/lib/supabase";
import { apiError, HttpError, readJson, requireOrigin } from "@/lib/http";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireOrigin(request);
    const { user } = await staffSession();
    const id = z.uuid().parse((await params).id);
    z.object({ delivery_checked: z.literal(true) }).parse(await readJson(request, 1024));
    const { data, error } = await serviceDb().from("notification_jobs").update({ status: "pending", attempts: 0, next_attempt_at: new Date().toISOString(), locked_until: null, lease_token: null, send_started_at: null, send_token: null, provider_id: null, delivery_status: null, delivery_updated_at: null, last_error: `Manual retry requested by staff ${user.id} after checking provider delivery.` })
      .eq("id", id).eq("status", "failed").select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new HttpError(409, "Only a failed notification can be retried. Refresh the page.");
    console.info("Notification retry requested", { job: id, actor: user.id });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
