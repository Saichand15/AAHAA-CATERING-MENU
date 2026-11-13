import type { BusinessSettings, CateringRequest } from "./types";
import { money } from "./validation";

export type EmailMessage = { from: string; to: string[]; reply_to: string; subject: string; text: string; html: string };
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
export function buildEmail(r: CateringRequest, s: BusinessSettings, recipient: string, audience: "staff" | "customer", origin: string, sender: string): EmailMessage {
  const staff = audience === "staff";
  const title = staff ? "New catering request" : "We received your catering request";
  const lines = [
    `${title} - ${r.reference}`,
    "",
    staff ? "A customer has submitted the following catering requirements." : `Hello ${r.customer_name}, your request has been saved. Our team will contact you to discuss availability, pricing and arrangements.`,
    "This is a catering enquiry, not a confirmed food order. No payment has been taken.",
    "",
    `Reference: ${r.reference}`,
    `Submitted: ${r.created_at}`,
    `Customer: ${r.customer_name}`,
    `Email: ${r.email}`,
    `Phone: ${r.phone}`,
    `Preferred contact: ${r.preferred_contact}`,
    `WhatsApp consent: ${r.whatsapp_consent ? "Yes, for this enquiry" : "Not given"}`,
    `Occasion: ${r.event_type}`,
    `Event: ${r.event_date} at ${r.event_time.slice(0, 5)} (${r.timezone})`,
    `Guests: ${r.guests}`,
    `Service: ${r.fulfillment}`,
    ...(r.address ? [`Delivery address: ${r.address}`] : [`Pickup location: ${s.address}`]),
    "",
    "REQUESTED MENU",
    ...r.items.flatMap(item => [
      `${item.quantity} x ${item.name} (per ${item.unit}) - ${item.total_minor === null ? "Price on request" : money(item.total_minor, r.currency)}`,
      ...item.selections.filter(g => g.choices.length).map(g => `  ${g.group}: ${g.choices.map(c => `${c.label}${c.price_minor ? ` (+${money(c.price_minor, r.currency)} per unit)` : ""}`).join(", ")}`),
      ...(item.notes ? [`  Item instructions: ${item.notes}`] : []),
    ]),
    "",
    `${r.has_unpriced_items ? "Known subtotal; additional items need pricing" : "Menu estimate"}: ${money(r.known_subtotal_minor, r.currency)}`,
    "Final prices, taxes, delivery and availability require restaurant confirmation.",
    "",
    `Dietary/allergy requests: ${r.allergies || "None specified"}`,
    `Event instructions: ${r.notes || "None specified"}`,
    "",
    ...(staff ? [`View in the secure staff dashboard: ${origin}/manager/requests/${r.id}`] : []),
    `${s.name} | ${s.phone} | ${s.email}`,
    "For questions, reply to this email and include the request reference.",
  ];
  const text = lines.join("\n");
  return {
    from: sender, to: [recipient], reply_to: staff ? r.email : s.email,
    subject: staff ? `New Catering Request - ${r.reference} - ${r.event_date} - ${r.guests} Guests` : `Your catering request ${r.reference} | ${s.name}`,
    text,
    html: `<!doctype html><html><body style="margin:0;background:#fffaf3;color:#30251f;font-family:Arial,sans-serif"><main style="max-width:680px;margin:24px auto;background:#fff;padding:32px;border-top:4px solid #d84727"><h1 style="font-size:24px;color:#ae351c">${escapeHtml(title)}</h1><p style="font-size:18px;font-weight:bold">${escapeHtml(r.reference)}</p><div style="white-space:pre-wrap;line-height:1.7;font-size:14px">${escapeHtml(text)}</div>${staff ? `<p><a href="${escapeHtml(origin)}/manager/requests/${r.id}" style="color:#ae351c">Open the secure staff dashboard</a></p>` : ""}</main></body></html>`,
  };
}
