import type { Choice, MenuItem, OptionGroup } from "./types";

function quoteChoice(id: string, label: string): Choice {
  return { id, label, price_minor: 0, requires_quote: true };
}

function group(id: string, name: string, max: number, choices: Choice[]): OptionGroup {
  return { id, name, min: 0, max, choices };
}

const categoryOptions: OptionGroup[] = [
  group("veg_appetizer", "Veg Appetizer", 2, [
    quoteChoice("onion_pakoda", "Onion Pakoda"),
    quoteChoice("chatpata", "Chatpata"),
    quoteChoice("cut_mirchi", "Cut Mirchi"),
    quoteChoice("mini_samosa", "Mini Samosa"),
    quoteChoice("veg_samosa", "Veg Samosa"),
    quoteChoice("gobi_manchurian", "Gobi Manchurian"),
    quoteChoice("gobi_chilli", "Gobi Chilli"),
    quoteChoice("gobi_karampodi", "Gobi Karampodi"),
    quoteChoice("gobi_monagadu", "Gobi Monagadu"),
    quoteChoice("gobi_65", "Gobi 65"),
    quoteChoice("gobi_curry_leaf", "Gobi Curry Leaf"),
    quoteChoice("paneer_65", "Paneer 65"),
    quoteChoice("babycorn_manchurian", "Baby Corn Manchurian"),
    quoteChoice("idli_manchurian", "Idli Manchurian"),
  ]),
  group("chicken_appetizer", "Chicken Appetizers", 2, [
    quoteChoice("chicken_manchurian", "Chicken Manchurian"),
    quoteChoice("chicken_chilli", "Chicken Chilli"),
    quoteChoice("chicken_karampodi", "Chicken Karampodi"),
    quoteChoice("chicken_monagadu", "Chicken Monagadu"),
    quoteChoice("chicken_65", "Chicken 65"),
    quoteChoice("chicken_curry_leaf", "Chicken Curry Leaf"),
    quoteChoice("pepper_fry", "Pepper Fry"),
    quoteChoice("nnc", "NNC"),
    quoteChoice("chicken_masakali", "Masakali"),
  ]),
  group("veg_entrees", "Veg Entrees", 3, [
    quoteChoice("gutti_vankaya", "Gutti Vankaya"),
    quoteChoice("navratna_korma", "Navratna Korma"),
    quoteChoice("veg_karaikudi", "Veg Karaikudi"),
    quoteChoice("okra_masala", "Okra Masala"),
    quoteChoice("okra_fry", "Okra Fry"),
    quoteChoice("aloo_gobi", "Aloo Gobi"),
    quoteChoice("chana_masala", "Chana Masala"),
    quoteChoice("dal_tadka", "Dal Tadka"),
    quoteChoice("veg_korma", "Veg Korma"),
    quoteChoice("egg_masala", "Egg Masala"),
    quoteChoice("paneer_butter_masala", "Paneer Butter Masala"),
    quoteChoice("paneer_tikka_masala", "Paneer Tikka Masala"),
    quoteChoice("paneer_saag", "Paneer Saag"),
    quoteChoice("paneer_kadai_curry", "Paneer Kadai Curry"),
    quoteChoice("malai_kofta", "Malai Kofta"),
  ]),
  group("chicken_entrees", "Chicken Entrees", 2, [
    quoteChoice("chicken_butter_masala", "Butter Masala"),
    quoteChoice("chicken_tikka_masala", "Tikka Masala"),
    quoteChoice("chicken_saag", "Saag"),
    quoteChoice("chicken_karaikudi", "Karaikudi"),
    quoteChoice("chicken_kadai_curry", "Kadai Curry"),
    quoteChoice("andhra_chicken_curry", "Andhra Curry"),
    quoteChoice("nawabi_murgh_masala", "Nawabi Murgh Masala"),
    quoteChoice("gongura_curry", "Gongura Curry"),
  ]),
  group("biryani", "Biryanis", 1, [
    quoteChoice("veg_dum_biryani", "Veg Dum Biryani"),
    quoteChoice("chicken_dum_biryani", "Chicken Dum Biryani"),
  ]),
  group("bread", "Bread", 2, [
    quoteChoice("plain_naan", "Plain Naan"),
    quoteChoice("butter_naan", "Butter Naan"),
    quoteChoice("chapathi", "Chapathi"),
    quoteChoice("parotta", "Parotta"),
  ]),
];

const customDescription = [
  "Choose dishes by category to build your own catering menu.",
  "Selections follow the restaurant's catering categories (veg/chicken appetizers, entrees, biryanis, bread).",
  "All customized selections are reviewed by the manager and priced later after quantity and preparation confirmation.",
].join(" ");

export function withCustomCateringCategoryOptions(item: MenuItem): MenuItem {
  if (!item.is_custom_menu) return item;
  return { ...item, description: customDescription, options: categoryOptions };
}
