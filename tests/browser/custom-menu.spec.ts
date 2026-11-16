import { expect, test } from "@playwright/test";

test("custom catering categories use dropdowns and preserve choices, editing and mixed carts", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/catering-menu");
  await page.getByLabel("Party size", { exact: false }).selectOption("20 guests");
  await page.getByRole("button", { name: "Build your own catering menu", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("button", { name: /Add to your gathering/ }).click();
  await expect(modal.getByRole("alert")).toContainText("Choose at least one dish");
  await modal.getByRole("combobox", { name: "Appetizers - choice 2", exact: true }).selectOption("paneer_65");
  await expect(modal.getByRole("combobox", { name: "Appetizers - choice 1", exact: true }).locator('option[value="paneer_65"]')).toBeDisabled();
  await modal.getByRole("combobox", { name: "Entrees / Curries - choice 1", exact: true }).selectOption("yellow_dal_tadka");
  await modal.getByRole("combobox", { name: "Biryani - choice 1", exact: true }).selectOption("chennai_chicken");
  await modal.getByLabel("Special instructions", { exact: false }).fill("TEST ONLY: discuss portions for 35 guests.");
  for (const viewport of [{ width: 320, height: 740 }, { width: 852, height: 393 }]) {
    await page.setViewportSize(viewport);
    expect(await modal.evaluate(element => {
      const box = element.getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth && box.height <= innerHeight;
    })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await modal.getByRole("button", { name: /Add to your gathering/ }).click();
  const cart = page.getByRole("complementary", { name: "Your catering request" });
  await expect(cart).toContainText("Paneer 65");
  await expect(cart).toContainText("Chennai Chicken Dum Biryani");
  await expect(cart).toContainText("Price on request");
  await page.reload();
  await cart.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(modal.getByRole("combobox", { name: "Appetizers - choice 1", exact: true })).toHaveValue("paneer_65");
  await expect(modal.getByRole("combobox", { name: "Biryani - choice 1", exact: true })).toHaveValue("chennai_chicken");
  await modal.getByRole("combobox", { name: "Bread - choice 1", exact: true }).selectOption("butter_naan");
  await modal.getByRole("button", { name: /Update selection/ }).click();
  await page.getByRole("button", { name: "Customise Aahaa Veg Package - 20 guests", exact: true }).click();
  for (const label of ["Veg Biryani", "White Rice", "Sambar", "Butter Naan", "Gulab Jamun"]) {
    await modal.getByRole("checkbox", { name: `${label} Included`, exact: true }).check();
  }
  await modal.getByRole("button", { name: /Add to your gathering/ }).click();
  await expect(cart.locator(".cart-line")).toHaveCount(2);
  await expect(page.getByRole("combobox", { name: /^Party size/ }).getByRole("option", { name: "custom menu", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Customer login", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/catering-menu");
  await expect(cart.locator(".cart-line")).toHaveCount(2);
  await expect(cart).toContainText("Butter Naan");
  const categories = page.getByLabel("Menu categories");
  await expect(categories.getByRole("button").last()).toHaveText("Customized");
  await categories.getByRole("button", { name: "Customized", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Customise / })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Build your own catering menu", exact: true })).toBeVisible();
  await expect(page.getByText("No dishes found", { exact: true })).toHaveCount(0);
});

test("Veg and Non-Veg package groups offer Customized last and flag the manager review", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/catering-menu");
  for (const name of ["Aahaa Veg Package - 20 guests", "Aahaa Non-Veg Package - 20 guests"]) {
    await page.getByRole("button", { name: `Customise ${name}`, exact: true }).click();
    const modal = page.getByRole("dialog");
    for (const group of await modal.locator("fieldset.option-group").all()) {
      await expect(group.getByRole("checkbox").last()).toHaveAccessibleName("Customized - manager review Quote required");
    }
    await modal.getByRole("group", { name: /^Biryani/ }).getByRole("checkbox").last().check();
    await expect(modal.getByRole("status")).toContainText("base estimate only");
    for (const group of await modal.locator("fieldset.option-group").all()) {
      if (!await group.getByRole("checkbox", { checked: true }).count()) await group.getByRole("checkbox").first().check();
    }
    await modal.getByLabel(/Special instructions/).fill("Discuss my preferred biryani with the manager.");
    await modal.getByRole("button", { name: /Add to your gathering/ }).click();
  }
  const cart = page.getByRole("complementary", { name: "Your catering request" });
  await expect(cart.locator(".cart-line")).toHaveCount(2);
  await expect(cart.locator(".subtotal")).toContainText("$660.00");
  await expect(cart).toContainText("Base estimate; substitutions need a manager quote");
  await page.reload();
  await expect(cart).toContainText("Manager review and revised quote required");
});
