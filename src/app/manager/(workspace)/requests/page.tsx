import Link from "next/link";
import { staffSession } from "@/lib/auth";
import { AutoRefresh } from "@/components/auto-refresh";

export default async function Requests({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { db } = await staffSession();
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.slice(0, 120) : "";
  const status = typeof params.status === "string" ? params.status : "";
  const date = typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : "";
  const page = Math.max(1, Math.min(10000, Number(params.page) || 1));
  let query = db.from("catering_requests").select("id,reference,customer_name,email,phone,event_date,event_time,guests,fulfillment,status,created_at", { count: "exact" }).order("created_at", { ascending: false });
  if (search) {
    const safe = search.replace(/[^a-zA-Z0-9@+ ._-]/g, "").replace(/[%_]/g, "");
    if (safe) query = query.or(`reference.ilike.%${safe}%,customer_name.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }
  if (status === "new" || status === "contacted" || status === "closed") query = query.eq("status", status);
  if (date) query = query.eq("event_date", date);
  const [result, fresh, contacted, failed] = await Promise.all([
    query.range((page - 1) * 25, page * 25 - 1),
    db.from("catering_requests").select("*", { count: "exact", head: true }).eq("status", "new"),
    db.from("catering_requests").select("*", { count: "exact", head: true }).eq("status", "contacted"),
    db.from("notification_jobs").select("*", { count: "exact", head: true }).eq("status", "failed"),
  ]);
  for (const response of [result, fresh, contacted, failed]) if (response.error) throw response.error;
  function pageLink(next: number) { return `/manager/requests?${new URLSearchParams({ q: search, status, date, page: String(next) })}`; }
  return <><div className="staff-title"><div><span className="eyebrow">EVERY GATHERING STARTS HERE</span><h1>Catering requests</h1><p>Your customers&apos; menus, event details and special requests, all in one place.</p><AutoRefresh /></div></div><div className="stat-grid"><div className="stat"><span>New requests</span><strong>{fresh.count}</strong></div><div className="stat"><span>Follow-ups in progress</span><strong>{contacted.count}</strong></div><div className="stat"><span>Failed notifications</span><strong>{failed.count}</strong></div></div>
    <form className="staff-filters"><label className="field">Search<input name="q" defaultValue={search} placeholder="Reference, name or phone" maxLength={120} /></label><label className="field">Status<select name="status" defaultValue={status}><option value="">All statuses</option><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select></label><label className="field">Event date<input type="date" name="date" defaultValue={date} /></label><button className="button">Filter</button><Link className="text-link" href="/manager/requests">Clear</Link></form>
    <div className="table-wrap">{result.data?.length ? <table><thead><tr><th>Request</th><th>Customer</th><th>Event</th><th>Guests</th><th>Service</th><th>Status</th></tr></thead><tbody>{result.data.map(r => <tr key={r.id}><td><Link className="text-link" href={`/manager/requests/${r.id}`}>{r.reference}</Link><small>{r.created_at.slice(0, 10)}</small></td><td>{r.customer_name}<small>{r.phone}</small></td><td>{r.event_date}<small>{r.event_time.slice(0, 5)}</small></td><td>{r.guests}</td><td>{r.fulfillment}</td><td><span className={`status ${r.status}`}>{r.status}</span></td></tr>)}</tbody></table> : <div className="staff-empty"><h3>{search || status || date ? "No matching requests" : "Your next gathering starts here."}</h3><p>{search || status || date ? "Try changing your filters." : "Customer requests will appear here as soon as they are submitted. No sample requests have been added."}</p></div>}</div><div className="page-navigation"><span>{result.count ?? 0} request(s)</span><div className="inline-actions">{page > 1 && <Link href={pageLink(page - 1)}>Previous</Link>}{page * 25 < (result.count ?? 0) && <Link href={pageLink(page + 1)}>Next</Link>}</div></div>
  </>;
}
