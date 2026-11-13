"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { MenuItem } from "@/lib/types";
import { menuSchema, minorFromDecimal } from "@/lib/validation";
import { sendJson } from "./staff-controls";

type EditableGroup = { id: string; name: string; min: number; max: number; choices: { id: string; label: string; price: string }[] };
export function MenuEditor({ item, currency }: { item: MenuItem | null; currency: string }) {
  const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const decimal = (minor: number) => (minor / 10 ** digits).toFixed(digits);
  const [groups, setGroups] = useState<EditableGroup[]>((item?.options ?? []).map(g => ({ ...g, choices: g.choices.map(c => ({ id: c.id, label: c.label, price: decimal(c.price_minor) })) })));
  const [image, setImage] = useState(item?.image_url ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  function editGroup(index: number, patch: Partial<EditableGroup>) { setGroups(groups.map((g, i) => i === index ? { ...g, ...patch } : g)); }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setBusy(true);
    const values = new FormData(e.currentTarget);
    const string = (name: string) => String(values.get(name) ?? "").trim();
    const list = (name: string) => string(name).split(",").map(s => s.trim()).filter(Boolean);
    try {
      const body = menuSchema.parse({
        name: string("name"), description: string("description"), category: string("category"), kind: string("kind"),
        price_minor: minorFromDecimal(string("price"), currency), unit: string("unit"),
        minimum_quantity: Number(string("minimum_quantity")), quantity_step: Number(string("quantity_step")),
        dietary: list("dietary"), allergens: list("allergens"), image_url: image || null,
        options: groups.map(g => ({ ...g, choices: g.choices.map(c => ({ id: c.id, label: c.label, price_minor: minorFromDecimal(c.price, currency) ?? 0 })) })),
        available: values.has("available"), published: values.has("published"), sort_order: Number(string("sort_order")),
      });
      await sendJson("/api/staff/menu", { id: item?.id, item: body });
      router.push("/manager/menu"); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save the item."); }
    finally { setBusy(false); }
  }
  return <form className="panel editor" onSubmit={submit}><fieldset className="plain-fieldset" disabled={busy}><h2>The basics</h2><div className="form-grid"><label className="field">Item name *<input name="name" defaultValue={item?.name} required maxLength={120} /></label><label className="field">Category *<input name="category" defaultValue={item?.category} placeholder="e.g. Starters" required maxLength={80} /></label><label className="field">Type<select name="kind" defaultValue={item?.kind ?? "item"}><option value="item">Individual item</option><option value="package">Catering package</option></select></label><label className="field">Price ({currency})<input name="price" inputMode="decimal" defaultValue={item?.price_minor != null ? decimal(item.price_minor) : ""} placeholder="Leave blank for price on request" /><small>Tax/delivery excluded from the menu estimate.</small></label><label className="field">Unit *<input name="unit" defaultValue={item?.unit ?? "tray"} placeholder="tray, person, piece, package" required maxLength={50} /></label><label className="field">Minimum quantity<input type="number" name="minimum_quantity" min={1} max={10000} required defaultValue={item?.minimum_quantity ?? 1} /></label><label className="field">Quantity increment<input type="number" name="quantity_step" min={1} max={10000} required defaultValue={item?.quantity_step ?? 1} /></label><label className="field">Display order<input type="number" name="sort_order" min={0} max={10000} defaultValue={item?.sort_order ?? 0} required /></label></div><label className="field">Description<textarea name="description" defaultValue={item?.description} maxLength={1200} placeholder="Describe the dish, tray servings or what is included in the package." /></label><div className="form-grid"><label className="field">Dietary labels<input name="dietary" defaultValue={item?.dietary.join(", ")} placeholder="Vegetarian, Vegan" /><small>Comma-separated. Use only accurate labels.</small></label><label className="field">Known allergens<input name="allergens" defaultValue={item?.allergens.join(", ")} placeholder="Milk, Wheat, Peanuts" /><small>Comma-separated; do not imply allergen-free preparation.</small></label></div>
    <h2>Menu photograph</h2><label className="field">Upload a real image<input className="file-input" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={async e => {
      const file = e.target.files?.[0]; if (!file) return;
      if (file.size > 5 * 1024 * 1024) { setError("Images must be 5 MB or smaller."); return; }
      setUploading(true); setError("");
      try {
        const response = await fetch("/api/staff/images", { method: "POST", headers: { "Content-Type": file.type }, body: file });
        const data: { url?: string; error?: string } = await response.json();
        if (!response.ok || !data.url) throw new Error(data.error || "Upload failed.");
        setImage(data.url);
      } catch (error) { setError(error instanceof Error ? error.message : "Upload failed."); }
      finally { setUploading(false); }
    }} /><small>{uploading ? "Uploading..." : "JPEG, PNG or WebP. Up to 5 MB. Images are public."}</small></label>{image && <div className="inline-actions" style={{ marginBottom: 25 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="Current menu item" width={120} height={85} style={{ objectFit: "cover", borderRadius: 8 }} /><button type="button" className="text-link" onClick={() => setImage("")}>Remove image from item</button>
    </div>}
    <h2>Customization options</h2><p className="small-note" style={{ marginBottom: 20 }}>Use groups for spice levels, tray options, package selections or extras. Extra prices apply to every ordered unit.</p>
    {groups.map((group, index) => <section className="panel" key={group.id} style={{ marginBottom: 18, padding: 20 }}><div className="form-grid"><label className="field">Group name<input value={group.name} required maxLength={80} onChange={e => editGroup(index, { name: e.target.value })} placeholder="Choose your sides" /></label><div className="form-grid"><label className="field">Min choices<input type="number" min={0} max={20} value={group.min} onChange={e => editGroup(index, { min: Number(e.target.value) })} /></label><label className="field">Max choices<input type="number" min={1} max={20} value={group.max} onChange={e => editGroup(index, { max: Number(e.target.value) })} /></label></div></div>{group.choices.map((choice, ci) => <div className="inline-field" key={choice.id} style={{ marginBottom: 10 }}><label className="field" style={{ flex: 2 }}>Choice<input required value={choice.label} maxLength={80} onChange={e => editGroup(index, { choices: group.choices.map((c, i) => i === ci ? { ...c, label: e.target.value } : c) })} /></label><label className="field" style={{ flex: 1 }}>Extra ({currency})<input inputMode="decimal" value={choice.price} onChange={e => editGroup(index, { choices: group.choices.map((c, i) => i === ci ? { ...c, price: e.target.value } : c) })} /></label><button type="button" className="text-link" onClick={() => editGroup(index, { choices: group.choices.filter((_, i) => i !== ci) })}>Remove</button></div>)}<div className="inline-actions"><button type="button" className="button button-small button-outline" disabled={group.choices.length >= 20} onClick={() => editGroup(index, { choices: [...group.choices, { id: `c_${crypto.randomUUID().slice(0, 8)}`, label: "", price: "0" }] })}>Add choice</button><button type="button" className="text-link" onClick={() => setGroups(groups.filter((_, i) => i !== index))}>Remove group</button></div></section>)}
    <button type="button" className="button button-outline button-small" disabled={groups.length >= 10} onClick={() => setGroups([...groups, { id: `g_${crypto.randomUUID().slice(0, 8)}`, name: "", min: 0, max: 1, choices: [{ id: `c_${crypto.randomUUID().slice(0, 8)}`, label: "", price: "0" }] }])}>Add option group</button>
    <h2 style={{ marginTop: 30 }}>Publishing</h2><label className="checkbox-field"><input type="checkbox" name="available" defaultChecked={item?.available ?? true} />Available for requests</label><label className="checkbox-field"><input type="checkbox" name="published" defaultChecked={item?.published ?? false} />Publish on customer website</label><p className="small-note">Unpublish to remove an item from browsing. Historical requests keep their original menu details.</p>{error && <p className="error" role="alert">{error}</p>}<button className="button" disabled={busy || uploading}>{busy ? "Saving..." : "Save menu item"}</button></fieldset></form>;
}
