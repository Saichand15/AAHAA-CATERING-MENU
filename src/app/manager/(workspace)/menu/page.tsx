import Link from "next/link";
import { staffSession } from "@/lib/auth";
import { money } from "@/lib/validation";
export default async function Menu() {
  const { db } = await staffSession();
  const [menu, settings] = await Promise.all([db.from("menu_items").select("*").order("sort_order").order("name"), db.from("business_settings").select("currency").eq("id", true).single()]);
  if (menu.error || settings.error) throw menu.error || settings.error;
  return <><div className="staff-title"><div><span className="eyebrow">FROM YOUR KITCHEN</span><h1>Menu &amp; packages</h1><p>Only published items appear on the customer website.</p></div><Link href="/manager/menu/new" className="button">Add menu item</Link></div><div className="table-wrap">{menu.data.length ? <table><thead><tr><th>Item</th><th>Category</th><th>Price</th><th>Visibility</th><th>Availability</th></tr></thead><tbody>{menu.data.map(item => <tr key={item.id}><td><Link className="text-link" href={`/manager/menu/${item.id}`}>{item.name}</Link><small>{item.kind}</small></td><td>{item.category}</td><td>{item.price_minor === null ? "On request" : money(item.price_minor, settings.data.currency)}<small>per {item.unit}</small></td><td>{item.published ? "Published" : "Draft"}</td><td>{item.available ? "Available" : "Unavailable"}</td></tr>)}</tbody></table> : <div className="staff-empty"><h3>Your menu, not a sample menu.</h3><p>Add your real dishes, packages and prices to get started. Configure your business currency first.</p></div>}</div></>;
}
