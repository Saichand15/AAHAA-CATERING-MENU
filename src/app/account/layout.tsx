import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { CustomerLogout } from "@/components/customer-auth";
import { customerSession } from "@/lib/customer";
import { HttpError } from "@/lib/http";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My catering account | Aahaa", robots: { index: false, follow: false } };
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await customerSession().catch(error => { if (error instanceof HttpError && error.status === 401) redirect("/login"); throw error; });
  return <><header className="site-header wrap"><Brand /><div className="inline-actions"><Link href="/#menu" className="button button-small">New catering enquiry</Link><CustomerLogout /></div></header><main className="wrap account-main"><div className="account-email">{session.user.email}</div>{children}</main></>;
}
