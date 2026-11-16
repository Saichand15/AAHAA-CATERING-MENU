import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { customerSession } from "@/lib/customer";
import { ItemSummary } from "@/components/storefront";
import { estimateLabel, money } from "@/lib/validation";
import { eventSchedule } from "@/lib/request-display";
export default async function CustomerRequest({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { db, user } = await customerSession();
  const { data: r, error } = await db.from("catering_requests").select("id,reference,created_at,customer_name,email,phone,event_type,event_date,event_time,timezone,guests,fulfillment,address,notes,allergies,items,currency,known_subtotal_minor,has_unpriced_items,status").eq("id", id).eq("customer_id", user.id).maybeSingle();
  if (error) throw error;
  if (!r) notFound();
  return <><Link href="/account" className="text-link">Back to my requests</Link><section className="panel" style={{ marginTop: 25 }}><span className="eyebrow">CATERING ENQUIRY</span><h1 style={{ fontSize: 32 }}>{r.reference}</h1><p style={{ marginTop: 15 }}>This is an enquiry, not a confirmed food order.</p><dl className="detail-grid"><div><dt>Occasion</dt><dd>{r.event_type || "Not provided"}</dd></div><div><dt>Event</dt><dd>{eventSchedule(r.event_date, r.event_time, r.timezone)}</dd></div><div><dt>Guests</dt><dd>{r.guests ?? "Not provided"}</dd></div><div><dt>Service</dt><dd>{r.fulfillment || "Not provided"}</dd></div><div><dt>Contact</dt><dd>{r.customer_name}<br />{r.email || "Email not provided"}<br />{r.phone}</dd></div>{r.address && <div><dt>Delivery address</dt><dd>{r.address}</dd></div>}<div><dt>Team follow-up</dt><dd><span className={`status ${r.status}`}>{r.status}</span></dd></div></dl><ItemSummary items={r.items} currency={r.currency} /><p><strong>{  estimateLabel(r.items, r.has_unpriced_items)}: {money(r.known_subtotal_minor, r.currency)}</strong></p><p className="small-note">Final pricing, taxes, delivery and availability require manager confirmation.</p>{r.allergies && <p className="preserve-lines" style={{ marginTop: 20 }}><strong>Dietary/allergy requests:</strong> {r.allergies}</p>}{r.notes && <p className="preserve-lines" style={{ marginTop: 20 }}><strong>Event notes:</strong> {r.notes}</p>}</section></>;
}
