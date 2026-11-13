import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { staffSession } from "@/lib/auth";
import { money } from "@/lib/validation";
import { AddNote, StatusControl } from "@/components/staff-controls";
import { ItemSummary } from "@/components/storefront";
import { NotificationList } from "@/components/notification-list";

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { db } = await staffSession();
  const [request, notes, jobs, history] = await Promise.all([
    db.from("catering_requests").select("*").eq("id", id).maybeSingle(),
    db.from("request_notes").select("*").eq("request_id", id).order("created_at", { ascending: false }),
    db.from("notification_jobs").select("*").eq("request_id", id).order("created_at"),
    db.from("request_history").select("*").eq("request_id", id).order("created_at", { ascending: false }),
  ]);
  for (const response of [request, notes, jobs, history]) if (response.error) throw response.error;
  const r = request.data;
  if (!r) notFound();
  return <>
    <Link className="text-link" href="/manager/requests">Back to requests</Link>
    <div className="staff-title" style={{ marginTop: 25 }}>
      <div><span className="eyebrow">CATERING REQUEST</span><h1>{r.reference}</h1><p>Received {new Date(r.created_at).toLocaleString("en", { timeZone: r.timezone })} ({r.timezone})</p></div>
      <span className={`status ${r.status}`}>{r.status}</span>
    </div>
    <div className="staff-detail">
      <div className="stack">
        <section className="panel"><h2>The event</h2>
          <dl className="detail-grid">
            <div><dt>Customer</dt><dd>{r.customer_name}</dd></div>
            <div><dt>Submission</dt><dd>{r.customer_id ? "Verified customer account" : "Guest enquiry"}</dd></div>
            <div><dt>Preferred contact</dt><dd>{r.preferred_contact}</dd></div>
            <div><dt>Email</dt><dd><a className="text-link" href={`mailto:${r.email}?subject=${encodeURIComponent(`Your catering request ${r.reference}`)}`}>{r.email}</a></dd></div>
            <div><dt>Phone</dt><dd><a className="text-link" href={`tel:${r.phone}`}>{r.phone}</a></dd></div>
            <div><dt>Occasion</dt><dd>{r.event_type}</dd></div>
            <div><dt>Guests</dt><dd>{r.guests}</dd></div>
            <div><dt>Event time ({r.timezone})</dt><dd>{r.event_date} at {r.event_time.slice(0, 5)}</dd></div>
            <div><dt>Service</dt><dd>{r.fulfillment}</dd></div>
            {r.address && <div><dt>Delivery address</dt><dd>{r.address}</dd></div>}
            <div><dt>WhatsApp contact consent</dt><dd>{r.whatsapp_consent ? "Yes, for this enquiry" : "Not given"}</dd></div>
          </dl>
          {r.whatsapp_consent && <a className="text-link" href={`https://wa.me/${r.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${r.customer_name}, regarding catering request ${r.reference}: `)}`} target="_blank" rel="noreferrer">Open customer WhatsApp (send manually)</a>}
        </section>
        <section className="panel"><h2>Requested menu</h2>
          <ItemSummary items={r.items} currency={r.currency} />
          <div className="subtotal"><span>{r.has_unpriced_items ? "Known subtotal (some items need pricing)" : "Menu estimate"}</span><strong>{money(r.known_subtotal_minor, r.currency)}</strong></div>
          <p className="small-note">Not a final quote. Taxes, delivery and additional services need staff confirmation.</p>
        </section>
        <section className="panel"><h2>Special requirements</h2>
          <h3>Dietary &amp; allergy requests</h3><p className="preserve-lines" style={{ margin: "12px 0 22px" }}>{r.allergies || "None specified by the customer."}</p>
          <h3>Event notes</h3><p className="preserve-lines" style={{ marginTop: 12 }}>{r.notes || "No additional instructions."}</p>
        </section>
      </div>
      <div className="stack">
        <section className="panel"><h2>Follow-up</h2>
          <StatusControl key={r.version} id={r.id} version={r.version} status={r.status} />
          <p className="small-note" style={{ marginTop: 12 }}>These statuses track your follow-up, not a confirmed catering order.</p>
          {history.data?.map(h => <div className="note" key={h.id}>Status changed to {h.status}<small>{new Date(h.created_at).toLocaleString("en", { timeZone: r.timezone })}</small></div>)}
        </section>
        <NotificationList jobs={jobs.data ?? []} />
        <section className="panel"><h2>Team notes</h2><AddNote id={id} />
          {notes.data?.map(note => <div className="note" key={note.id}>{note.body}<small>{new Date(note.created_at).toLocaleString("en", { timeZone: r.timezone })}</small></div>)}
        </section>
      </div>
    </div>
  </>;
}
