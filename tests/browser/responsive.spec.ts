import { expect, test, type Page } from "@playwright/test";

const sizes = [
  { width: 320, height: 568 },
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 852, height: 393 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => ({
    document: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    body: document.body.scrollWidth <= document.documentElement.clientWidth + 1,
  }))).toEqual({ document: true, body: true });
}

for (const route of ["/", "/menu", "/catering-menu", "/login", "/manager/login", "/privacy"]) {
  test(`${route} fits phone, landscape, tablet and desktop viewports`, async ({ page }) => {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    for (const size of sizes) {
      await page.setViewportSize(size);
      await expectNoOverflow(page);
      for (const selector of ["header", "main", "footer"]) {
        const element = page.locator(selector).first();
        if (await element.count()) {
          expect(await element.evaluate(el => {
            const rect = el.getBoundingClientRect();
            return rect.left >= -1 && rect.right <= document.documentElement.clientWidth + 1;
          }), `${route}: ${selector} at ${size.width}px`).toBe(true);
        }
      }
    }
  });
}

for (const route of ["/login", "/manager/login"]) {
test(`${route} account logo, heading and controls stay aligned across screen sizes`, async ({ page }) => {
  await page.goto(route);
  await page.evaluate(() => document.fonts.ready);
  const card = page.locator(".customer-login");
  await expect(page.getByText("Welcome to Aahaa.", { exact: true })).toHaveCount(0);
  for (const size of [sizes[0], sizes[2], sizes[4], sizes[7]]) {
    await page.setViewportSize(size);
    await expectNoOverflow(page);
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    const center = box!.x + box!.width / 2;
    const selectors = [".brand-logo", ".customer-login-heading h1", "input[type=email]", "form .button.full"];
    if (route === "/login") selectors.push(".auth-tabs", ".auth-guest");
    for (const selector of selectors) {
      const element = await card.locator(selector).boundingBox();
      expect(element, selector).not.toBeNull();
      expect(Math.abs(element!.x + element!.width / 2 - center), selector).toBeLessThanOrEqual(2);
    }
    if (route === "/login") {
      const tabs = await card.locator(".auth-tabs .tab").all();
      const first = await tabs[0].boundingBox();
      const second = await tabs[1].boundingBox();
      expect(Math.abs(first!.width - second!.width)).toBeLessThanOrEqual(1);
    }
    await expect(card.locator(".field").first()).toHaveCSS("text-align", "start");
  }
  if (route === "/login") {
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page.getByLabel("Confirm password", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Customer login", exact: true }).click();
    await expect(page.getByLabel("Confirm password", { exact: true })).toHaveCount(0);
  } else {
    await expect(page.getByText("Welcome back.", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "ADMIN & MANAGER LOGIN" })).toBeVisible();
  }
});
}

