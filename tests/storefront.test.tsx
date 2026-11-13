// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Storefront } from "../src/components/storefront";
import { item, savedRequest, settings } from "./fixtures";

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
beforeEach(() => { vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", ""); });
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
    expect(screen.getByRole("img", { name: /AI-generated catering inspiration/ })).toBeTruthy();
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
  it("customizes a real catalog item and sends all form details", async () => {
    const fetcher = vi.fn().mockResolvedValue(success());
    vi.stubGlobal("fetch", fetcher);
    render(<Storefront settings={settings} menu={[item]} canSubmit problem={null} menuOnly />);
    addItem();
    expect(within(screen.getByRole("complementary", { name: "Your catering request" })).getByText("Keep separately packed")).toBeTruthy();
    fillRequest();
    fireEvent.click(screen.getByRole("button", { name: /Send catering request/ }));
    await waitFor(() => expect(screen.getByText(savedRequest.reference)).toBeTruthy());
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
