import type { CateringRequest } from "./types";

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
  return {
    messaging_product: "whatsapp", to: recipient.replace(/^\+/, ""), type: "template",
    template: {
      name: template, language: { code: language },
      components: [{
        type: "body",
        parameters: [
          request.reference,
          clean(request.customer_name),
          `${request.event_date} ${request.event_time.slice(0, 5)} (${request.timezone})`,
          String(request.guests),
          `${origin}/manager/requests/${request.id}`,
        ].map(text => ({ type: "text", text })),
      }],
    },
  };
}
