import { describe, expect, it } from "vitest";
import { menuSchema, minorFromDecimal, money, priceCart, requestSchema, settingsSchema, validateEvent } from "../src/lib/validation";
import { input, item, line, settings } from "./fixtures";

describe("authoritative menu calculation", () => {
  it("prices quantities and per-unit modifiers in integer minor units", () => {
    const result = priceCart([line], [item]);
    expect(result.knownSubtotal).toBe(2750);
    expect(result.items[0].unit_price_minor).toBe(1375);
    expect(result.items[0].selections[0].choices[0].label).toBe("Hot");
    expect(result.items[0].notes).toBe("Test note");
  });
  it("preserves unknown prices instead of charging zero", () => {
    const result = priceCart([line], [{ ...item, price_minor: null }]);
    expect(result.hasUnpriced).toBe(true);
    expect(result.items[0].total_minor).toBeNull();
    expect(result.knownSubtotal).toBe(0);
  });
  it("does not include unknown lines in the known subtotal", () => {
    const unpriced = { ...item, id: "5fbff1d8-60eb-4e6c-b211-06438baf7afc", price_minor: null };
    const result = priceCart([line, { ...line, item_id: unpriced.id }], [item, unpriced]);
    expect(result.knownSubtotal).toBe(2750); expect(result.hasUnpriced).toBe(true);
  });
  it.each([0, 1, 3, 2.5, 10002])("rejects quantity %s", quantity => {
    expect(() => priceCart([{ ...line, quantity }], [item])).toThrow(/quantity/);
  });
  it.each([{ available: false }, { published: false }])("rejects unavailable or hidden items", patch => {
    expect(() => priceCart([line], [{ ...item, ...patch }])).toThrow(/available/);
  });
  it("rejects unknown and duplicated choices and unknown groups", () => {
    const cases: Record<string, string[]>[] = [{ spice: ["invalid"] }, { spice: ["hot", "hot"] }, { spice: [] }, { spice: ["hot"], stale: ["a"] }];
    for (const selections of cases) {
      expect(() => priceCart([{ ...line, selections }], [item])).toThrow();
    }
  });
  it("does not mutate the catalog", () => {
    const before = JSON.stringify(item);
    priceCart([line], [item]);
    expect(JSON.stringify(item)).toBe(before);
  });
});

describe("form and menu validation", () => {
  it("accepts a complete valid request", () => expect(requestSchema.parse(input)).toEqual(input));
  it.each([{ privacy_accepted: false }, { guests: 0 }, { phone: "123" }, { email: "bad" }, { event_date: "2027-02-30" }, { website: "spam" }, { items: [] }])("rejects invalid input %j", patch => {
    expect(requestSchema.safeParse({ ...input, ...patch }).success).toBe(false);
  });
  it("allows an unknown delivery address but requires area acknowledgement when an address is supplied", () => {
    expect(requestSchema.safeParse({ ...input, fulfillment: "delivery" }).success).toBe(true);
    expect(requestSchema.safeParse({ ...input, fulfillment: "delivery", address: "Test address" }).success).toBe(false);
    expect(requestSchema.safeParse({ ...input, fulfillment: "delivery", address: "Test address", delivery_area_acknowledged: true }).success).toBe(true);
  });
  it("accepts contact-only enquiries without manufacturing an email or event details", () => {
    const parsed = requestSchema.parse({ customer_name: input.customer_name, phone: input.phone, items: input.items, idempotency_key: input.idempotency_key, privacy_accepted: true });
    expect(parsed).toMatchObject({ email: null, event_type: null, event_date: null, event_time: null, guests: null, fulfillment: null, preferred_contact: "phone" });
    expect(() => validateEvent(parsed, settings)).not.toThrow();
    expect(requestSchema.safeParse({ ...parsed, preferred_contact: "email" }).success).toBe(false);
    expect(requestSchema.safeParse({ ...parsed, phone: "" }).success).toBe(false);
    expect(requestSchema.safeParse({ ...parsed, customer_name: "" }).success).toBe(false);
    expect(requestSchema.safeParse({ ...parsed, privacy_accepted: false }).success).toBe(false);
  });
  it("checks any supplied optional event values without requiring the others", () => {
    const partial = requestSchema.parse({ ...input, email: "", preferred_contact: "phone", event_type: "", event_date: "2027-06-20", event_time: "", guests: "", fulfillment: "" });
    expect(partial.event_time).toBeNull();
    expect(() => validateEvent(partial, settings, new Date("2027-06-01"))).not.toThrow();
    expect(() => validateEvent({ ...partial, event_date: "2027-05-01" }, settings, new Date("2027-06-01"))).toThrow(/notice/);
    expect(() => validateEvent({ ...partial, guests: 2 }, settings, new Date("2027-06-01"))).toThrow(/guests/);
  });
  it("requires WhatsApp consent only when WhatsApp is preferred", () => {
    expect(requestSchema.safeParse({ ...input, preferred_contact: "whatsapp" }).success).toBe(false);
    expect(requestSchema.safeParse({ ...input, preferred_contact: "whatsapp", whatsapp_consent: true }).success).toBe(true);
  });
  it("validates unique group IDs and choice limits", () => {
    expect(menuSchema.safeParse({ ...item, options: [item.options[0], item.options[0]] }).success).toBe(false);
    expect(menuSchema.safeParse({ ...item, options: [{ ...item.options[0], max: 4 }] }).success).toBe(false);
  });
  it("validates real settings and rejects invalid timezones and incomplete launch settings", () => {
    expect(settingsSchema.safeParse(settings).success).toBe(true);
    expect(settingsSchema.safeParse({ ...settings, timezone: "Mars/Base" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...settings, privacy_notice: "" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...settings, currency: "XXX" }).success).toBe(false);
  });
});

