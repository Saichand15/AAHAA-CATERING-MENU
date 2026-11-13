import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildMenu, buildMigration, extractSections } from "../scripts/reference-menu";
import { menuSchema, priceCart } from "../src/lib/validation";

const snapshot = JSON.parse(readFileSync(resolve("supabase", "reference-menu.json"), "utf8"));
const migration = readFileSync(resolve("supabase", "migrations", "202611130005_reference_menu.sql"), "utf8");
const menu = buildMenu(snapshot.sections);

describe("owner-authorized temporary general menu", () => {
  it("imports every real source item and validates the application's catalog contract", () => {
    expect(menu).toHaveLength(210);
    expect(new Set(menu.map(item => item.id)).size).toBe(210);
    expect(new Set(menu.map(item => item.category)).size).toBe(19);
    for (const item of menu) {
      expect(menuSchema.safeParse(item).success, item.name).toBe(true);
      expect(item.price_minor).toBeNull();
      expect(item.unit).toBe("regular-menu serving");
      expect(item.description).toContain("not a catering quote");
      expect(item.allergens).toEqual([]);
      expect(item.published).toBe(true);
    }
    expect(buildMigration(snapshot)).toBe(migration);
  });
  it("requires real variations without presenting any catering selection as free", () => {
    const variants = menu.filter(item => item.options.length);
    expect(variants).toHaveLength(19);
    for (const item of variants) {
      const line = { line_id: crypto.randomUUID(), item_id: item.id, quantity: 25, selections: {}, notes: "" };
      expect(() => priceCart([line], menu)).toThrow(/Choose 1/);
      for (const choice of item.options[0].choices) {
        const priced = priceCart([{ ...line, selections: { variant: [choice.id] } }], menu);
        expect(priced.hasUnpriced).toBe(true);
        expect(priced.items[0].total_minor).toBeNull();
        expect(priced.items[0].selections[0].choices[0].label).toBe(choice.label);
      }
    }
    expect(menu.find(item => item.name === "Hot & Sour Soup Veg/Chicken")?.dietary).toEqual([]);
    expect(menu.find(item => item.name === "Cream of Mushroom Soup")?.dietary).toEqual(["Vegetarian"]);
  });
  it("rejects executable source expressions, duplicate dishes and unreviewed variants", () => {
    expect(() => extractSections("const DEFAULT_MENU = fetch('https://example.com');")).toThrow(/executable/);
    expect(() => extractSections("const unrelated = [];")).toThrow(/DEFAULT_MENU/);
    const section = { name: "Soups", items: [{ name: "New A/B", desc: "", price: "$1.00 | $2.00", spice: "", veg: false }] };
    expect(() => buildMenu([section])).toThrow(/Review source variations/);
    expect(() => buildMenu([snapshot.sections[0], snapshot.sections[0]])).toThrow(/Duplicate/);
  });
  it("keeps stable IDs even when source pages are reordered", () => {
    const reordered = buildMenu([...snapshot.sections].reverse());
    expect(reordered.map(item => item.id).sort()).toEqual(menu.map(item => item.id).sort());
  });
  it("executes against PostgreSQL and preserves edits, unpublished dishes and unrelated menu data", async () => {
    const db = new PGlite();
    try {
      const initial = readFileSync(resolve("supabase", "migrations", "202611130001_initial.sql"), "utf8");
      const table = initial.slice(initial.indexOf("create table public.menu_items"), initial.indexOf("create sequence public.catering_reference_seq"));
      await db.exec(table);
      await db.exec(migration);
      expect((await db.query<{ count: number }>("select count(*)::int count from menu_items")).rows[0].count).toBe(210);
      await db.query("update menu_items set name='Manager revised dish',published=false,price_minor=1234 where id=$1", [menu[0].id]);
      await db.exec("insert into menu_items(name,category) values('Separate catering package','Catering')");
      await db.exec(migration);
      const edited = (await db.query<{ name: string; published: boolean; price_minor: number }>("select name,published,price_minor from menu_items where id=$1", [menu[0].id])).rows[0];
      expect(edited.name).toBe("Manager revised dish");
      expect(edited.published).toBe(false);
      expect(Number(edited.price_minor)).toBe(1234);
      expect((await db.query<{ count: number }>("select count(*)::int count from menu_items")).rows[0].count).toBe(211);
    } finally { await db.close(); }
  }, 30_000);
});
