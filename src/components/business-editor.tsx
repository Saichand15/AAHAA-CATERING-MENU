"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { BusinessSettings } from "@/lib/types";
import { settingsSchema } from "@/lib/validation";
import { sendJson } from "./staff-controls";
export function BusinessEditor({ settings: s, recipients, blockers, whatsapp }: { settings: BusinessSettings; recipients: string[]; blockers: string[]; whatsapp: { enabled: boolean; recipients: string[]; consent: boolean } }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(""); setSuccess("");
    const values = new FormData(e.currentTarget);
    const text = (key: string) => String(values.get(key) ?? "").trim();
    try {
      const settings = settingsSchema.parse({
        name: text("name"), tagline: text("tagline"), phone: text("phone"), email: text("email"), whatsapp: text("whatsapp"),
        address: text("address"), service_area: text("service_area"), currency: text("currency"), timezone: text("timezone"),
        lead_hours: Number(text("lead_hours")), min_guests: Number(text("min_guests")), max_guests: Number(text("max_guests")),
        delivery_enabled: values.has("delivery_enabled"), pickup_enabled: values.has("pickup_enabled"),
        hours: text("hours"), privacy_notice: text("privacy_notice"), accepting_requests: values.has("accepting_requests"),
      });
      await sendJson("/api/staff/settings", {
        settings, recipients: text("recipients").split(/[\n,]/).map(v => v.trim().toLowerCase()).filter(Boolean),
        whatsapp_enabled: values.has("whatsapp_enabled"),
        whatsapp_recipients: text("whatsapp_recipients").split(/[\n,]/).map(v => v.trim()).filter(Boolean),
        whatsapp_consent: values.has("whatsapp_consent"),
      });
      setSuccess("Business settings saved."); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Settings could not be saved."); }
    finally { setBusy(false); }
  }
  return <form className="panel editor" onSubmit={submit}><fieldset disabled={busy} className="plain-fieldset"><h2>Restaurant details</h2><div className="form-grid"><label className="field">Restaurant name *<input name="name" defaultValue={s.name} required maxLength={100} /></label><label className="field">Tagline<input name="tagline" defaultValue={s.tagline} maxLength={200} /></label><label className="field">Store phone *<input name="phone" type="tel" defaultValue={s.phone} placeholder="+12125551234" required /></label><label className="field">Public contact email *<input name="email" type="email" defaultValue={s.email} required /></label><label className="field">WhatsApp number (optional)<input name="whatsapp" type="tel" defaultValue={s.whatsapp} placeholder="+12125551234" /><small>Enables manual WhatsApp contact, not automatic alerts.</small></label><label className="field">Business currency *<input name="currency" defaultValue={s.currency} pattern="[A-Z]{3}" maxLength={3} required /><small>ISO code, e.g. USD or INR. Locked once menu items exist.</small></label><label className="field">Restaurant timezone *<input name="timezone" defaultValue={s.timezone} required placeholder="America/Chicago" /><small>IANA timezone. Do not leave UTC unless it is correct.</small></label><label className="field">Business hours *<input name="hours" defaultValue={s.hours} required maxLength={500} /></label></div><label className="field">Restaurant / pickup address *<textarea name="address" defaultValue={s.address} required maxLength={500} /></label>
    <h2>Catering requests</h2><div className="form-grid"><label className="field">Minimum notice (hours)<input name="lead_hours" type="number" min={0} max={8760} required defaultValue={s.lead_hours} /></label><label className="field">Minimum guests<input name="min_guests" type="number" min={1} max={100000} required defaultValue={s.min_guests} /></label><label className="field">Maximum guests<input name="max_guests" type="number" min={1} max={100000} required defaultValue={s.max_guests} /></label></div><label className="checkbox-field"><input name="pickup_enabled" type="checkbox" defaultChecked={s.pickup_enabled} />Allow pickup requests</label><label className="checkbox-field"><input name="delivery_enabled" type="checkbox" defaultChecked={s.delivery_enabled} />Allow delivery requests</label><label className="field">Delivery service area<textarea name="service_area" defaultValue={s.service_area} maxLength={500} placeholder="List the cities or ZIP/postal codes you serve. Staff will verify each address." /></label>
    <h2>Who receives new requests?</h2><label className="field">Owner / manager email addresses *<textarea name="recipients" defaultValue={recipients.join("\n")} required placeholder="owner@gmail.com" /><small>One per line or comma-separated. Up to 10. These addresses are private and not shown to customers.</small></label>
    <h2>Automatic WhatsApp alerts</h2>
    <label className="checkbox-field"><input name="whatsapp_enabled" type="checkbox" defaultChecked={whatsapp.enabled} /><span>Also send an approved WhatsApp template to the manager/owner for each new enquiry.</span></label>
    <label className="field">Manager WhatsApp recipients<textarea name="whatsapp_recipients" defaultValue={whatsapp.recipients.join("\n")} placeholder="+12125551234" /><small>Private recipient numbers, one per line, including country codes. Use recipient numbers different from the business API sender number.</small></label>
    <label className="checkbox-field"><input name="whatsapp_consent" type="checkbox" defaultChecked={whatsapp.consent} /><span>I confirm every listed recipient opted in to receiving operational catering notifications on WhatsApp. The account and time of this confirmation will be recorded.</span></label>
    <p className="small-note">WhatsApp sends a concise event summary and a secure staff link to all requested menu/contact details. Email contains the full request. The public restaurant WhatsApp number above is for manual customer contact.</p>
    <h2>Privacy notice</h2><label className="field">Your published privacy notice *<textarea name="privacy_notice" defaultValue={s.privacy_notice} required minLength={50} maxLength={10000} style={{ minHeight: 180 }} placeholder="Explain who controls the data, what you collect, your enquiry purpose, Supabase/email providers, retention, customer rights and a contact for deletion requests. Have the policy reviewed for your location." /><small>This text is saved with each request as evidence of the notice acknowledged at submission.</small></label>
    <label className="checkbox-field"><input name="accepting_requests" type="checkbox" defaultChecked={s.accepting_requests} disabled={blockers.length > 0} /><span>Open online catering requests. I have reviewed the business details, configured email delivery and scheduled the notification worker.</span></label>{success && <p className="success" role="status">{success}</p>}{error && <p className="error" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy ? "Saving..." : "Save business settings"}</button></fieldset></form>;
}
