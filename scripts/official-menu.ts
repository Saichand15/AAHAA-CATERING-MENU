import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { MenuItem } from "../src/lib/types";

export const sourceUrl = "https://aahaaindiankitchen.com/indian-restaurant-menu";
const snapshotPath = resolve("supabase", "official-menu.json");
const migrationPath = resolve("supabase", "migrations", "202611130006_official_menu.sql");

const sourceItemSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(800),
  price: z.string().regex(/^\d+\.\d{2}$/),
  url: z.string().url().startsWith("https://aahaaindiankitchen.com/"),
  image_url: z.string().url().startsWith("https://storage.googleapis.com/").nullable(),
});
const sourceSchema = z.object({
  source: z.literal(sourceUrl),
  source_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sections: z.array(z.object({
    name: z.string().min(1).max(80),
    items: z.array(sourceItemSchema).min(1),
  })).min(1),
});
const menuJsonSchema = z.object({
  "@type": z.literal("Menu"),
  hasMenuSection: z.array(z.object({
    "@type": z.literal("MenuSection").optional(),
    name: z.string().min(1).max(80),
    hasMenuItem: z.array(z.object({
      "@type": z.literal("MenuItem").optional(),
      name: z.string().min(1).max(120),
      description: z.string().max(800).optional().default(""),
      url: z.string().url().startsWith("https://aahaaindiankitchen.com/"),
      offers: z.object({
        "@type": z.literal("Offer").optional(),
        price: z.union([z.string(), z.number()]),
        priceCurrency: z.literal("USD"),
      }),
    })).min(1),
  })).min(1),
});
type Snapshot = z.infer<typeof sourceSchema>;

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function imageMap(html: string): Map<string, string> {
  const images = new Map<string, string>();
  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
    const attributes = Object.fromEntries(
      [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1].toLowerCase(), decodeHtml(match[2])]),
    );
    if (!attributes.alt || !attributes.src?.startsWith("https://storage.googleapis.com/")) continue;
    const key = attributes.alt.trim().toLocaleLowerCase("en-US");
    if (!images.has(key)) images.set(key, attributes.src);
  }
  return images;
}

export function extractOfficialMenu(html: string): Omit<Snapshot, "source_sha256"> {
  const scripts = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  const documents = scripts.flatMap(([, content]) => {
    try { return [JSON.parse(content) as unknown]; }
    catch { return []; }
  });
  const menus = documents.filter((value) => z.object({ "@type": z.literal("Menu") }).passthrough().safeParse(value).success);
  if (menus.length !== 1) throw new Error("Expected exactly one restaurant Menu JSON-LD document.");
  const menu = menuJsonSchema.parse(menus[0]);
  const images = imageMap(html);
  const sections = menu.hasMenuSection.map((section) => ({
    name: section.name,
    items: section.hasMenuItem.map((item) => {
      const price = typeof item.offers.price === "number" ? item.offers.price.toFixed(2) : item.offers.price;
      return sourceItemSchema.parse({
        name: item.name,
        description: item.description,
        price,
        url: item.url,
        image_url: images.get(item.name.trim().toLocaleLowerCase("en-US")) ?? null,
      });
    }),
  }));
  const seen = new Set<string>();
  for (const section of sections) {
    for (const item of section.items) {
      const key = `${section.name.toLocaleLowerCase("en-US")}\0${item.name.toLocaleLowerCase("en-US")}`;
      if (seen.has(key)) throw new Error(`Duplicate official menu item: ${section.name} / ${item.name}`);
      seen.add(key);
    }
  }
  return { source: sourceUrl, sections: sourceSchema.shape.sections.parse(sections) };
}

function itemId(category: string, name: string): string {
  const bytes = createHash("sha256").update(JSON.stringify(["aahaa-official-menu-v1", category, name])).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function buildMenu(input: unknown): MenuItem[] {
  const snapshot = sourceSchema.parse(input);
  let sortOrder = 0;
  const result = snapshot.sections.flatMap((section) => section.items.map((source) => ({
    id: itemId(section.name, source.name),
    name: source.name,
    category: section.name,
    kind: "item" as const,
    description: `${source.description} Listed restaurant price: $${source.price} (for reference only, not a catering quote). Catering prices and portions are confirmed for your event.`,
    price_minor: null,
    unit: "serving",
    minimum_quantity: 1,
    quantity_step: 1,
    dietary: [],
    allergens: [],
    image_url: source.image_url,
    options: [],
    available: true,
    published: true,
    sort_order: sortOrder++,
  })));
  if (new Set(result.map((item) => item.id)).size !== result.length) {
    throw new Error("Official menu contains duplicate dishes.");
  }
  return result;
}

export function buildMigration(input: unknown): string {
  const snapshot = sourceSchema.parse(input);
  const rows = buildMenu(snapshot);
  const data = JSON.stringify(rows, null, 2);
  const delimiter = "$aahaa_official_menu$";
  if (data.includes(delimiter)) throw new Error("Unexpected SQL delimiter in official menu data.");
  const columns = Object.keys(rows[0]).join(", ");
  return `-- Generated by npm run menu:official-prepare from Aahaa Indian Kitchen's public menu.
-- Source: ${snapshot.source}
-- Source SHA-256: ${snapshot.source_sha256}
-- Restaurant prices are reference text only; catering prices remain NULL.
-- Legacy general-menu rows are hidden; stable IDs and DO NOTHING preserve staff edits.
update public.menu_items set published = false, available = false
where unit = 'regular-menu serving' and description like 'Temporary general menu.%';

insert into public.menu_items (${columns})
select ${columns}
from jsonb_populate_recordset(null::public.menu_items, ${delimiter}
${data}
${delimiter}::jsonb)
on conflict (id) do nothing;
`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length && !(args.length === 1 && args[0] === "--fetch")) {
    throw new Error("Usage: npm run menu:official-prepare [-- --fetch]");
  }
  let snapshot: Snapshot;
  if (args.includes("--fetch")) {
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Official menu download failed: HTTP ${response.status}`);
    const html = await response.text();
    snapshot = sourceSchema.parse({
      ...extractOfficialMenu(html),
      source_sha256: createHash("sha256").update(html).digest("hex"),
    });
  } else {
    snapshot = sourceSchema.parse(JSON.parse(readFileSync(snapshotPath, "utf8")));
  }
  const migration = buildMigration(snapshot);
  if (existsSync(migrationPath) && readFileSync(migrationPath, "utf8") !== migration) {
    throw new Error("The official menu source changed. Preserve the existing migration and review a new migration; no files were overwritten.");
  }
  if (!existsSync(migrationPath)) writeFileSync(migrationPath, migration, { flag: "wx" });
  writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  const items = buildMenu(snapshot);
  console.log(`Prepared ${items.length} current restaurant menu items across ${new Set(items.map((item) => item.category)).size} categories (${items.filter((item) => item.image_url).length} official images). Database not modified.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Official-menu preparation failed.");
    process.exitCode = 1;
  });
}
