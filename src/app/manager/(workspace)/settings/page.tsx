import { staffSession } from "@/lib/auth";
import { submissionBlockers, whatsappBlockers } from "@/lib/config";
import { BusinessEditor } from "@/components/business-editor";
export default async function Settings() {
  const { db } = await staffSession(true);
  const [settings, notifications] = await Promise.all([
    db.from("business_settings").select("*").eq("id", true).single(),
    db.from("notification_settings").select("*").eq("id", true).single(),
  ]);
  if (settings.error || notifications.error) throw settings.error || notifications.error;
  const blockers = submissionBlockers();
  return <><div className="staff-title"><div><span className="eyebrow">MAKE IT YOUR RESTAURANT</span><h1>Business settings</h1><p>Confirm the real business details and policies before opening requests.</p></div></div>{blockers.length > 0 && <div className="notice"><div><strong>Server configuration still needed</strong><p>{blockers.join(" / ")}. Add these environment settings before opening online requests.</p></div></div>}<div className="notice"><div><strong>Email and optional automatic WhatsApp alerts</strong><p>Both use a durable notification queue. The scheduler must be active. {whatsappBlockers().length ? `WhatsApp setup still needs: ${whatsappBlockers().join(", ")}.` : "WhatsApp environment settings are present; confirm template approval and webhook delivery before launch."}</p></div></div><BusinessEditor settings={settings.data} recipients={notifications.data.recipients} blockers={blockers} whatsapp={{ enabled: notifications.data.whatsapp_enabled, recipients: notifications.data.whatsapp_recipients, consent: !!notifications.data.whatsapp_consent_at }} /></>;
}
