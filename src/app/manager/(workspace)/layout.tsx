import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, Settings, UtensilsCrossed } from "lucide-react";
import { Brand } from "@/components/brand";
import { LogoutButton } from "@/components/staff-controls";
import { databaseConfigured } from "@/lib/config";
import { staffSession } from "@/lib/auth";
import { HttpError } from "@/lib/http";

export default async function Workspace({ children }: { children: React.ReactNode }) {
  if (!databaseConfigured()) redirect("/manager/login");
  const session = await staffSession().catch(error => {
    if (error instanceof HttpError && (error.status === 401 || error.status === 403)) redirect("/manager/login");
    throw error;
  });
  return <div className="staff-shell"><aside className="staff-sidebar"><Brand /><nav aria-label="Staff navigation"><Link href="/manager/requests"><ClipboardList size={17} /> Catering requests</Link><Link href="/manager/menu"><UtensilsCrossed size={17} /> Menu &amp; packages</Link>{session.role === "owner" && <Link href="/manager/settings"><Settings size={17} /> Business settings</Link>}</nav><div className="sidebar-bottom"><span>{session.user.email}</span><LogoutButton /><Link href="/">View customer website</Link></div></aside><main className="staff-main"><div className="staff-topbar"><span>AAHAA / RESTAURANT WORKSPACE</span><span>{session.role === "owner" ? "Owner access" : "Manager access"}</span></div>{children}</main></div>;
}
