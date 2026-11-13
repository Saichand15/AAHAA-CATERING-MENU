import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { staffSession } from "@/lib/auth";
import { MenuEditor } from "@/components/menu-editor";
export default async function EditItem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await staffSession();
  if (id !== "new" && !z.uuid().safeParse(id).success) notFound();
  const settings = await db.from("business_settings").select("currency").eq("id", true).single();
  if (settings.error) throw settings.error;
  const result = id === "new" ? null : await db.from("menu_items").select("*").eq("id", id).maybeSingle();
  if (result?.error) throw result.error;
  if (result && !result.data) notFound();
  return <><Link className="text-link" href="/manager/menu">Back to menu</Link><div className="staff-title" style={{ marginTop: 25 }}><div><h1>{result ? "Edit menu item" : "Add something delicious"}</h1><p>Prices are in {settings.data.currency}. Customization extras are charged per unit.</p></div></div><MenuEditor item={result?.data ?? null} currency={settings.data.currency} /></>;
}
