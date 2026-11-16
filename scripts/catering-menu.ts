import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { MenuItem, OptionGroup } from "../src/lib/types";

type Package = { id: string; name: string; inclusions: string; biryani: string[]; rice: string[]; curry: string[] };
type Tier = { guests: string; prices: number[]; appetizer: string; entree: string; biryani: string; rice: string; curry: string; breadPieces: number; dessert: string; salna: string; raita: string };
export type CateringPricing = { source: string; currency: string; notes: string[]; packages: Package[]; tiers: Tier[] };

function stableId(key: string) {
  const hash = createHash("sha256").update(`aahaa-catering-package:${key}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function group(id: string, name: string, labels: string[]): OptionGroup {
  return { id, name, min: 1, max: 1, choices: labels.map((label, index) => ({ id: `${id}_${index}`, label, price_minor: 0 })) };
}

export function buildCateringMenu(source: CateringPricing): MenuItem[] {
  return source.packages.flatMap((pack, packageIndex) => source.tiers.map((tier, tierIndex) => {
    const dollars = tier.prices[packageIndex];
    if (!Number.isInteger(dollars) || dollars <= 0) throw new Error(`Missing package price: ${pack.id} / ${tier.guests}`);
    const description = [
      pack.inclusions,
      `Approximate portions: appetizers ${tier.appetizer}; entrees ${tier.entree}; biryani ${tier.biryani}; rice ${tier.rice}; sambar/rasam ${tier.curry}; dessert ${tier.dessert}; salna ${tier.salna}; raita ${tier.raita}.`,
      `Bread: ${tier.breadPieces} naan cut into 4, OR ${tier.breadPieces} parotta/chapathi cut into 2.`,
      "Paneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.",
      ...(pack.id === "special" ? ["Special: third entree portion requires manager clarification."] : []),
    ].join("\n");
    return {
      id: stableId(`${pack.id}:${tier.guests}`),
      name: `${pack.name} - ${tier.guests} guests`,
      menu_type: "catering",
      category: pack.name,
      kind: "package",
      description,
      price_minor: dollars * 100,
      unit: `package for ${tier.guests} guests`,
      minimum_quantity: 1,
      quantity_step: 1,
      dietary: pack.id === "veg" ? ["Vegetarian"] : [],
      allergens: [],
      image_url: null,
      options: [
        group("biryani", "Biryani", pack.biryani),
        group("rice", "Rice", pack.rice),
        group("curry", "Sambar / Rasam / Curry", pack.curry),
        group("bread", "Bread (choose one type)", ["Plain Naan", "Butter Naan", "Parotta", "Chapathi"]),
        group("dessert", "Dessert", ["Pineapple Kesari", "Mango Kesari", "Gajar Halwa", "Gulab Jamun", "Payasam"]),
      ],
      available: true,
      published: true,
      sort_order: packageIndex * 100 + tierIndex,
    };
  }));
}

export function buildCateringMigration(source: CateringPricing) {
  return `-- Verified from the restaurant-supplied Catering Pricing.pdf.
-- Prices are USD per whole package, not per person. Existing restaurant items stay separate.
alter table public.menu_items add column if not exists menu_type text not null default 'regular'
  check (menu_type in ('regular', 'catering'));
alter table public.menu_items alter column menu_type set default 'catering';
create index if not exists menu_items_menu_type_idx on public.menu_items(menu_type, published, sort_order);

insert into public.menu_items (id, name, menu_type, category, kind, description, price_minor, unit, minimum_quantity, quantity_step, dietary, allergens, image_url, options, available, published, sort_order)
select id, name, menu_type, category, kind, description, price_minor, unit, minimum_quantity, quantity_step, dietary, allergens, image_url, options, available, published, sort_order
from jsonb_populate_recordset(null::public.menu_items, $aahaa_catering$
${JSON.stringify(buildCateringMenu(source), null, 2)}
$aahaa_catering$::jsonb)
on conflict (id) do nothing;
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const source: CateringPricing = JSON.parse(readFileSync(resolve("supabase", "catering-pricing.json"), "utf8"));
  const target = resolve("supabase", "migrations", "202611160001_catering_packages.sql");
  writeFileSync(target, buildCateringMigration(source));
  console.log(`Prepared ${buildCateringMenu(source).length} catering packages with verified prices.`);
}
