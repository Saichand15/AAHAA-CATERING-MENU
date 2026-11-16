import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BusinessSettings, CateringRequest } from "./types";
import { estimateLabel, money } from "./validation";
import { parsePackageDetails } from "./package-details";
import { eventSchedule } from "./request-display";

export type EmailMessage = {
  from: string; to: string[]; reply_to: string; subject: string; text: string; html: string;
  attachments?: { filename: string; content: string; content_id: string; content_type: string }[];
};
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
    `Email: ${r.email || "Not provided"}`,
    `Phone: ${r.phone}`,
    `Preferred contact: ${r.preferred_contact}`,
    `WhatsApp consent: ${r.whatsapp_consent ? "Yes, for this enquiry" : "Not given"}`,
    `Occasion: ${r.event_type || "Not provided"}`,
    `Event: ${eventSchedule(r.event_date, r.event_time, r.timezone)}`,
    `Guests: ${r.guests ?? "Not provided"}`,
    `Service: ${r.fulfillment || "Not provided"}`,
    ...(r.fulfillment === "delivery" ? [`Delivery address: ${r.address || "Not provided"}`] : r.fulfillment === "pickup" ? [`Pickup location: ${s.address}`] : []),
    "",
    "REQUESTED MENU",
    ...r.items.flatMap(item => [
      `${item.quantity} x ${item.name} (per ${item.unit}) - ${item.total_minor === null ? "Price on request" : money(item.total_minor, r.currency)}`,
      ...(item.description ? (() => {
        const details = parsePackageDetails(item.description);
        return details ? [
          "  What's included:", ...details.inclusions.map(value => `    - ${value}`),
          "  Approximate portions:", ...details.portions.map(portion => `    ${portion.label}: ${portion.value}`),
          ...(details.bread.length ? ["  Bread quantity (choose one):", ...details.bread.map(value => `    - ${value}`)] : []),
          ...details.notes.map(value => `  ${value}`),
        ] : [`  Package/item details: ${item.description}`];
      })() : []),
      ...item.selections.filter(g => g.choices.length).map(g => `  ${g.group}: ${g.choices.map(c => `${c.label}${c.price_minor ? ` (+${money(c.price_minor, r.currency)} per unit)` : ""}`).join(", ")}`),
      ...(item.notes ? [`  Item instructions: ${item.notes}`] : []),
      ...(item.substitution_request ? [`  SUBSTITUTION REQUEST: ${item.substitution_request}`, "  Base package price shown; manager quote required. Adjustments may increase or decrease the price."] : []),
    ]),
    "",
    `${estimateLabel(r.items, r.has_unpriced_items)}: ${money(r.known_subtotal_minor, r.currency)}`,
    "Final prices, taxes, delivery and availability require restaurant confirmation.",
    "",
    `Dietary/allergy requests: ${r.allergies || "None specified"}`,
    `Event instructions: ${r.notes || "None specified"}`,
    "",
    ...(staff ? [`View in the secure staff dashboard: ${origin}/manager/requests/${r.id}`] : []),
    `${s.name} | ${s.phone} | ${s.email}`,
    staff && !r.email ? "No customer email provided. Call the customer mobile number and mention the request reference." : "For questions, reply to this email and include the request reference.",
  ];
  const text = lines.join("\n");
  const formatted = (value: string) => escapeHtml(value).replace(/\r?\n/g, "<br>");
  const detail = (label: string, value: string) => `<tr><th scope="row" width="36%" style="padding:9px 12px 9px 0;border-bottom:1px solid #eee8e0;text-align:left;vertical-align:top;font-size:13px;font-weight:normal;color:#746b63">${escapeHtml(label)}</th><td style="padding:9px 0;border-bottom:1px solid #eee8e0;vertical-align:top;font-size:15px;line-height:23px;word-break:break-word">${formatted(value)}</td></tr>`;
  const packageDescription = (description: string) => {
    const details = parsePackageDetails(description);
    if (!details) return `<p style="margin:0;font-size:14px;line-height:24px;color:#503f32;word-break:break-word">${formatted(description)}</p>`;
    const heading = (value: string) => `<h4 style="margin:18px 0 8px;font-size:15px;line-height:23px;color:#503421">${value}</h4>`;
    const list = (items: string[]) => `<ul style="padding-left:20px;margin:0;font-size:14px;line-height:24px;color:#503f32">${items.map(value => `<li style="margin:0 0 6px;word-break:break-word">${escapeHtml(value)}</li>`).join("")}</ul>`;
    return `${heading("What's included")}${list(details.inclusions)}
${heading("Approximate portions")}<table aria-label="Approximate package portions" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed">${details.portions.map(portion => detail(portion.label, portion.value)).join("")}</table>
${details.bread.length ? `${heading("Bread quantity - choose one")}${list(details.bread)}` : ""}
${details.notes.length ? `${heading("Before you choose")}${list(details.notes)}` : ""}`;
  };
  const totalLabel = estimateLabel(r.items, r.has_unpriced_items);
  const dashboardUrl = `${origin}/manager/requests/${r.id}`;
  const logoUrl = process.env.EMAIL_LOGO_URL || "cid:aahaa-logo";
  if (logoUrl !== "cid:aahaa-logo" && new URL(logoUrl).protocol !== "https:") {
    throw new Error("EMAIL_LOGO_URL must be a publicly accessible HTTPS image URL.");
  }
  const sectionTitle = (label: string) => `<h2 style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:26px;font-weight:700;color:#342b25">${label}</h2>`;
  return {
    from: sender, to: [recipient], reply_to: staff && r.email ? r.email : s.email,
    subject: staff ? `Catering ${r.reference} - ${r.customer_name.replace(/[\r\n]/g, " ")} - ${r.event_date || "Date to discuss"} - ${r.guests === null ? "Guest count to discuss" : `${r.guests} Guests`}` : `Your catering request ${r.reference} | ${s.name}`,
    text,
    ...(logoUrl === "cid:aahaa-logo" ? { attachments: [{
      filename: "aahaa-logo.png",
      content: readFileSync(join(process.cwd(), "public", "aahaa-logo-email.png")).toString("base64"),
      content_id: "aahaa-logo",
      content_type: "image/png",
    }] } : {}),
    html: `<!doctype html>
<html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta charset="utf-8"><meta name="color-scheme" content="light">
<style>body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table{border-collapse:collapse}img{border:0;outline:none;text-decoration:none}@media screen and (max-width:480px){.email-pad{padding-left:18px!important;padding-right:18px!important}.email-title{font-size:26px!important;line-height:32px!important}.email-frame{padding:10px 0!important}}</style></head>
<body style="margin:0;padding:0;background-color:#f4f1ec;color:#342b25;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f1ec"><tr><td class="email-frame" align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;table-layout:fixed;background-color:#ffffff;border:1px solid #e7e0d6">
<tr><td height="5" bgcolor="#a63b17" style="height:5px;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td class="email-pad" align="center" bgcolor="#ffffff" style="padding:28px 32px 22px">
<img src="${escapeHtml(logoUrl)}" alt="Aahaa Indian Kitchen" width="240" height="95" style="display:block;width:240px;max-width:100%;height:auto;background-color:#ffffff">
<p style="margin:14px 0 0;font-size:11px;line-height:18px;letter-spacing:1px;color:#746b63">CATERING &amp; BULK ORDERS</p>
</td></tr>
<tr><td class="email-pad" style="padding:24px 32px;background-color:#fbf6ef;border-top:1px solid #eee4d6;border-bottom:1px solid #eee4d6">
<p style="margin:0 0 8px;font-size:11px;line-height:18px;letter-spacing:1px;font-weight:700;color:#a04423">${staff ? "MANAGER NOTIFICATION" : "YOUR CATERING ENQUIRY"}</p>
<h1 class="email-title" style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:38px;letter-spacing:-0.5px;color:#342b25">${escapeHtml(title)}</h1>
<p style="margin:0;font-size:14px;line-height:22px;color:#62584f">Reference <strong style="color:#893b20">${escapeHtml(r.reference)}</strong></p>
<p style="margin:12px 0 0;font-size:14px;line-height:22px;color:#62584f">${staff ? "Review the requested menu and contact the customer to confirm the arrangements." : `Hello ${escapeHtml(r.customer_name)}, our manager will review your menu and contact you about availability and arrangements.`}</p>
</td></tr>
<tr><td class="email-pad" style="padding:26px 32px 0">
${sectionTitle("Customer")}
<p style="margin:0 0 6px;font-size:20px;line-height:28px;font-weight:700">${escapeHtml(r.customer_name)}</p>
<p style="margin:0;font-size:16px;line-height:28px;word-break:break-word"><a href="tel:${escapeHtml(r.phone)}" style="color:#a63b17;text-decoration:none">${escapeHtml(r.phone)}</a><br>${r.email ? `<a href="mailto:${escapeHtml(r.email)}" style="color:#a63b17;text-decoration:underline">${escapeHtml(r.email)}</a>` : "Email: Not provided - follow up by phone"}</p>
<p style="margin:10px 0 0;font-size:12px;line-height:20px;color:#746b63">Preferred contact: ${escapeHtml(r.preferred_contact)} &nbsp;|&nbsp; WhatsApp consent: ${r.whatsapp_consent ? "Yes, for this enquiry" : "Not given"}</p>
</td></tr>
<tr><td class="email-pad" style="padding:26px 32px 0">
${sectionTitle("Event details")}
<table aria-label="Event details" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed">
${detail("Occasion", r.event_type || "Not provided")}${detail("Date & time", eventSchedule(r.event_date, r.event_time, r.timezone))}${detail("Guests", r.guests === null ? "Not provided" : String(r.guests))}${detail("Service", r.fulfillment || "Not provided")}${r.fulfillment === "delivery" ? detail("Delivery address", r.address || "Not provided") : r.fulfillment === "pickup" ? detail("Pickup location", s.address) : ""}
</table></td></tr>
<tr><td class="email-pad" style="padding:28px 32px 0">
${sectionTitle("Requested menu")}
${r.items.map((item, index) => `<table aria-label="${escapeHtml(item.name)}" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;border:1px solid #e7e0d6;margin:0 0 16px">
<tr><td bgcolor="#fbf6ef" style="padding:16px 18px;border-bottom:1px solid #e7e0d6"><p style="margin:0 0 4px;font-size:11px;line-height:18px;letter-spacing:1px;color:#8d6a53">MENU SELECTION ${index + 1}</p><h3 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:26px;word-break:break-word">${escapeHtml(item.name)}</h3></td></tr>
<tr><td style="padding:16px 18px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed"><tr><td width="55%" style="vertical-align:top"><p style="margin:0;font-size:12px;line-height:20px;color:#746b63">Quantity</p><p style="margin:2px 0 0;font-size:18px;line-height:26px;font-weight:700">${item.quantity}</p></td><td align="right" style="vertical-align:top"><p style="margin:0;font-size:12px;line-height:20px;color:#746b63">Line estimate</p><p style="margin:2px 0 0;font-size:20px;line-height:26px;font-weight:700;color:#893b20">${item.total_minor === null ? "On request" : escapeHtml(money(item.total_minor, r.currency))}</p></td></tr></table>
<p style="margin:12px 0 14px;font-size:13px;line-height:21px;color:#746b63">Per ${escapeHtml(item.unit)}: ${item.unit_price_minor === null ? "Price on request" : escapeHtml(money(item.unit_price_minor, r.currency))}</p>
${item.selections.some(g => g.choices.length) ? `<table aria-label="Selected options" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed">${item.selections.filter(g => g.choices.length).map(g => detail(g.group, g.choices.map(c => `${c.label}${c.price_minor ? ` (+${money(c.price_minor, r.currency)} per unit)` : ""}`).join(", "))).join("")}</table>` : ""}
${item.notes ? `<p style="margin:16px 0 4px;font-size:13px;line-height:20px;font-weight:700;color:#893b20">Customer preferences</p><p style="margin:0;font-size:15px;line-height:24px;word-break:break-word">${formatted(item.notes)}</p>` : ""}
${item.substitution_request ? `<p style="margin:18px 0 6px;font-size:15px;line-height:24px;font-weight:700;color:#893b20">Substitution request - manager quote required</p><p style="margin:0;font-size:15px;line-height:24px;word-break:break-word">${formatted(item.substitution_request)}</p><p style="margin:8px 0 0;font-size:13px;line-height:22px">Base package price shown. Confirm availability, swap limits and the revised quote. Adjustments may increase or decrease the price; no automatic discount or surcharge has been applied.</p>` : ""}
${item.description ? packageDescription(item.description) : ""}
</td></tr></table>`).join("")}
</td></tr>
<tr><td class="email-pad" style="padding:0 32px 24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f7eee2"><tr><td style="padding:20px"><p style="margin:0;font-size:13px;line-height:22px;color:#62584f">${escapeHtml(totalLabel)}</p><p style="margin:4px 0 8px;font-size:30px;line-height:38px;font-weight:700;color:#893b20">${escapeHtml(money(r.known_subtotal_minor, r.currency))}</p><p style="margin:0;font-size:12px;line-height:20px;color:#746b63">Final prices, taxes, delivery and availability require restaurant confirmation.</p></td></tr></table>
</td></tr>
<tr><td class="email-pad" style="padding:0 32px 24px">
${sectionTitle("Dietary &amp; allergy requests")}<p style="margin:0 0 22px;font-size:15px;line-height:24px;word-break:break-word">${formatted(r.allergies || "None specified")}</p>
${sectionTitle("Event instructions")}<p style="margin:0;font-size:15px;line-height:24px;word-break:break-word">${formatted(r.notes || "None specified")}</p>
</td></tr>
<tr><td class="email-pad" style="padding:0 32px 28px">
<p style="margin:0 0 20px;font-size:13px;line-height:22px;color:#746b63"><strong style="color:#893b20">Awaiting restaurant confirmation.</strong><br>This is a catering enquiry, not a confirmed food order. No payment has been taken.</p>
${staff ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#a63b17" style="border-radius:4px"><a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:14px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none">Review enquiry in manager dashboard</a></td></tr></table><p style="margin:10px 0 0;font-size:12px;line-height:20px;color:#746b63">Staff sign-in required. ${r.email ? "Reply to this email to contact the customer." : "No customer email was provided. Call the mobile number above to follow up; email replies go to the restaurant."}</p>` : '<p style="margin:0;font-size:14px;line-height:22px">Reply to this email to contact our manager.</p>'}
</td></tr>
<tr><td class="email-pad" align="center" bgcolor="#fbf9f5" style="padding:24px 32px;border-top:1px solid #e7e0d6">
<p style="margin:0 0 8px;font-size:14px;line-height:22px;font-weight:700;color:#62584f">${escapeHtml(s.name)}</p><p style="margin:0;font-size:12px;line-height:21px;color:#746b63">${escapeHtml(s.address)}<br>${escapeHtml(s.phone)}<br>${escapeHtml(s.email)}</p><p style="margin:12px 0 0;font-size:11px;line-height:18px;color:#8b827a">Reference: ${escapeHtml(r.reference)}<br>Submitted: ${escapeHtml(r.created_at)}</p>
</td></tr></table></td></tr></table></body></html>`,
  };
}
