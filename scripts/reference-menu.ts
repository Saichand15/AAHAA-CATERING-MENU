import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { z } from "zod";
import type { MenuItem } from "../src/lib/types";

export const sourceUrl = "https://aahaamenumanager.netlify.app/script.js";
const snapshotPath = resolve("supabase", "reference-menu.json");
const migrationPath = resolve("supabase", "migrations", "202611130005_reference_menu.sql");
const sectionsSchema = z.array(z.object({
  name: z.string().min(1).max(80),
  items: z.array(z.object({
    name: z.string().min(1).max(120),
    desc: z.string().max(800),
    price: z.string().regex(/^\$\d+\.\d{2}( \| \$\d+\.\d{2})*$/),
    spice: z.string().max(20),
    veg: z.union([z.boolean(), z.literal("both")]),
  })).min(1),
})).min(1);
const snapshotSchema = z.object({
  source: z.literal(sourceUrl),
  source_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sections: sectionsSchema,
});
type Sections = z.infer<typeof sectionsSchema>;

const variants: Record<string, string[]> = {
  "Hot & Sour Soup Veg/Chicken": ["Veg", "Chicken"],
  "Manchow Soup Veg/Chicken": ["Veg", "Chicken"],
  "Sweet Corn Veg/Chicken": ["Veg", "Chicken"],
  "Aloo/Avocado Papdi Chaat": ["Aloo", "Avocado"],
  "Andhra Chicken/Goat Curry": ["Chicken", "Goat"],
  "Hyderabadi Chicken/Goat Curry": ["Chicken", "Goat"],
  "Kadai Chicken/Goat (no lamb)": ["Chicken", "Goat"],
  "Goan Shrimp / Fish Curry": ["Shrimp", "Fish"],
  "Chicken/Goat Kurma": ["Chicken", "Goat"],
  "Chicken/Goat Rogan Josh": ["Chicken", "Goat"],
  "Chicken/Mutton Saag": ["Chicken", "Mutton"],
  "Schezwan Fried Rice (Veg/Egg/Chicken)": ["Veg", "Egg", "Chicken"],
  "Tandoori Chicken (4 pcs / 8 pcs)": ["4 pcs", "8 pcs"],
  "Hyderabadi Dum Biryani (Chicken/Goat)": ["Chicken", "Goat"],
  "Chennai Dum Biryani (Chicken/Goat)": ["Chicken", "Goat"],
  "Dindigul Biryani (Veg/Chicken/Goat)": ["Veg", "Chicken", "Goat"],
  "Kizhi Parotta (Chicken/Mutton/Shrimp)": ["Chicken", "Mutton", "Shrimp"],
  "Parotta 2 pcs with Veg/Chicken Curry": ["Veg", "Chicken"],
  "Sodas (Pepsi/Fanta/Thumbsup)": ["Pepsi", "Fanta", "Thumbsup"],
};

function literal(node: ts.Node): unknown {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) {
    return Object.fromEntries(node.properties.map(property => {
      if (!ts.isPropertyAssignment(property) ||
          !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) {
        throw new Error("Reference menu must contain literal properties only.");
      }
      return [property.name.text, literal(property.initializer)];
    }));
  }
  throw new Error("Reference menu contains executable or unsupported syntax; import stopped.");
}

export function extractSections(source: string): Sections {
  // Parse the public data literal; never evaluate the site's JavaScript.
  const ast = ts.createSourceFile("menu.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const declarations = ast.statements.filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .filter(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === "DEFAULT_MENU");
  if (declarations.length !== 1 || !declarations[0].initializer) {
    throw new Error("Expected exactly one DEFAULT_MENU data declaration.");
  }
  return sectionsSchema.parse(literal(declarations[0].initializer));
}

function itemId(category: string, name: string): string {
  const bytes = createHash("sha256").update(JSON.stringify(["aahaa-reference-menu-v1", category, name])).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function buildMenu(input: unknown): MenuItem[] {
  const sections = sectionsSchema.parse(input);
  const ids = new Set<string>();
  const categories = [...new Set(sections.map(section => section.name))];
  const result: MenuItem[] = [];
  for (const category of categories) {
    for (const source of sections.filter(section => section.name === category).flatMap(section => section.items)) {
      const id = itemId(category, source.name);
      if (ids.has(id)) throw new Error(`Duplicate source item: ${category} / ${source.name}`);
      ids.add(id);
      const choices = variants[source.name];
      const prices = source.price.split(" | ");
      if ((source.name.includes("/") && !choices) ||
          (prices.length > 1 && choices?.length !== prices.length)) {
        throw new Error(`Review source variations before importing: ${source.name}`);
      }
      result.push({
        id, name: source.name, category, kind: "item",
        description: `Temporary general menu. ${source.desc} Regular-menu reference price: ${source.price} (not a catering quote). Catering price, portions and availability require manager confirmation.${source.spice ? ` Source spice marker: ${source.spice}.` : ""}`,
        price_minor: null, unit: "regular-menu serving", minimum_quantity: 1, quantity_step: 1,
        dietary: source.veg === true ? ["Vegetarian"] : [],
        allergens: [], image_url: null,
        options: choices ? [{
          id: "variant", name: "Choose a variation", min: 1, max: 1,
          choices: choices.map(label => ({ id: label.toLowerCase().replaceAll(" ", "-"), label, price_minor: 0 })),
        }] : [],
        available: true, published: true, sort_order: result.length,
      });
    }
  }
  return result;
}

export function buildMigration(input: unknown): string {
  const snapshot = snapshotSchema.parse(input);
  const rows = buildMenu(snapshot.sections);
  const data = JSON.stringify(rows, null, 2);
  const delimiter = "$aahaa_reference_menu$";
  if (data.includes(delimiter)) throw new Error("Unexpected SQL delimiter in source data.");
  const columns = Object.keys(rows[0]).join(", ");
  return `-- Generated by npm run menu:prepare from the owner-supplied public menu.
-- Source: ${snapshot.source}
-- Source SHA-256: ${snapshot.source_sha256}
-- Catering prices intentionally remain NULL. No business settings are enabled.
-- Stable IDs and DO NOTHING preserve staff edits on a repeated import.
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
    throw new Error("Usage: npm run menu:prepare [-- --fetch]");
  }
  let snapshot: z.infer<typeof snapshotSchema>;
  if (args.includes("--fetch")) {
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Reference menu download failed: HTTP ${response.status}`);
    const source = await response.text();
    snapshot = { source: sourceUrl, source_sha256: createHash("sha256").update(source).digest("hex"), sections: extractSections(source) };
  } else {
    snapshot = snapshotSchema.parse(JSON.parse(readFileSync(snapshotPath, "utf8")));
  }
  const sql = buildMigration(snapshot);
  if (existsSync(migrationPath) && readFileSync(migrationPath, "utf8") !== sql) {
    throw new Error("The source changed. Preserve the existing migration and review a new migration; no files were overwritten.");
  }
  if (!existsSync(migrationPath)) writeFileSync(migrationPath, sql, { flag: "wx" });
  writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  const menu = buildMenu(snapshot.sections);
  console.log(`Prepared ${menu.length} real items, ${new Set(menu.map(item => item.category)).size} categories, ${menu.filter(item => item.options.length).length} variation groups. Database not modified.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : "Reference-menu preparation failed.");
    process.exitCode = 1;
  });
}
