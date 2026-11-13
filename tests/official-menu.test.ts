import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildMenu, buildMigration, extractOfficialMenu } from "../scripts/official-menu";
import { menuSchema } from "../src/lib/validation";

const snapshot = JSON.parse(readFileSync(resolve("supabase", "official-menu.json"), "utf8"));
const migration = readFileSync(resolve("supabase", "migrations", "202611130006_official_menu.sql"), "utf8");
const menu = buildMenu(snapshot);

describe("official Aahaa restaurant menu", () => {
  it("uses the current published items, images, descriptions and quote-only catering prices", () => {
    expect(menu).toHaveLength(205);
    expect(new Set(menu.map((item) => item.category)).size).toBe(16);
    expect(menu.filter((item) => item.image_url).length).toBeGreaterThan(100);
    expect(new Set(menu.map((item) => item.id)).size).toBe(menu.length);
    for (const item of menu) {
      expect(menuSchema.safeParse(item).success, item.name).toBe(true);
      expect(item.price_minor).toBeNull();
      expect(item.description).toMatch(/not a catering quote/);
      expect(item.published).toBe(true);
    }
    expect(menu.find((item) => item.name === "Mutton Pepper Soup")?.image_url).toContain("storage.googleapis.com");
    expect(buildMigration(snapshot)).toBe(migration);
  });

  it("extracts JSON-LD menu data and matching official dish images without executing page scripts", () => {
    const html = `<img src="https://storage.googleapis.com/mhp-media/img/soup.png" alt="Mutton Pepper Soup">
      <script type="application/ld+json">${JSON.stringify({
        "@type": "Menu",
        hasMenuSection: [{
          "@type": "MenuSection",
          name: "Soup",
          hasMenuItem: [{
            "@type": "MenuItem",
            name: "Mutton Pepper Soup",
            description: "Pepper broth.",
            url: "https://aahaaindiankitchen.com/indian-restaurant-menu/soup/mutton-pepper-soup",
            offers: { "@type": "Offer", price: "10.99", priceCurrency: "USD" },
          }],
        }],
      })}</script>
      <script>throw new Error("Page scripts are never executed");</script>`;
    const extracted = extractOfficialMenu(html);
    expect(extracted.sections[0].items[0]).toMatchObject({
      name: "Mutton Pepper Soup",
      price: "10.99",
      image_url: "https://storage.googleapis.com/mhp-media/img/soup.png",
    });
    expect(() => extractOfficialMenu("<script>not menu data</script>")).toThrow(/Menu JSON-LD/);
  });

  it("hides legacy import rows, imports idempotently and preserves manager changes", async () => {
    const db = new PGlite();
    try {
      const initial = readFileSync(resolve("supabase", "migrations", "202611130001_initial.sql"), "utf8");
      const table = initial.slice(initial.indexOf("create table public.menu_items"), initial.indexOf("create sequence public.catering_reference_seq"));
      await db.exec(table);
      await db.exec("insert into menu_items(name,category,unit,description) values('Legacy dish','Soups','regular-menu serving','Temporary general menu. Old reference.')");
      await db.exec(migration);
      expect((await db.query<{ count: number }>("select count(*)::int count from menu_items where published")).rows[0].count).toBe(205);
      expect((await db.query<{ published: boolean; available: boolean }>("select published,available from menu_items where name='Legacy dish'")).rows[0]).toEqual({ published: false, available: false });

      const first = menu[0];
      await db.query("update menu_items set name='Manager edited dish',published=false,price_minor=1234 where id=$1", [first.id]);
      await db.exec("insert into menu_items(name,category) values('Separate catering package','Catering')");
      await db.exec(migration);
      const edited = (await db.query<{ name: string; published: boolean; price_minor: number }>("select name,published,price_minor from menu_items where id=$1", [first.id])).rows[0];
      expect(edited.name).toBe("Manager edited dish");
      expect(edited.published).toBe(false);
      expect(Number(edited.price_minor)).toBe(1234);
      expect((await db.query<{ count: number }>("select count(*)::int count from menu_items")).rows[0].count).toBe(207);
    } finally { await db.close(); }
  }, 30_000);
});
