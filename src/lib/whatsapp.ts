import type { CateringRequest } from "./types";
import { eventSchedule } from "./request-display";

export type WhatsAppMessage = {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: { code: string };
    components: { type: "body"; parameters: { type: "text"; text: string }[] }[];
  };
};
export function buildWhatsAppMessage(request: CateringRequest, recipient: string, origin: string, template: string, language: string): WhatsAppMessage {
  const clean = (value: string) => value.replace(/\s+/g, " ").trim();
  const menu = request.items.map(item => `${item.quantity} x ${item.name}`).join("; ");
  const summary = menu.length > 420 ? `${menu.slice(0, 417)}...` : menu;
  return {
    messaging_product: "whatsapp", to: recipient.replace(/^\+/, ""), type: "template",
    template: {
      name: template, language: { code: language },
      components: [{
        type: "body",
        parameters: [
          request.reference,
          clean(`${request.customer_name} (${request.phone})`),
          eventSchedule(request.event_date, request.event_time, request.timezone),
          clean(`${request.guests ?? "Not provided"} | Menu: ${summary}${request.items.some(item => item.substitution_request) ? " | Substitutions need manager quote" : ""} | Full details in email/dashboard`),
          `${origin}/manager/requests/${request.id}`,
        ].map(text => ({ type: "text", text })),
      }],
    },
  };
}
