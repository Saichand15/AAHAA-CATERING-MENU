import Link from "next/link";
import { customerSession } from "@/lib/customer";
import { CustomerProfileForm } from "@/components/customer-auth";
export default async function Account({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { db, user } = await customerSession();
  const { page: input } = await searchParams;
  const page = Math.max(1, Math.min(10000, Math.floor(Number(input) || 1)));
  const [profile, requests] = await Promise.all([
    db.from("customer_profiles").select("full_name,phone").eq("id", user.id).maybeSingle(),
    db.from("catering_requests").select("id,reference,event_date,event_time,guests,fulfillment,status,created_at", { count: "exact" }).eq("customer_id", user.id).order("created_at", { ascending: false }).range((page - 1) * 20, page * 20 - 1),
  ]);
  if (profile.error || requests.error) throw profile.error || requests.error;
  return <><div className="staff-title"><div><span className="eyebrow">YOUR CATERING ENQUIRIES</span><h1>My requests</h1><p>Follow-up status is not food-order confirmation. The catering team will contact you directly.</p></div></div><div className="staff-detail"><section className="panel"><h2>Request history</h2>{requests.data.length ? <div className="summary-items">{requests.data.map(r => <div key={r.id}><div><Link className="text-link" href={`/account/requests/${r.id}`}>{r.reference}</Link><small>{r.event_date} at {r.event_time.slice(0, 5)} &middot; {r.guests} guests &middot; {r.fulfillment}</small></div><span className={`status ${r.status}`}>{r.status}</span></div>)}</div> : <div className="staff-empty"><h3>No enquiries yet.</h3><p>Requests you submit while signed in will appear here. Guest enquiries are not automatically linked to an account.</p><Link href="/#menu" className="button" style={{ marginTop: 20 }}>Explore catering menu</Link></div>}<div className="page-navigation"><span>{requests.count ?? 0} request(s)</span><div className="inline-actions">{page > 1 && <Link href={`/account?page=${page - 1}`}>Previous</Link>}{page * 20 < (requests.count ?? 0) && <Link href={`/account?page=${page + 1}`}>Next</Link>}</div></div></section><section className="panel"><h2>Contact details</h2><CustomerProfileForm fullName={profile.data?.full_name ?? ""} phone={profile.data?.phone ?? ""} /><Link className="text-link" href="/account/password" style={{ display: "inline-block", marginTop: 20 }}>Change password</Link></section></div></>;
}
