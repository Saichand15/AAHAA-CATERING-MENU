import { describe, expect, it } from "vitest";
import { buildEmail, escapeHtml } from "../src/lib/email";
import { savedRequest, settings } from "./fixtures";

describe("complete restaurant and customer notifications", () => {
  it("includes every submitted detail and the protected dashboard link", () => {
    const message = buildEmail(savedRequest, settings, "owner@example.com", "staff", "https://catering.example.com", "Kitchen <notify@example.com>");
    for (const text of [savedRequest.reference, savedRequest.customer_name, savedRequest.email, savedRequest.phone, savedRequest.event_date, savedRequest.event_time, savedRequest.timezone, "25", savedRequest.event_type, "pickup", "Test tray", "2 x", "Hot", "$1.25", "Test note", savedRequest.notes, savedRequest.allergies, "$27.50", `/manager/requests/${savedRequest.id}`]) {
      expect(message.text).toContain(text);
    }
    expect(message.reply_to).toBe(savedRequest.email);
    expect(message.subject).toContain("25 Guests");
  });
  it("customer receipt points replies to the restaurant and has no staff link", () => {
    const message = buildEmail(savedRequest, settings, savedRequest.email, "customer", "https://catering.example.com", "Kitchen <notify@example.com>");
    expect(message.reply_to).toBe(settings.email);
    expect(message.text).not.toContain("/manager/");
    expect(message.text).toContain("not a confirmed food order");
    expect(message.text).toContain(settings.phone);
  });
  it("escapes untrusted customer text in HTML, including instructions", () => {
    const message = buildEmail({ ...savedRequest, notes: '<img src=x onerror="alert(1)">' }, settings, "owner@example.com", "staff", "https://catering.example.com", "notify@example.com");
    expect(message.html).not.toContain("<img src=x");
    expect(message.html).toContain("&lt;img");
    expect(escapeHtml("&<>\"'")).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});
