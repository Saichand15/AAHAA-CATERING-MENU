import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { buildEmail } from "../../src/lib/email";
import { savedRequest, settings } from "../fixtures";

test("manager email remains readable with loaded or blocked images and inline-only styling", async ({ page }) => {
  const description = [
    "2 veg appetizers; 2 veg entrees; veg biryani; white rice or jeera rice; sambar or rasam; bread; dessert; raita; salna.",
    "Approximate portions: appetizers Jumbo / 57 oz each; entrees Jumbo / 57 oz each (2 listed portions); biryani Medium shallow / 175 oz; rice Jumbo / 57 oz; sambar/rasam Jumbo / 57 oz; dessert Jumbo / 57 oz; salna 16 oz; raita 16 oz.",
    "Bread: 10 naan cut into 4, OR 10 parotta/chapathi cut into 2.",
    "Paneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.",
  ].join("\n");
  const request = { ...savedRequest, items: [{ ...savedRequest.items[0], description }] };
  const message = buildEmail(request, settings, "owner@example.com", "staff", "https://catering.example.com", "notify@example.com");
  const logoUrl = "https://email-assets.example.test/aahaa-logo.png";
  const html = message.html.replace(/(<img[^>]*src=")[^"]+/, `$1${logoUrl}`);
  await page.route(logoUrl, route => route.fulfill({
    contentType: "image/png",
    body: readFileSync(resolve("public", "aahaa-logo-email.png")),
  }));
  for (const inlineOnly of [false, true]) {
    await page.setContent(inlineOnly ? html.replace(/<style>[\s\S]*?<\/style>/, "") : html);
    await page.getByRole("img", { name: "Aahaa Indian Kitchen", exact: true }).evaluate((img: HTMLImageElement) => img.decode());
    for (const width of [320, 390, 900]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      expect(await page.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
      await expect(page.getByRole("heading", { name: "Requested menu", exact: true })).toBeVisible();
      const card = page.getByRole("table", { name: savedRequest.items[0].name, exact: true });
      expect(await card.evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(width < 400 ? 230 : 500);
      await expect(card).toContainText("Quantity");
      await expect(card).toContainText("$27.50");
      await expect(card.getByRole("table", { name: "Approximate package portions" })).toBeVisible();
      await expect(card).toContainText("Jumbo / 57 oz each (2 listed portions)");
      await expect(card).toContainText("10 parotta/chapathi cut into 2");
    }
  }
  await page.route(logoUrl, route => route.abort());
  await page.setContent(html);
  await expect(page.getByText("CATERING & BULK ORDERS", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Customer", exact: true })).toBeVisible();
});
