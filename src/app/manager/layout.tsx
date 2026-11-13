import type { Metadata } from "next";
export const metadata: Metadata = { title: "Staff workspace | AAHAA", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function ManagerLayout({ children }: { children: React.ReactNode }) { return children; }