test("phone forms avoid focus zoom and guest navigation reaches the menu", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/login");
  for (const input of await page.locator("input").all()) {
    expect(await input.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  }
  for (const tab of await page.locator(".auth-tabs .tab").all()) {
    expect((await tab.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("link", { name: "Continue as guest" }).click();
  await expect(page).toHaveURL(/\/catering-menu#menu$/);
  await expect(page.getByRole("heading", { name: "Explore catering packages." })).toBeVisible();
});

test("food customization remains usable on a narrow phone and in landscape", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/menu");
  const choose = page.getByRole("button", { name: /^Customise / }).first();
  test.skip(await choose.count() === 0, "A configured published menu is required for customization checks.");
  await choose.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (const size of [sizes[0], sizes[4]]) {
    await page.setViewportSize(size);
    expect(await dialog.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
    })).toBe(true);
    const quantity = page.getByLabel(/^Quantity/);
    expect(await quantity.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    expect((await page.getByRole("button", { name: "Increase quantity" }).boundingBox())?.width).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("button", { name: "Close customization" }).click();
  await expect(dialog).not.toBeVisible();
});

test("priced catering packages filter, customize and calculate a real cart without sending an enquiry", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/catering-menu");
  await expect(page.getByRole("button", { name: /^Customise / })).toHaveCount(21);
  await page.getByRole("combobox", { name: /^Party size/ }).selectOption("20 guests");
  await expect(page.getByRole("button", { name: /^Customise / })).toHaveCount(3);
  await page.getByRole("button", { name: "Customise Aahaa Veg Package - 20 guests", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (const label of ["Veg Biryani", "White Rice", "Sambar", "Butter Naan", "Gulab Jamun"]) {
    await dialog.getByRole("checkbox", { name: `${label} Included`, exact: true }).check();
  }
  await dialog.getByLabel("Special instructions", { exact: false }).fill("Vegetarian appetizer preferences for manager confirmation.");
  await dialog.getByRole("checkbox", { name: "Request substitutions to the included menu" }).check();
  await dialog.getByLabel("Requested substitutions").fill("Replace rice with a preferred dish; manager quote requested.");
  await dialog.getByRole("button", { name: /Add to your gathering/ }).click();
  const cart = page.getByRole("complementary", { name: "Your catering request" });
  await expect(cart).toContainText("Aahaa Veg Package - 20 guests");
  await expect(cart.locator(".subtotal")).toContainText("$320.00");
  await expect(cart).toContainText("Butter Naan");
  await expect(cart).toContainText("Base estimate; substitutions need a manager quote");
  await expect(cart).toContainText("Replace rice with a preferred dish");
  await expectNoOverflow(page);
});

test("reduced motion is respected and zoom stays enabled", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".welcome-screen")).toBeHidden();
  expect(await page.locator(".brand-mark").first().evaluate(el => getComputedStyle(el).animationName)).toBe("none");
  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).toContain("viewport-fit=cover");
  expect(viewport).not.toMatch(/user-scalable=no|maximum-scale=1(?:,|$)/);
});

test("catalog cards stay compact while preserving expandable details and touch targets", async ({ page }) => {
  for (const route of ["/catering-menu", "/menu"]) {
    await page.goto(route);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const card = page.locator(".catalog-section .menu-card").first();
      await expect(card).toBeVisible();
      expect(await card.evaluate(el => el.getBoundingClientRect().height)).toBeLessThanOrEqual(320);
      expect((await card.getByRole("button", { name: /^Customise/ }).boundingBox())?.height).toBeGreaterThanOrEqual(44);
      await expectNoOverflow(page);
    }
    const details = page.locator(".catalog-section .menu-card").first().locator("details");
    await details.locator("summary").click();
    await expect(details).toHaveAttribute("open", "");
    await expect(details.locator("p").first()).toBeVisible();
    await expectNoOverflow(page);
  }
});

