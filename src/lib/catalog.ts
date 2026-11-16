import "server-only";
import { sessionDb } from "./supabase";
import { databaseConfigured, submissionBlockers } from "./config";
import type { BusinessSettings, MenuItem } from "./types";
import { settingsSchema } from "./validation";

export async function getCatalog(menuType: "regular" | "catering" = "catering"): Promise<{ settings: BusinessSettings | null; menu: MenuItem[]; cartMenu: MenuItem[]; canSubmit: boolean; problem: string | null }> {
  if (!databaseConfigured()) return { settings: null, menu: [], cartMenu: [], canSubmit: false, problem: "Online catering is being set up. Menu browsing and requests will be available once the restaurant connects its services." };
  const db = await sessionDb();
  const [settingsResult, menuResult] = await Promise.all([
    db.from("business_settings").select("*").eq("id", true).single(),
    db.from("menu_items").select("*").eq("published", true).order("sort_order").order("name"),
  ]);
  if (settingsResult.error || menuResult.error) {
    console.error("Catalog unavailable", { settings: settingsResult.error?.code, menu: menuResult.error?.code });
    return { settings: null, menu: [], cartMenu: [], canSubmit: false, problem: "The menu is temporarily unavailable. Please try again shortly." };
  }
  const settings = settingsResult.data;
  const validSettings = settingsSchema.safeParse(settings).success;
  if (!validSettings) console.error("Catering business settings are incomplete");
  const ready = submissionBlockers().length === 0 && settings.accepting_requests && validSettings;
  return { settings, menu: menuResult.data.filter(item => item.menu_type === menuType), cartMenu: menuResult.data, canSubmit: ready, problem: ready ? null : "Online requests are not open yet. Please contact the restaurant to discuss catering." };
}
