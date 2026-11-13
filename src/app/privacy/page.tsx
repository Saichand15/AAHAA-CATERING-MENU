import Link from "next/link";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export default async function Privacy() {
  const { settings } = await getCatalog();
  return <main className="wrap narrow prose"><Link className="text-link" href="/">Back to the menu</Link><span className="eyebrow">YOUR INFORMATION</span><h1>Privacy notice</h1>{settings?.privacy_notice ? <p className="preserve-lines">{settings.privacy_notice}</p> : <div className="notice">The restaurant&apos;s privacy notice has not been configured. Online requests are not available until setup is complete.</div>}{settings?.email && <p>Privacy questions: <a className="text-link" href={`mailto:${settings.email}`}>{settings.email}</a></p>}</main>;
}
