import Link from "next/link";
import { CustomerPasswordForm } from "@/components/customer-auth";
export default function Password() {
  return <section className="panel narrow"><span className="eyebrow">ACCOUNT SECURITY</span><h1 style={{ fontSize: 30, marginBottom: 20 }}>Set a new password</h1><p style={{ marginBottom: 22 }}>After updating your password, sign in again. Other sessions will lose refresh access; existing access tokens may remain valid until they expire.</p><CustomerPasswordForm /><Link className="text-link" href="/account" style={{ display: "inline-block", marginTop: 20 }}>Back to my account</Link></section>;
}
