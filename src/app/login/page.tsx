import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { CustomerAuthForm } from "@/components/customer-auth";
import { customerAuthBlockers } from "@/lib/customer";
import { sessionDb } from "@/lib/supabase";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Customer login | Aahaa Catering", robots: { index: false, follow: false } };
export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  let enabled = customerAuthBlockers().length === 0;
  if (enabled) {
    const db = await sessionDb();
    const { data, error } = await db.rpc("customer_accounts_ready", {});
    if (error) console.error("Customer account schema unavailable", { code: error.code });
    enabled = !error && data === true;
  }
  return <main className="center-page"><div className="panel customer-login"><Brand /><span className="eyebrow" style={{ marginTop: 28 }}>YOUR CATERING ACCOUNT</span><h1>Welcome to Aahaa.</h1><p>Save your contact details and view enquiries submitted while signed in. Prefer not to register? Continue as a guest.</p><CustomerAuthForm enabled={enabled} initialError={params.error === "verification" ? "That email link could not be verified. It may have expired or already been used. Request a new link, or open it in the browser where you started." : ""} initialMessage={params.message === "password-updated" ? "Password updated. Sign in with your new password." : ""} /><Link href="/manager/login" className="text-link">Restaurant staff login</Link></div></main>;
}
