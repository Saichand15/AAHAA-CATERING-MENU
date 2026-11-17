import { expect, test } from "@playwright/test";

test("bottom chat remains accessible at phone and landscape sizes without promising unconfigured service", async ({ page }) => {
  await page.goto("/catering-menu");
  await page.getByRole("button", { name: "Chat with AAHAA", exact: true }).click();
  const chat = page.getByRole("dialog", { name: "Chat with AAHAA", exact: true });
  await expect(chat).toBeVisible();
  await expect(chat).toContainText("Chat setup is not complete");
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 852, height: 393 }]) {
    await page.setViewportSize(viewport);
    expect(await chat.evaluate(element => {
      const box = element.getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight;
    })).toBe(true);
    await expect(chat.getByRole("button", { name: "Close chat" })).toBeInViewport();
  }
  await chat.getByRole("button", { name: "Close chat" }).click();
  await expect(chat).toHaveCount(0);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/manager\/login$/);
  await expect(page.getByLabel("Staff email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Chat with AAHAA", exact: true })).toHaveCount(0);
  await page.goto("/manager/chats");
  await expect(page).toHaveURL(/\/manager\/login$/);
});
