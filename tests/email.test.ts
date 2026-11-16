import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildEmail, escapeHtml } from "../src/lib/email";
import { savedRequest, settings } from "./fixtures";
import { buildCateringMenu } from "../scripts/catering-menu";
import pricing from "../supabase/catering-pricing.json";
import { buildWhatsAppMessage } from "../src/lib/whatsapp";
import { eventSchedule } from "../src/lib/request-display";

beforeEach(() => vi.stubEnv("EMAIL_LOGO_URL", ""));
afterEach(() => vi.unstubAllEnvs());

describe("complete restaurant and customer notifications", () => {
  it("handles contact-only enquiries in email and WhatsApp without fake values, broken links or null crashes", () => {
    const request = { ...savedRequest, email: null, event_type: null, event_date: null, event_time: null, guests: null, fulfillment: null, preferred_contact: "phone" as const };
    const message = buildEmail(request, settings, "owner@example.com", "staff", "https://catering.example.com", "notify@example.com");
    expect(message.text).toContain("Event: Not provided");
    expect(message.text).toContain("Guests: Not provided");
    expect(message.text).toContain("Email: Not provided");
    expect(message.html).not.toContain('href="mailto:null');
    expect(message.html).not.toContain("Pickup location");
    expect(message.html).toContain("Call the mobile number");
    expect(message.reply_to).toBe(settings.email);
    expect(message.subject).not.toContain("null");
    const whatsapp = buildWhatsAppMessage(request, "+12125551234", "https://catering.example.com", "test", "en_US");
    expect(whatsapp.template.components[0].parameters[2].text).toBe("Not provided");
    expect(whatsapp.template.components[0].parameters[3].text).toContain("Not provided");
    expect(eventSchedule("2027-06-20", null, settings.timezone)).toContain("time not provided");
    expect(eventSchedule(null, "12:30", settings.timezone)).toContain("Date not provided");
  });
  it("formats package inclusions and portions as lists and aligned rows rather than a dense paragraph", () => {
    const description = buildCateringMenu(pricing)[0].description;
    const message = buildEmail({ ...savedRequest, items: [{ ...savedRequest.items[0], description }] }, settings, "owner@example.com", "staff", "https://catering.example.com", "notify@example.com");
    expect(message.html).toContain('aria-label="Approximate package portions"');
    expect(message.html).toContain("<li");
    expect(message.html).toContain("2 veg appetizers</li>");
    expect(message.html).not.toContain("2 veg appetizers; 2 veg entrees");
    for (const part of [message.text, message.html]) {
      expect(part).toContain("Jumbo / 57 oz each (2 listed portions)");
      expect(part).toContain("10 naan cut into 4");
      expect(part).toContain("10 parotta/chapathi cut into 2");
      expect(part).toContain("Paneer: one entree only");
    }
    expect(message.text).toContain("Appetizers: Jumbo / 57 oz each");
  });
  it("includes every submitted detail and the protected dashboard link", () => {
    const message = buildEmail(savedRequest, settings, "owner@example.com", "staff", "https://catering.example.com", "Kitchen <notify@example.com>");
    for (const text of [savedRequest.reference, savedRequest.customer_name, savedRequest.email, savedRequest.phone, savedRequest.event_date, savedRequest.event_time, savedRequest.timezone, "25", savedRequest.event_type, "pickup", "Test tray", "2 x", "Hot", "$1.25", "Test note", savedRequest.notes, savedRequest.allergies, "$27.50", `/manager/requests/${savedRequest.id}`]) {
      expect(message.text).toContain(text);
    }
    expect(message.reply_to).toBe(savedRequest.email);
    expect(message.subject).toContain("25 Guests");
    expect(message.subject).toContain(savedRequest.customer_name);
    expect(message.html).toContain("<table");
    expect(message.html).toContain(`href="tel:${savedRequest.phone}"`);
    for (const value of [savedRequest.reference, savedRequest.customer_name, savedRequest.event_date, savedRequest.timezone, savedRequest.notes, savedRequest.allergies, "Test tray", "Hot", "$1.25", "$27.50"]) {
      expect(message.html).toContain(value);
    }
  });
  it("customer receipt points replies to the restaurant and has no staff link", () => {
    const message = buildEmail(savedRequest, settings, savedRequest.email, "customer", "https://catering.example.com", "Kitchen <notify@example.com>");
    expect(message.reply_to).toBe(settings.email);
    expect(message.text).not.toContain("/manager/");
    expect(message.html).not.toContain("/manager/");
    expect(message.text).toContain("not a confirmed food order");
    expect(message.text).toContain(settings.phone);
  });
  it("embeds the real Aahaa logo without relying on localhost or external image downloads", () => {
    const message = buildEmail(savedRequest, settings, "owner@example.com", "staff", "http://localhost:3000", "notify@example.com");
    expect(message.html).toContain('src="cid:aahaa-logo"');
    expect(message.html).toContain('alt="Aahaa Indian Kitchen"');
    expect(message.attachments).toHaveLength(1);
    expect(message.attachments?.[0]).toMatchObject({ filename: "aahaa-logo.png", content_id: "aahaa-logo", content_type: "image/png" });
    expect(Buffer.from(message.attachments![0].content, "base64")).toEqual(readFileSync(resolve("public", "aahaa-logo-email.png")));
    expect(message.html).not.toMatch(/<img[^>]+src="https?:/);
  });
  it("uses a public HTTPS logo without repeating the restaurant name below it", () => {
    vi.stubEnv("EMAIL_LOGO_URL", "https://images.example.com/branding/aahaa.png");
    const message = buildEmail(savedRequest, settings, "owner@example.com", "staff", "http://localhost:3000", "notify@example.com");
    expect(message.html).toContain('src="https://images.example.com/branding/aahaa.png"');
    expect(message.html).not.toContain(">AAHAA INDIAN KITCHEN</p>");
    expect(message.html).toContain('alt="Aahaa Indian Kitchen"');
    expect(message.html).not.toContain("cid:");
    expect(message.attachments).toBeUndefined();
    vi.stubEnv("EMAIL_LOGO_URL", "http://localhost:3000/logo.png");
    expect(() => buildEmail(savedRequest, settings, "owner@example.com", "staff", "http://localhost:3000", "notify@example.com")).toThrow("HTTPS");
  });
  it("clearly separates delivery information and unpriced selections from a confirmed order", () => {
    const request = { ...savedRequest, fulfillment: "delivery" as const, address: "123 Event Lane\nHall <B>", has_unpriced_items: true, items: [{ ...savedRequest.items[0], unit_price_minor: null, total_minor: null }] };
    const message = buildEmail(request, settings, "owner@example.com", "staff", "https://catering.example.com", "notify@example.com");
    expect(message.html).toContain("Delivery address");
    expect(message.html).toContain("123 Event Lane<br>Hall &lt;B&gt;");
    expect(message.html).not.toContain("Pickup location");
    expect(message.html).toContain("Known subtotal (some items need pricing)");
    expect(message.html).toContain("Price on request");
    expect(message.html).toContain("not a confirmed food order");
  });
  it("escapes untrusted customer text in HTML, including instructions", () => {
    const message = buildEmail({ ...savedRequest, notes: '<img src=x onerror="alert(1)">' }, settings, "owner@example.com", "staff", "https://catering.example.com", "notify@example.com");
    expect(message.html).not.toContain("<img src=x");
    expect(message.html).toContain("&lt;img");
    expect(escapeHtml("&<>\"'")).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
  it("includes the immutable package portions, choices, price and preferences in both email formats", () => {
    const request = { ...savedRequest, items: [{ ...savedRequest.items[0], description: "Includes 2 veg appetizers; Jumbo / 57 oz each.", notes: "<script>unsafe</script>" }] };
    const message = buildEmail(request, settings, "owner@example.com", "staff", "https://catering.example.com", "notify@example.com");
    for (const part of [message.text, message.html]) {
      expect(part).toContain("Jumbo / 57 oz each.");
      expect(part).toContain(savedRequest.phone);
      expect(part).toContain("Hot");
      expect(part).toContain("$27.50");
    }
    expect(message.html).not.toContain("<script>unsafe");
    expect(message.html).toContain("&lt;script&gt;");
  });
  it("highlights substitutions without presenting the original price as a revised quote", () => {
    const request = { ...savedRequest, has_unpriced_items: true, items: [{ ...savedRequest.items[0], substitution_request: "Replace rice with <preferred dish>" }] };
    const message = buildEmail(request, settings, "owner@example.com", "staff", "https://catering.example.com", "notify@example.com");
    expect(message.text).toContain("SUBSTITUTION REQUEST: Replace rice with <preferred dish>");
    expect(message.html).toContain("Replace rice with &lt;preferred dish&gt;");
    for (const body of [message.text, message.html]) {
      expect(body).toContain("Base estimate; substitutions need a manager quote");
      expect(body).toContain("increase or decrease");
    }
  });
});
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
