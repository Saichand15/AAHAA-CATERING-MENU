import "server-only";
import { serviceDb } from "./supabase";
import { appUrl, whatsappBlockers } from "./config";
import { buildEmail } from "./email";
import { buildWhatsAppMessage } from "./whatsapp";

class DeliveryError extends Error {
  constructor(public safeMessage: string, public permanent = false) { super(safeMessage); }
}

export async function deliverNotifications() {
  const origin = appUrl();
  const db = serviceDb();
  const exhausted = await db.from("notification_jobs").update({ status: "failed", last_error: "Delivery attempts exhausted. Check provider logs before retrying.", locked_until: null, lease_token: null })
    .eq("status", "processing").gte("attempts", 5).lte("locked_until", new Date().toISOString());
  if (exhausted.error) throw exhausted.error;
  const { data: jobs, error } = await db.rpc("claim_notifications", {});
  if (error) throw error;
  const result = { claimed: jobs.length, accepted: 0, retried: 0, failed: 0 };
  for (const job of jobs) {
    let whatsappSendStarted = false;
    try {
      if (job.channel === "email" && job.attempts > 1 && Date.now() - new Date(job.created_at).getTime() > 23 * 3600_000) {
        throw new DeliveryError("Delivery is uncertain and the safe retry window has elapsed. Check the provider dashboard before manually retrying.", true);
      }
      const [{ data: saved, error: savedError }, { data: request, error: requestError }, { data: settings, error: settingsError }] = await Promise.all([
        db.from("notification_jobs").select("message,whatsapp_message,send_started_at,delivery_status,provider_id").eq("id", job.id).single(),
        db.from("catering_requests").select("*").eq("id", job.request_id).single(),
        db.from("business_settings").select("*").eq("id", true).single(),
      ]);
      if (savedError || requestError || settingsError) throw new DeliveryError("Could not load the saved notification details.");
      let providerId: string;
      if (job.channel === "whatsapp") {
        if (saved.send_started_at) throw new DeliveryError("A previous WhatsApp send has an uncertain outcome. Check Meta delivery logs before retrying; automatic resending is disabled.", true);
        if (whatsappBlockers().length) throw new DeliveryError("WhatsApp setup is incomplete. Configure the sender, template, credentials and webhook.", true);
        const message = saved.whatsapp_message ?? buildWhatsAppMessage(request, job.recipient, origin, process.env.WHATSAPP_TEMPLATE_NAME!, process.env.WHATSAPP_TEMPLATE_LANGUAGE!);
        const { error: snapshotError } = await db.from("notification_jobs").update({ whatsapp_message: message, send_started_at: new Date().toISOString(), send_token: job.lease_token })
          .eq("id", job.id).eq("lease_token", job.lease_token).select("id").single();
        if (snapshotError) throw new DeliveryError("Could not preserve the WhatsApp send attempt.");
        // Meta has no equivalent of Resend's idempotency key: never blindly resend an uncertain attempt.
        whatsappSendStarted = true;
        const response = await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
          method: "POST", headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ...message, biz_opaque_callback_data: `${job.id}:${job.lease_token}` }), signal: AbortSignal.timeout(15000),
        });
        if (response.status === 429) {
          whatsappSendStarted = false;
          throw new DeliveryError("WhatsApp rate limit reached. Another attempt will be scheduled.");
        }
        if (!response.ok) throw new DeliveryError(`WhatsApp provider returned HTTP ${response.status}. Check Meta delivery logs and template approval before retrying.`, true);
        const payload: { messages?: { id?: string }[] } = await response.json();
        if (!payload.messages?.[0]?.id) throw new DeliveryError("WhatsApp did not return a message ID; delivery is uncertain.", true);
        providerId = payload.messages[0].id;
        const acknowledged = await db.rpc("acknowledge_whatsapp_send", { p_id: job.id, p_lease_token: job.lease_token, p_provider_id: providerId });
        if (acknowledged.error || !acknowledged.data) throw new DeliveryError("WhatsApp accepted the message but the local acknowledgment is uncertain. Check delivery before retrying.", true);
      } else {
        if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) throw new DeliveryError("Email sender credentials are not configured.", true);
        const message = saved.message ?? buildEmail(request, settings, job.recipient, job.audience, origin, process.env.EMAIL_FROM);
        if (!saved.message) {
          const { error: snapshotError } = await db.from("notification_jobs").update({ message }).eq("id", job.id).eq("lease_token", job.lease_token).select("id").single();
          if (snapshotError) throw new DeliveryError("Could not preserve the email snapshot.");
        }
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `catering/${job.id}` },
          body: JSON.stringify(message), signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new DeliveryError(`Email provider returned HTTP ${response.status}. Check domain verification, account limits and provider logs.`, response.status >= 400 && response.status < 500 && response.status !== 429);
        const payload: { id?: string } = await response.json();
        if (!payload.id) throw new DeliveryError("The email provider did not return a message ID.");
        providerId = payload.id;
        const { error: updateError } = await db.from("notification_jobs").update({ status: "sent", provider_id: providerId, sent_at: new Date().toISOString(), locked_until: null, lease_token: null, last_error: null })
          .eq("id", job.id).eq("lease_token", job.lease_token).select("id").single();
        if (updateError) throw new DeliveryError("Provider accepted the message but its status could not be saved. An idempotent retry is required.");
      }
      result.accepted++;
    } catch (error) {
      const permanent = whatsappSendStarted || (error instanceof DeliveryError && error.permanent);
      const failed = permanent || job.attempts >= 5;
      const safeMessage = error instanceof DeliveryError ? error.safeMessage : whatsappSendStarted
        ? "WhatsApp delivery is uncertain after a connection interruption. Check delivery before manually retrying."
        : "Notification delivery was interrupted. The saved request is unaffected.";
      console.error("Notification attempt failed", { job: job.id, channel: job.channel, attempt: job.attempts, permanent });
      const { data: updated, error: updateError } = await db.from("notification_jobs").update({
        status: failed ? "failed" : "pending", last_error: safeMessage, locked_until: null, lease_token: null,
        ...(!whatsappSendStarted && job.channel === "whatsapp" ? { send_started_at: null } : {}),
        next_attempt_at: new Date(Date.now() + 60_000 * 2 ** job.attempts).toISOString(),
      }).eq("id", job.id).eq("lease_token", job.lease_token).eq("status", "processing").select("id").maybeSingle();
      if (updateError) throw updateError;
      if (!updated) {
        const { data: current, error: currentError } = await db.from("notification_jobs").select("status,delivery_status").eq("id", job.id).single();
        if (currentError) throw currentError;
        if (job.channel !== "whatsapp" || !current.delivery_status) throw new DeliveryError("Notification lease changed before the failed attempt could be recorded.", true);
        // A signed delivery webhook can beat a timeout or acknowledgment failure.
        const cleanup = await db.from("notification_jobs").update({ locked_until: null, lease_token: null }).eq("id", job.id).eq("lease_token", job.lease_token);
        if (cleanup.error) throw cleanup.error;
        if (current.status === "sent") result.accepted++; else result.failed++;
        await new Promise(resolve => setTimeout(resolve, 600));
        continue;
      }
      if (failed) result.failed++; else result.retried++;
    }
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  return result;
}
