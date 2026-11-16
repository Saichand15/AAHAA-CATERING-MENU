import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import pricing from "../supabase/catering-pricing.json";
import { buildCateringMenu, buildCateringMigration } from "../scripts/catering-menu";
import { estimateLabel, menuSchema, priceCart, requestSchema } from "../src/lib/validation";
import { input } from "./fixtures";

const menu = buildCateringMenu(pricing);
const migration = readFileSync(resolve("supabase", "migrations", "202611160001_catering_packages.sql"), "utf8");

describe("restaurant-supplied catering pricing", () => {
  it("preserves the original document and all 21 exact package prices", () => {
    expect(createHash("sha256").update(readFileSync(resolve("public", "catering-pricing.pdf"))).digest("hex")).toBe(pricing.sourceSha256);
    // Columns on PDF pages 1, 3 and 5, read in party-size order.
    const expected = [
      [320, 380, 600, 750, 900, 1000, 1150],
      [340, 420, 640, 800, 950, 1150, 1300],
      [380, 480, 700, 865, 1050, 1250, 1400],
    ];
    expect(menu).toHaveLength(21);
    expect(new Set(menu.map(item => item.id)).size).toBe(21);
    pricing.packages.forEach((pack, index) => {
      expect(menu.filter(item => item.category === pack.name).map(item => item.price_minor)).toEqual(expected[index].map(price => price * 100));
    });
    for (const item of menu) {
      expect(menuSchema.safeParse(item).success, `${item.name}: ${item.description.length} characters`).toBe(true);
      expect(item.unit).toMatch(/^package for /);
      expect(item.menu_type).toBe("catering");
      expect(item.description).toContain("Paneer: one entree only");
    }
    expect(buildCateringMigration(pricing)).toBe(migration);
  });

  it("preserves verified portions and does not invent the missing Special entree portion", () => {
    expect(menu[0].description).toContain("Jumbo / 57 oz each");
    expect(menu[0].description).toContain("10 naan cut into 4");
    expect(menu[6].description).toContain("Full / 343 oz + medium / 228 oz");
    expect(menu[6].description).toContain("40 parotta/chapathi cut into 2");
    expect(menu.filter(item => item.category === "Aahaa Special Package").every(item => item.description.includes("third entree portion requires manager clarification"))).toBe(true);
    expect(menu.find(item => item.name === "Aahaa Special Package - 55-60 guests")?.description).toContain("1 full tray (ounces not specified)");
  });

  it("prices packages on the server and snapshots inclusions and selected choices", () => {
    const item = menu[0];
    const selections = Object.fromEntries(item.options.map(group => [group.id, [group.choices[0].id]]));
    const line = { line_id: "8a6ce286-e474-4b85-a9d2-8124ea428843", item_id: item.id, quantity: 2, selections, notes: "Paneer and dal preferred" };
    const priced = priceCart([line], menu);
    expect(priced.knownSubtotal).toBe(64000);
    expect(priced.hasUnpriced).toBe(false);
    expect(priced.items[0].description).toBe(item.description);
    expect(priced.items[0].selections[0].choices[0].label).toBe("Veg Biryani");
    expect(() => priceCart([{ ...line, selections: {} }], menu)).toThrow(/Choose 1/);
    expect(() => priceCart([{ ...line, selections: { ...selections, bread: ["invalid"] } }], menu)).toThrow(/no longer available/);
  });

  it("separates restaurant dishes, imports idempotently and preserves manager changes", async () => {
    const db = new PGlite();
    try {
      const initial = readFileSync(resolve("supabase", "migrations", "202611130001_initial.sql"), "utf8");
      await db.exec(initial.slice(initial.indexOf("create table public.menu_items"), initial.indexOf("create sequence public.catering_reference_seq")));
      await db.exec("insert into menu_items(name,category) values('Restaurant dish','Soup')");
      await db.exec(migration);
      expect((await db.query("select id from menu_items where published and menu_type='catering'")).rows).toHaveLength(21);
      expect((await db.query("select id from menu_items where menu_type='regular'")).rows).toHaveLength(1);
      await db.query("update menu_items set price_minor=32100,published=false where id=$1", [menu[0].id]);
      await db.exec(migration);
      const edited = (await db.query<{ price_minor: number; published: boolean }>("select price_minor,published from menu_items where id=$1", [menu[0].id])).rows[0];
      expect(Number(edited.price_minor)).toBe(32100);
      expect(edited.published).toBe(false);
      expect((await db.query("select id from menu_items")).rows).toHaveLength(22);
    } finally { await db.close(); }
  }, 30000);
  it("retains substitutions through input validation and flags unchanged base prices for manager quoting", () => {
    const item = menu[0];
    const line = { line_id: crypto.randomUUID(), item_id: item.id, quantity: 2, selections: Object.fromEntries(item.options.map(g => [g.id, [g.choices[0].id]])), notes: "", substitution_request: "Replace rice with a preferred dish" };
    const parsed = requestSchema.parse({ ...input, items: [line] });
    const priced = priceCart(parsed.items, menu);
    expect(priced.items[0].substitution_request).toBe(line.substitution_request);
    expect(priced.knownSubtotal).toBe(64000);
    expect(priced.hasUnpriced).toBe(true);
    expect(estimateLabel(priced.items, priced.hasUnpriced)).toContain("Base estimate");
    const unchanged = priceCart([{ ...line, substitution_request: "" }], menu);
    expect(unchanged.hasUnpriced).toBe(false);
    expect(unchanged.items[0].substitution_request).toBeUndefined();
    expect(() => priceCart([{ ...line, substitution_request: "x".repeat(501) }], menu)).toThrow(/500/);
    expect(() => priceCart([line], [{ ...item, kind: "item" }])).toThrow(/catering package/);
  });
});