test("package inclusions and portions remain readable and aligned on narrow phones", async ({ page }) => {
  await page.goto("/catering-menu");
  const card = page.locator(".catalog-package").first();
  await card.locator("summary").click();
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    const table = card.getByRole("table", { name: "Approximate package portions" });
    await expect(table).toBeVisible();
    await expect(table.getByRole("row")).toHaveCount(9);
    expect(await table.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(await table.getByRole("cell").first().evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
    expect(await table.getByRole("rowheader").first().evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
    await expectNoOverflow(page);
  }
  await card.getByRole("button", { name: /^Customise/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "What's included" })).toBeVisible();
  await expect(dialog.getByRole("table", { name: "Approximate package portions" })).toBeAttached();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await expect(dialog.getByText("10 naan cut into 4")).toBeAttached();
  await expect(dialog.getByText(/Paneer: one entree only/)).toBeAttached();
});

test("cart and event draft survive menu switching, login navigation and refresh", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/catering-menu");
  await page.getByRole("button", { name: "Customise Aahaa Veg Package - 20 guests", exact: true }).click();
  const dialog = page.getByRole("dialog");
  for (const label of ["Veg Biryani", "White Rice", "Sambar", "Butter Naan", "Gulab Jamun"]) {
    await dialog.getByRole("checkbox", { name: `${label} Included`, exact: true }).check();
  }
  await dialog.getByLabel("Special instructions", { exact: false }).fill("Keep this menu draft");
  await dialog.getByRole("button", { name: /Add to your gathering/ }).click();
  await page.getByRole("button", { name: /Review cart & send/ }).click();
  await page.getByRole("button", { name: "Add event details" }).click();
  await page.getByLabel(/^Full name/).fill("Draft Customer");
  await page.getByLabel(/^Number of guests/).fill("25");
  await page.getByLabel(/Anything else/).fill("Preserve event notes");
  await page.getByRole("combobox", { name: /^Party size/ }).selectOption("20 guests");
  await page.getByRole("textbox", { name: "Search menu" }).fill("Veg");
  await page.getByRole("link", { name: "Explore regular dishes for inspiration" }).click();
  await expect(page).toHaveURL(/\/menu(?:#.*)?$/);
  await expect(page.getByText("REGULAR RESTAURANT MENU", { exact: true })).toBeVisible();
  const cart = page.getByRole("complementary", { name: "Your catering request" });
  await expect(cart).toContainText("Aahaa Veg Package - 20 guests");
  await page.getByRole("button", { name: /^Customise / }).first().click();
  await dialog.getByRole("button", { name: /Add to your gathering/ }).click();
  await expect(cart.locator(".cart-line")).toHaveCount(2);
  await page.getByRole("link", { name: "Customer login", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/catering-menu");
  await expect(cart.locator(".cart-line")).toHaveCount(2);
  await expect(page.getByLabel(/^Full name/)).toHaveValue("Draft Customer");
  await expect(page.getByLabel(/^Number of guests/)).toHaveValue("25");
  await expect(page.getByRole("combobox", { name: /^Party size/ })).toHaveValue("20 guests");
  await expect(page.getByRole("textbox", { name: "Search menu" })).toHaveValue("Veg");
  await page.reload();
  await expect(cart.locator(".cart-line")).toHaveCount(2);
  await expect(page.getByLabel(/Anything else/)).toHaveValue("Preserve event notes");
  await expectNoOverflow(page);
});

test("quick enquiries require only name, mobile and privacy consent while preserving the cart", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/catering-menu");
  await page.getByRole("button", { name: "Customise Aahaa Veg Package - 20 guests", exact: true }).click();
  const dialog = page.getByRole("dialog");
  for (const label of ["Veg Biryani", "White Rice", "Sambar", "Butter Naan", "Gulab Jamun"]) {
    await dialog.getByRole("checkbox", { name: `${label} Included`, exact: true }).check();
  }
  await dialog.getByRole("button", { name: /Add to your gathering/ }).click();
  await expect(page.getByText(/Draft saved in this browser tab/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Clear saved draft" })).toHaveCount(0);
  await page.getByRole("button", { name: "Send without event details" }).click();
  await expect(page.locator(".optional-event-details")).not.toHaveAttribute("open", "");
  await page.getByLabel(/^Full name/).fill("Quick Enquiry Customer");
  await page.getByLabel(/^Phone number/).fill("+12125551235");
  await page.reload();
  await expect(page.getByLabel(/^Full name/)).toHaveValue("Quick Enquiry Customer");
  await expect(page.getByLabel(/^Phone number/)).toHaveValue("+12125551235");
  await expect(page.locator(".optional-event-details")).not.toHaveAttribute("open", "");
  expect(await page.locator("#request input[required],#request textarea[required],#request select[required]").evaluateAll(nodes => nodes.map(node => node.getAttribute("name")).sort())).toEqual(["customer_name", "phone", "privacy_accepted"]);
  await expect(page.getByRole("button", { name: "Send catering request", exact: true })).toBeVisible();
  await page.getByText("Event details (optional)", { exact: true }).click();
  await page.getByLabel(/^Number of guests/).fill("1");
  await page.getByText("Event details (optional)", { exact: true }).click();
  await page.locator("#request form").evaluate(form => {
    if (!(form instanceof HTMLFormElement)) throw new Error("Missing request form");
    form.requestSubmit();
  });
  await expect(page.locator(".optional-event-details")).toHaveAttribute("open", "");
  await expectNoOverflow(page);
});
