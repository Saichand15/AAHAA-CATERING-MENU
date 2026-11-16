// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Storefront } from "../src/components/storefront";
import { item, savedRequest, settings } from "./fixtures";
import pricing from "../supabase/catering-pricing.json";
import { buildCateringMenu } from "../scripts/catering-menu";
import { cateringDraftKey } from "../src/components/use-catering-draft";

vi.mock("next/image", () => ({
  default: ({ priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
    void priority;
    return React.createElement("img", props);
  },
}));
vi.mock("next/script", () => ({ default: () => null }));
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  Element.prototype.scrollIntoView = vi.fn();
});
beforeEach(() => { sessionStorage.clear(); vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", ""); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

function addItem() {
  fireEvent.click(screen.getByRole("button", { name: "Customise Test tray" }));
  const modal = screen.getByRole("dialog");
  fireEvent.click(within(modal).getByLabelText(/Hot/));
  fireEvent.change(within(modal).getByLabelText(/Special instructions/), { target: { value: "Keep separately packed" } });
  fireEvent.click(within(modal).getByRole("button", { name: /Add to your gathering/ }));
}
function fillRequest() {
  fireEvent.click(screen.getByRole("button", { name: /Add event details/ }));
  for (const [name, value] of [
    [/Full name/, "Test Customer"], [/Email address/, "customer@example.com"], [/Phone number/, "+12125551235"],
    [/Number of guests/, "25"], [/Event date/, "2099-06-20"], [/Event time/, "12:30"],
  ] as const) fireEvent.change(screen.getByLabelText(name), { target: { value } });
  fireEvent.change(screen.getByRole("combobox", { name: /^Occasion/ }), { target: { value: "Family celebration" } });
  fireEvent.change(screen.getByLabelText(/Dietary or allergy requirements/), { target: { value: "Avoid peanuts" } });
  fireEvent.change(screen.getByLabelText(/Anything else/), { target: { value: "Call at the entrance" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /I have read/ }));
}
const success = () => Response.json({ reference: savedRequest.reference, items: savedRequest.items, currency: "USD", knownSubtotal: 2750, hasUnpriced: false }, { status: 201 });

describe("customer request flow", () => {
  it("offers a quick-send path requiring only name, mobile and privacy consent", async () => {
    const fetcher = vi.fn().mockResolvedValue(success());
    vi.stubGlobal("fetch", fetcher);
    const view = render(<Storefront settings={settings} menu={[item]} canSubmit problem={null} menuOnly />);
    addItem();
    fireEvent.click(screen.getByRole("button", { name: "Send without event details" }));
    expect(screen.queryByText(/Draft saved in this browser tab/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Clear saved draft" })).toBeNull();
    expect(screen.queryByText(/saved in this tab/)).toBeNull();
    expect(screen.getByRole("heading", { name: "Send your menu to our team." })).toBeTruthy();
    const optional = screen.getByText("Event details (optional)").closest("details")!;
    expect(optional.open).toBe(false);
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: "Quick Customer" } });
    fireEvent.change(screen.getByLabelText(/Phone number/), { target: { value: "+12125551235" } });
    view.unmount();
    render(<Storefront settings={settings} menu={[item]} canSubmit problem={null} menuOnly />);
    expect(screen.getByText("Event details (optional)").closest("details")!.open).toBe(false);
    expect((screen.getByLabelText(/Full name/) as HTMLInputElement).value).toBe("Quick Customer");
    fireEvent.click(screen.getByLabelText(/I have read/));
    fireEvent.click(screen.getByRole("button", { name: /Send catering request/ }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body).toMatchObject({ customer_name: "Quick Customer", phone: "+12125551235", email: null, guests: null, event_type: null, event_date: null, event_time: null, fulfillment: null });
    expect(screen.getByText(/No email address was provided/)).toBeTruthy();
  });
  it("restores mixed-menu selections and event details after remounting and retains a failed submission key", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("Connection interrupted"));
    vi.stubGlobal("fetch", fetcher);
    const packages = buildCateringMenu(pricing);
    const catalog = [item, ...packages];
    const view = render(<Storefront settings={settings} menu={[item]} cartMenu={catalog} canSubmit problem={null} menuOnly />);
    addItem();
    fillRequest();
    fireEvent.click(screen.getByRole("button", { name: /Send catering request/ }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("button", { name: /Send catering request/ }).hasAttribute("disabled")).toBe(false));
    const first = JSON.parse(fetcher.mock.calls[0][1].body);
    view.unmount();
    render(<Storefront settings={settings} menu={packages} cartMenu={catalog} canSubmit problem={null} menuOnly cateringMenu />);
    expect(within(screen.getByRole("complementary", { name: "Your catering request" })).getByText("Test tray")).toBeTruthy();
    expect((screen.getByLabelText(/Full name/) as HTMLInputElement).value).toBe("Test Customer");
    expect((screen.getByLabelText(/Anything else/) as HTMLTextAreaElement).value).toBe("Call at the entrance");
    expect((screen.getByLabelText(/I have read/) as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByLabelText(/I have read/));
    fireEvent.click(screen.getByRole("button", { name: /Send catering request/ }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetcher.mock.calls[1][1].body).idempotency_key).toBe(first.idempotency_key);
  });
  it("keeps unavailable selections visible and removable instead of crashing or silently dropping them", () => {
    const view = render(<Storefront settings={settings} menu={[item]} canSubmit problem={null} menuOnly />);
    addItem();
    view.unmount();
    render(<Storefront settings={settings} menu={[]} canSubmit problem={null} menuOnly />);
    expect(screen.getByRole("alert").textContent).toContain("no longer available");
    expect(screen.getByRole("button", { name: /Add event details/ }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Remove Saved menu selection" }));
    expect(screen.getByText("Start with something delicious")).toBeTruthy();
  });
  it("lets customers retain event drafts while submissions are paused without pretending to send", () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    render(<Storefront settings={settings} menu={[item]} canSubmit={false} problem="Requests paused" menuOnly />);
    addItem();
    fillRequest();
    expect(screen.getByRole("button", { name: /Send catering request/ }).hasAttribute("disabled")).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("shows an explicit warning when browser draft storage is unavailable", () => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage blocked"); });
    render(<Storefront settings={settings} menu={[item]} canSubmit problem={null} menuOnly />);
    expect(screen.getByRole("alert").textContent).toContain("could not save this draft");
    expect(logger).toHaveBeenCalled();
  });
  it("preserves the successful reference on refresh without resending and clears it only when starting again", async () => {
    const fetcher = vi.fn().mockResolvedValue(success());
    vi.stubGlobal("fetch", fetcher);
    const view = render(<Storefront settings={settings} menu={[item]} canSubmit problem={null} menuOnly />);
    addItem();
    fillRequest();
    fireEvent.click(screen.getByRole("button", { name: /Send catering request/ }));
    await waitFor(() => expect(screen.getByText(savedRequest.reference)).toBeTruthy());
    view.unmount();
    render(<Storefront settings={settings} menu={[item]} canSubmit problem={null} menuOnly />);
    expect(screen.getByText(savedRequest.reference)).toBeTruthy();
    expect(fetcher).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Start a new request" }));
    expect(screen.queryByText(savedRequest.reference)).toBeNull();
    expect(JSON.parse(sessionStorage.getItem(cateringDraftKey)!).receipt).toBeNull();
  });
  it("welcomes visitors with a branded intro without a skip button", () => {
    const { container } = render(<Storefront settings={settings} menu={[item]} canSubmit problem={null} />);
    expect(container.querySelector(".welcome-screen")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Skip intro" })).toBeNull();
  });
  it("presents catering-only branding and no table reservation actions", () => {
    const { container } = render(<Storefront settings={settings} menu={[item]} canSubmit problem={null} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Your event.Our catering.");
    expect(screen.getByText("Catering enquiries only. No dine-in or table reservations.")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Choose a menu/ }).some(link => link.getAttribute("href") === "#menu-categories")).toBe(true);
    expect(screen.getByRole("link", { name: /Explore catering menu/ }).getAttribute("href")).toBe("/catering-menu");
    expect(screen.getAllByRole("link", { name: /Browse regular menu/ }).some(link => link.getAttribute("href") === "/menu")).toBe(true);
    expect(screen.queryByRole("button", { name: "Customise Test tray" })).toBeNull();
    expect(screen.getByRole("img", { name: /Paneer and peppers from Aahaa/ }).getAttribute("src")).toBe("/aahaa-catering-banner.webp");
    expect(screen.getByRole("img", { name: /Halwa dessert/ })).toBeTruthy();
    expect(container.querySelectorAll(".hero-steam span")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /reserve|book a table/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /reserve|book a table/i })).toBeNull();
  });
  it("does not offer fake submission when services are missing", () => {
    render(<Storefront settings={null} menu={[]} canSubmit={false} problem="Services are not configured." menuOnly />);
    expect(screen.getByText("Services are not configured.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Add event details/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByRole("button", { name: "Send catering request" })).toBeNull();
  });
  it("labels restaurant-menu prices as references and shows quote-required instead of a zero-priced catering order", () => {
    render(<Storefront settings={settings} menu={[{ ...item, unit: "serving", price_minor: null, description: "Listed restaurant price: $10.99 (for reference only, not a catering quote)." }]} canSubmit problem={null} menuOnly />);
    expect(screen.getByRole("heading", { name: "Explore the regular menu." })).toBeTruthy();
    expect(screen.getByText(/Restaurant menu prices are for reference only/)).toBeTruthy();
    expect(screen.getByText(/Serving quantities are not catering tray portions/)).toBeTruthy();
    expect(screen.queryByText("Restaurant menu for catering planning")).toBeNull();
    expect(screen.queryByText(/temporary/i)).toBeNull();
    expect(screen.queryByText(/Aahaa catering & bulk orders/)).toBeNull();
    addItem();
    const cart = within(screen.getByRole("complementary", { name: "Your catering request" }));
    expect(cart.getByText("Quote required")).toBeTruthy();
    expect(cart.queryByText("$0.00")).toBeNull();
    expect(cart.getByText(/serving/)).toBeTruthy();
  });
  it("shows verified restaurant details and links to the official restaurant menu", () => {
    render(<Storefront settings={{ ...settings, hours: "Monday: Closed\nTuesday: 11 AM – 2:30 PM, 5 PM – 10 PM" }} menu={[item]} canSubmit={false} problem="Online requests are paused." />);
    expect(screen.getAllByText(/Test postal area/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /View the restaurant menu/ }).getAttribute("href")).toBe("https://aahaaindiankitchen.com/indian-restaurant-menu");
    const hours = screen.getByText("Restaurant hours").parentElement;
    expect(hours?.querySelectorAll("li")).toHaveLength(2);
    expect(hours?.textContent).toContain("Tuesday: 11 AM");
  });
  it("includes the official footer details and keeps navigation in the catering app", () => {
    render(<Storefront settings={settings} menu={[item]} canSubmit={false} problem="Online requests are paused." />);
    const footer = within(screen.getByRole("contentinfo"));
    expect(footer.getByRole("link", { name: "+1 847-777-8122" }).getAttribute("href")).toBe("tel:+18477778122");
    expect(footer.getByRole("link", { name: "Aahaa on Instagram" }).getAttribute("href")).toBe("https://www.instagram.com/aahaaindiankitchen/");
    expect(footer.getByText("Opening hours")).toBeTruthy();
    expect(footer.getByText("Food allergies & dietary needs")).toBeTruthy();
    expect(footer.getByRole("link", { name: /Build your enquiry/ }).getAttribute("href")).toBe("/catering-menu#menu");
    expect(footer.getByRole("link", { name: /Restaurant terms/ }).getAttribute("href")).toBe("https://aahaaindiankitchen.com/terms");
    expect(screen.getByText(/Kitchen closes 15 minutes before closing\. Catering/)).toBeTruthy();
  });
  it("offers accessible catering FAQs without promising an order confirmation", () => {
    const { container } = render(<Storefront settings={settings} menu={[item]} canSubmit={false} problem={null} />);
    const faq = container.querySelector("#catering-questions");
    expect(faq?.querySelectorAll("details")).toHaveLength(4);
    expect(faq?.textContent).toContain("This app does not collect payment.");
    expect(screen.getByText("Does submitting an enquiry confirm my order?")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Catering questions" }).getAttribute("href")).toBe("/#catering-questions");
  });
  it("customizes a real catalog item and sends all form details", async () => {
    const fetcher = vi.fn().mockResolvedValue(success());
    vi.stubGlobal("fetch", fetcher);
    render(<Storefront settings={settings} menu={[item]} canSubmit problem={null} menuOnly />);
    addItem();
    expect(within(screen.getByRole("complementary", { name: "Your catering request" })).getByText("Keep separately packed")).toBeTruthy();
    fillRequest();
    fireEvent.click(screen.getByRole("button", { name: /Send catering request/ }));
    await waitFor(() => expect(screen.getByText(savedRequest.reference)).toBeTruthy());
    expect(JSON.parse(sessionStorage.getItem(cateringDraftKey)!).cart).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const submitted = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(submitted.items[0].selections).toEqual({ spice: ["hot"] });
    expect(submitted.items[0].quantity).toBe(2);
    expect(submitted.items[0].notes).toBe("Keep separately packed");
    expect(submitted.allergies).toBe("Avoid peanuts");
    expect(submitted.notes).toBe("Call at the entrance");
    expect(submitted.privacy_accepted).toBe(true);
    expect(screen.getByText(/This is a catering enquiry, not a confirmed food order/)).toBeTruthy();
  });
  it("filters catering sizes and submits the actual package choices at the published price", async () => {
    const packages = buildCateringMenu(pricing);
    const chosen = packages.find(p => p.name === "Aahaa Veg Package - 20 guests")!;
    const fetcher = vi.fn().mockResolvedValue(Response.json({
      reference: savedRequest.reference, items: [{ ...savedRequest.items[0], name: chosen.name, total_minor: 32000 }],
      currency: "USD", knownSubtotal: 32000, hasUnpriced: false,
    }, { status: 201 }));
    vi.stubGlobal("fetch", fetcher);
    render(<Storefront settings={settings} menu={packages} canSubmit problem={null} menuOnly cateringMenu />);
    expect(screen.queryByRole("link", { name: "View original catering price sheet (PDF)" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Talk with AAHAA team." })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Customise/ })).toHaveLength(21);
    fireEvent.change(screen.getByRole("combobox", { name: /^Party size/ }), { target: { value: "20 guests" } });
    expect(screen.getAllByRole("button", { name: /^Customise/ })).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: `Customise ${chosen.name}` }));
    const modal = within(screen.getByRole("dialog"));
    fireEvent.click(modal.getByLabelText("Veg Biryani", { exact: false }));
    fireEvent.click(modal.getByLabelText("Jeera Rice", { exact: false }));
    fireEvent.click(modal.getByLabelText("Sambar", { exact: false }));
    fireEvent.click(modal.getByLabelText("Butter Naan", { exact: false }));
    fireEvent.click(modal.getByLabelText("Gulab Jamun", { exact: false }));
    fireEvent.click(modal.getByRole("checkbox", { name: "Request substitutions to the included menu" }));
    fireEvent.change(modal.getByLabelText("Requested substitutions"), { target: { value: "Replace rice with a preferred dish; manager to quote" } });
    fireEvent.change(modal.getByLabelText("Special instructions", { exact: false }), { target: { value: "Appetizers: gobi, veg cutlet. Entrees: paneer and dal." } });
    fireEvent.click(modal.getByRole("button", { name: /Add to your gathering/ }));
    expect(within(screen.getByRole("complementary", { name: "Your catering request" })).getAllByText("$320.00").length).toBeGreaterThan(0);
    fillRequest();
    fireEvent.click(screen.getByRole("button", { name: /Send catering request/ }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    const submitted = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(submitted.items[0]).toMatchObject({ item_id: chosen.id, quantity: 1, selections: { biryani: ["biryani_0"], rice: ["rice_1"], curry: ["curry_0"], bread: ["bread_1"], dessert: ["dessert_3"] } });
    expect(submitted.items[0].notes).toContain("Appetizers:");
    expect(submitted.items[0].substitution_request).toBe("Replace rice with a preferred dish; manager to quote");
    expect(submitted.customer_name).toBe("Test Customer");
    expect(submitted.phone).toBe("+12125551235");
    expect(submitted.items[0].price_minor).toBeUndefined();
  });
  it("preserves substitution requests when editing and removes the quote flag when the customer returns to the included menu", () => {
    const packages = buildCateringMenu(pricing);
    const chosen = packages[0];
    render(<Storefront settings={settings} menu={packages} canSubmit problem={null} menuOnly cateringMenu />);
    fireEvent.click(screen.getByRole("button", { name: `Customise ${chosen.name}` }));
    const dialog = within(screen.getByRole("dialog"));
    for (const group of chosen.options) fireEvent.click(dialog.getByLabelText(group.choices[0].label, { exact: false }));
    fireEvent.click(dialog.getByRole("checkbox", { name: "Request substitutions to the included menu" }));
    fireEvent.submit(dialog.getByRole("button", { name: /Add to your gathering/ }).closest("form")!);
    expect(dialog.getByRole("alert").textContent).toContain("Describe the default item");
    fireEvent.change(dialog.getByLabelText("Requested substitutions"), { target: { value: "Replace rice with noodles" } });
    fireEvent.click(dialog.getByRole("button", { name: /Add to your gathering/ }));
    const cart = within(screen.getByRole("complementary", { name: "Your catering request" }));
    expect(cart.getByText("Base estimate; substitutions need a manager quote")).toBeTruthy();
    expect(cart.getByText(/Replace rice with noodles/)).toBeTruthy();
    fireEvent.click(cart.getByRole("button", { name: "Edit" }));
    expect((dialog.getByLabelText("Requested substitutions") as HTMLTextAreaElement).value).toBe("Replace rice with noodles");
    fireEvent.click(dialog.getByRole("checkbox", { name: "Request substitutions to the included menu" }));
    fireEvent.click(dialog.getByRole("button", { name: "Update selection" }));
    expect(cart.queryByText(/Replace rice with noodles/)).toBeNull();
    expect(cart.getByText("Menu estimate")).toBeTruthy();
  });
  it("retains entered details on a network failure and retries with the same idempotency key", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("Connection interrupted")).mockResolvedValueOnce(success());
    vi.stubGlobal("fetch", fetcher);
    render(<Storefront settings={settings} menu={[item]} canSubmit problem={null} menuOnly />);
    addItem(); fillRequest();
    fireEvent.click(screen.getByRole("button", { name: /Send catering request/ }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Connection interrupted"));
    expect((screen.getByLabelText(/Full name/) as HTMLInputElement).value).toBe("Test Customer");
    expect(screen.queryByText(savedRequest.reference)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Send catering request/ }));
    await waitFor(() => expect(screen.getByText(savedRequest.reference)).toBeTruthy());
    const first = JSON.parse(fetcher.mock.calls[0][1].body);
    const second = JSON.parse(fetcher.mock.calls[1][1].body);
    expect(first.idempotency_key).toBe(second.idempotency_key);
  });
  it("validates required customization before adding", () => {
    render(<Storefront settings={settings} menu={[item]} canSubmit problem={null} menuOnly />);
    fireEvent.click(screen.getByRole("button", { name: "Customise Test tray" }));
    fireEvent.click(screen.getByRole("button", { name: /Add to your gathering/ }));
    expect(screen.getByRole("alert").textContent).toContain("Choose 1");
  });
});
