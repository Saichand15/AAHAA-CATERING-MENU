import "server-only";
import { sessionDb } from "./supabase";
import { databaseConfigured, submissionBlockers } from "./config";
import type { BusinessSettings, MenuItem } from "./types";

export async function getCatalog(): Promise<{ settings: BusinessSettings | null; menu: MenuItem[]; canSubmit: boolean; problem: string | null }> {
  if (!databaseConfigured()) return { settings: null, menu: [], canSubmit: false, problem: "Online catering is being set up. Menu browsing and requests will be available once the restaurant connects its services." };
  const db = await sessionDb();
  const [settingsResult, menuResult] = await Promise.all([
    db.from("business_settings").select("*").eq("id", true).single(),
    db.from("menu_items").select("*").eq("published", true).order("sort_order").order("name"),
  ]);
  if (settingsResult.error || menuResult.error) {
    console.error("Catalog unavailable", { settings: settingsResult.error?.code, menu: menuResult.error?.code });
    return { settings: null, menu: [], canSubmit: false, problem: "The menu is temporarily unavailable. Please try again shortly." };
  }
  const settings = settingsResult.data;
  const ready = submissionBlockers().length === 0 && settings.accepting_requests;
  return { settings, menu: menuResult.data, canSubmit: ready, problem: ready ? null : "Online requests are not open yet. Please contact the restaurant to discuss catering." };
}
