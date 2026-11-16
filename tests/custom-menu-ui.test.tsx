// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Storefront } from "../src/components/storefront";
import { MenuEditor } from "../src/components/menu-editor";
import { priceCart } from "../src/lib/validation";
import { customMenu, settings } from "./fixtures";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next/image", () => ({ default: ({ priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => { void priority; return React.createElement("img", props); } }));
vi.mock("next/script", () => ({ default: () => null }));
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  Element.prototype.scrollIntoView = vi.fn();
});
beforeEach(() => { sessionStorage.clear(); vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", ""); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const storefront = () => <Storefront menu={[customMenu]} settings={settings} canSubmit problem={null} cateringMenu menuOnly />;

it("builds from category dropdowns, supports skipped categories, prevents duplicates and retains saved edits", async () => {
  const view = render(storefront());
  fireEvent.click(screen.getByRole("button", { name: customMenu.name }));
  let modal = screen.getByRole("dialog");
  fireEvent.click(within(modal).getByRole("button", { name: /Add to your gathering/ }));
  expect(within(modal).getByRole("alert").textContent).toContain("Choose at least one dish");
  fireEvent.change(within(modal).getByLabelText("Appetizers - choice 2"), { target: { value: "paneer" } });
  expect((within(modal).getByLabelText("Appetizers - choice 1").querySelector('option[value="paneer"]') as HTMLOptionElement).disabled).toBe(true);
  fireEvent.change(within(modal).getByLabelText(/Special instructions/), { target: { value: "Discuss portions for 35 guests." } });
  fireEvent.click(within(modal).getByRole("button", { name: /Add to your gathering/ }));
  let cart = screen.getByRole("complementary", { name: "Your catering request" });
  expect(within(cart).getByText("Paneer 65")).toBeTruthy();
  expect(within(cart).getByText("Discuss portions for 35 guests.")).toBeTruthy();
  view.unmount();
  render(storefront());
  cart = screen.getByRole("complementary", { name: "Your catering request" });
  fireEvent.click(within(cart).getByRole("button", { name: "Edit" }));
  modal = screen.getByRole("dialog");
  expect((within(modal).getByLabelText("Appetizers - choice 1") as HTMLSelectElement).value).toBe("paneer");
  expect((within(modal).getByLabelText("Biryani - choice 1") as HTMLSelectElement).value).toBe("");
  expect(within(modal).queryByText("Included")).toBeNull();
  fireEvent.change(within(modal).getByLabelText("Biryani - choice 1"), { target: { value: "veg" } });
  fireEvent.click(within(modal).getByRole("button", { name: /Update selection/ }));
  expect(within(cart).getByText("Veg Biryani")).toBeTruthy();
});

it("sends selected custom categories through the real request form and displays the quoted-price receipt", async () => {
  const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    const priced = priceCart(body.items, [customMenu]);
    return Response.json({ reference: "CAT-CUSTOM-TEST", ...priced, currency: "USD" }, { status: 201 });
  });
  vi.stubGlobal("fetch", fetcher);
  render(storefront());
  fireEvent.click(screen.getByRole("button", { name: customMenu.name }));
  const modal = screen.getByRole("dialog");
  fireEvent.change(within(modal).getByLabelText("Biryani - choice 1"), { target: { value: "veg" } });
  fireEvent.click(within(modal).getByRole("button", { name: /Add to your gathering/ }));
  fireEvent.click(screen.getByRole("button", { name: "Send without event details" }));
  fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: "Custom Customer" } });
  fireEvent.change(screen.getByLabelText(/Phone number/), { target: { value: "+12125551234" } });
  fireEvent.click(screen.getByLabelText(/I have read/));
  fireEvent.click(screen.getByRole("button", { name: "Send catering request" }));
  await screen.findByText("CAT-CUSTOM-TEST");
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(JSON.parse(String(fetcher.mock.calls[0][1].body)).items[0]).toMatchObject({ item_id: customMenu.id, selections: { biryani: ["veg"] } });
  expect(screen.getByText("Biryani: Veg Biryani")).toBeTruthy();
  expect(screen.getAllByText("Price on request").length).toBeGreaterThan(0);
});

it("lets staff retain and update custom menu categories through the existing editor", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetcher);
  render(<MenuEditor item={customMenu} currency="USD" />);
  expect((screen.getByLabelText("Build-your-own catering menu with category dropdowns") as HTMLInputElement).checked).toBe(true);
  fireEvent.change(screen.getAllByLabelText("Group name")[0], { target: { value: "Veg starters" } });
  fireEvent.change(screen.getAllByLabelText("Choice")[0], { target: { value: "Updated dish" } });
  fireEvent.click(screen.getByLabelText("Manager quote required for Updated dish"));
  fireEvent.click(screen.getByRole("button", { name: "Save menu item" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.item).toMatchObject({ is_custom_menu: true, price_minor: null, options: [{ name: "Veg starters", choices: [{ label: "Updated dish", requires_quote: true }, {}] }, {}] });
});

it("places Customized last and filters packages while keeping the standalone builder available", () => {
  const packageItem = { ...customMenu, id: "a1bba29b-e709-4099-91fd-d86ff08bbfcb", is_custom_menu: false, category: "Aahaa Veg Package", name: "Veg package", price_minor: 32000 };
  render(<Storefront menu={[packageItem, customMenu]} settings={settings} canSubmit problem={null} cateringMenu menuOnly />);
  const tabs = screen.getByLabelText("Menu categories");
  expect(within(tabs).getAllByRole("button").at(-1)?.textContent).toBe("Customized");
  fireEvent.click(within(tabs).getByRole("button", { name: "Customized" }));
  expect(screen.queryByRole("button", { name: "Customise Veg package" })).toBeNull();
  expect(screen.getByRole("button", { name: customMenu.name })).toBeTruthy();
  expect(screen.queryByText("No dishes found")).toBeNull();
});

it("marks fixed-package customized selections for manager quoting without changing the base price", () => {
  const packageItem = {
    ...customMenu, is_custom_menu: false, name: "Veg package", price_minor: 32000,
    options: [{ id: "bread", name: "Bread", min: 1, max: 1, choices: [
      { id: "naan", label: "Naan", price_minor: 0 },
      { id: "customized", label: "Customized - manager review", price_minor: 0, requires_quote: true },
    ] }],
  };
  render(<Storefront menu={[packageItem]} settings={settings} canSubmit problem={null} cateringMenu menuOnly />);
  fireEvent.click(screen.getByRole("button", { name: "Customise Veg package" }));
  const modal = screen.getByRole("dialog");
  fireEvent.click(within(modal).getByRole("checkbox", { name: "Customized - manager review Quote required" }));
  expect(within(modal).getByRole("status").textContent).toContain("base estimate only");
  fireEvent.change(within(modal).getByLabelText(/Special instructions/), { target: { value: "Please discuss a different bread." } });
  fireEvent.click(within(modal).getByRole("button", { name: /Add to your gathering/ }));
  const cart = screen.getByRole("complementary", { name: "Your catering request" });
  expect(within(cart).getByText("Customized - manager review")).toBeTruthy();
  expect(within(cart).getByText(/Manager review and revised quote required/)).toBeTruthy();
  expect(within(cart).getByText("Base estimate; substitutions need a manager quote")).toBeTruthy();
  expect(within(cart).getAllByText("$320.00").length).toBeGreaterThan(0);
});