describe("event time and service rules", () => {
  it("allows exactly the minimum lead time in the business timezone", () => {
    expect(() => validateEvent(input, settings, new Date("2027-06-18T17:30:00Z"))).not.toThrow();
    expect(() => validateEvent(input, settings, new Date("2027-06-18T17:30:01Z"))).toThrow(/notice/);
  });
  it("handles UTC date changes correctly", () => {
    expect(() => validateEvent({ ...input, event_date: "2027-06-20", event_time: "00:30" }, { ...settings, timezone: "Asia/Kolkata", lead_hours: 1 }, new Date("2027-06-19T17:59:00Z"))).not.toThrow();
  });
  it("rejects nonexistent and ambiguous DST times", () => {
    expect(() => validateEvent({ ...input, event_date: "2027-03-14", event_time: "02:30" }, settings, new Date("2027-01-01"))).toThrow(/daylight-saving/);
    expect(() => validateEvent({ ...input, event_date: "2027-11-07", event_time: "01:30" }, settings, new Date("2027-01-01"))).toThrow(/daylight-saving/);
  });
  it("rejects paused requests, guest limits and disabled delivery", () => {
    const now = new Date("2027-01-01");
    expect(() => validateEvent(input, { ...settings, accepting_requests: false }, now)).toThrow(/paused/);
    expect(() => validateEvent({ ...input, guests: 2 }, settings, now)).toThrow(/guests/);
    expect(() => validateEvent({ ...input, fulfillment: "delivery" }, { ...settings, delivery_enabled: false }, now)).toThrow(/fulfillment/);
  });
});

describe("currency precision", () => {
  it("converts decimals without float rounding errors", () => {
    expect(minorFromDecimal("10.10", "USD")).toBe(1010);
    expect(minorFromDecimal("0.29", "USD")).toBe(29);
    expect(minorFromDecimal("", "USD")).toBeNull();
    expect(() => minorFromDecimal("1.001", "USD")).toThrow();
  });
  it("supports zero- and three-decimal currencies", () => {
    expect(minorFromDecimal("100", "JPY")).toBe(100);
    expect(() => minorFromDecimal("100.2", "JPY")).toThrow();
    expect(minorFromDecimal("1.123", "KWD")).toBe(1123);
    expect(money(100, "JPY")).toContain("100");
  });
});
