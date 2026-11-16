import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import { menuSchema, priceCart } from "../src/lib/validation";
import { buildEmail } from "../src/lib/email";
import type { MenuItem } from "../src/lib/types";
import { customMenu, item, line, savedRequest, settings } from "./fixtures";

it("requires a real dish, validates choices server-side and never invents a custom catering price", () => {
  const customLine = { ...line, item_id: customMenu.id, quantity: 1, selections: {} };
  expect(() => priceCart([customLine], [customMenu])).toThrow("Choose at least one dish");
  const invalidSelections: Record<string, string[]>[] = [{ appetizers: ["gobi", "gobi"] }, { biryani: ["unknown"] }, { removed: ["gobi"] }, { biryani: ["veg", "veg"] }];
  for (const selections of invalidSelections) {
    expect(() => priceCart([{ ...customLine, selections }], [customMenu])).toThrow();
  }
  const result = priceCart([{ ...customLine, selections: { appetizers: ["gobi"], biryani: ["veg"] } }], [customMenu]);
  expect(result).toMatchObject({ knownSubtotal: 0, hasUnpriced: true, items: [{ total_minor: null, unit_price_minor: null }] });
  expect(result.items[0].selections).toEqual([
    { group: "Appetizers", choices: [{ label: "Gobi Manchurian", price_minor: 0 }] },
    { group: "Biryani", choices: [{ label: "Veg Biryani", price_minor: 0 }] },
  ]);
  const email = buildEmail({ ...savedRequest, items: result.items, has_unpriced_items: true, known_subtotal_minor: 0 }, settings, "staff@example.com", "staff", "https://catering.example", "notify@example.com");
  for (const text of [email.html, email.text]) {
    for (const value of ["Build your own catering menu", "Appetizers", "Gobi Manchurian", "Biryani", "Veg Biryani", "Price on request"]) expect(text).toContain(value);
  }
  expect(priceCart([{ ...customLine, selections: { biryani: ["veg"] } }, line], [customMenu, item])).toMatchObject({ knownSubtotal: 2750, hasUnpriced: true });
  expect(() => priceCart([{ ...customLine, selections: { biryani: ["veg"] } }], [{ ...customMenu, published: false }])).toThrow("no longer available");
});

it("supports manager edits without changing old snapshots and rejects invalid builder configuration", () => {
  expect(menuSchema.safeParse(customMenu).success).toBe(true);
  for (const patch of [{ menu_type: "regular" }, { kind: "item" }, { options: [] }]) expect(menuSchema.safeParse({ ...customMenu, ...patch }).success).toBe(false);
  const cart = [{ ...line, item_id: customMenu.id, quantity: 1, selections: { biryani: ["veg"] } }];
  const saved = priceCart(cart, [customMenu]);
  const updated = { ...customMenu, price_minor: 10000, options: customMenu.options.map(group => ({ ...group, choices: group.choices.map(choice => ({ ...choice, label: `${choice.label} updated`, price_minor: 500 })) })) };
  expect(priceCart(cart, [updated]).items[0]).toMatchObject({ unit_price_minor: 10500, total_minor: 10500 });
  expect(saved.items[0].selections[1].choices[0].label).toBe("Veg Biryani");
  expect(saved.items[0].total_minor).toBeNull();
});

it("migrates a real editable starter menu without changing existing priced packages", async () => {
  const db = new PGlite();
  try {
    const initial = readFileSync(resolve("supabase", "migrations", "202611130001_initial.sql"), "utf8");
    await db.exec(initial.slice(initial.indexOf("create table public.menu_items"), initial.indexOf("create sequence public.catering_reference_seq")));
    await db.exec("alter table menu_items add column menu_type text not null default 'catering';");
    await db.query("insert into menu_items(id,name,category,kind,price_minor,published) values($1,'Existing package','Veg','package',32000,true)", [item.id]);
    await db.exec(readFileSync(resolve("supabase", "migrations", "202611160004_custom_catering_menu.sql"), "utf8"));
    const options = [{ id: "bread", name: "Bread", min: 1, max: 1, choices: [{ id: "naan", label: "Naan", price_minor: 0 }] }];
    await db.query("update menu_items set options=$1::jsonb where id=$2", [JSON.stringify(options), item.id]);
    const packageChoices = readFileSync(resolve("supabase", "migrations", "202611160005_package_customized_choices.sql"), "utf8");
    await db.exec(packageChoices);
    await db.exec(packageChoices);
    const updatedPackage = (await db.query<MenuItem>("select * from menu_items where id=$1", [item.id])).rows[0];
    expect(updatedPackage.options[0].choices).toEqual([...options[0].choices, { id: "customized", label: "Customized - manager review", price_minor: 0, requires_quote: true }]);
    const reviewed = priceCart([{ ...line, quantity: 1, selections: { bread: ["customized"] } }], [updatedPackage]);
    expect(reviewed.knownSubtotal).toBe(32000);
    expect(reviewed.hasUnpriced).toBe(true);
    expect(reviewed.items[0].substitution_request).toContain("Manager review and revised quote required");
    expect(reviewed.items[0].selections[0].choices[0].label).toBe("Customized - manager review");
    expect(priceCart([{ ...line, quantity: 1, selections: { bread: ["naan"] } }], [updatedPackage]).hasUnpriced).toBe(false);
    const result = await db.query<MenuItem>("select * from menu_items where is_custom_menu");
    expect(result.rows).toHaveLength(1);
    const builder = result.rows[0];
    expect(menuSchema.safeParse(builder).success).toBe(true);
    expect(builder.options.map(group => group.name)).toEqual(["Appetizers", "Entrees / Curries", "Biryani", "Bread", "Desserts"]);
    expect(builder.options.every(group => !group.choices.some(choice => choice.id === "customized"))).toBe(true);
    expect(builder.price_minor).toBeNull();
    expect(builder.published).toBe(true);
    expect((await db.query("select price_minor,is_custom_menu from menu_items where id=$1", [item.id])).rows[0]).toEqual({ price_minor: 32000, is_custom_menu: false });
    expect(() => priceCart([{ ...line, quantity: 1, item_id: builder.id, selections: {} }], [builder])).toThrow("Choose at least one dish");
    await expect(db.query("update menu_items set menu_type='regular' where id=$1", [builder.id])).rejects.toThrow("custom_menu_catering_package");
  } finally { await db.close(); }
}, 30000);
