import type { BusinessSettings, CateringRequest, CartLine, MenuItem } from "../src/lib/types";
import type { RequestInput } from "../src/lib/validation";

// Isolated test data; never imported by the production application or migrations.
export const settings: BusinessSettings = {
  id: true, name: "Test Kitchen", tagline: "Test", phone: "+12125551234", email: "kitchen@example.com", whatsapp: "",
  address: "Test pickup address", service_area: "Test postal area", currency: "USD", timezone: "America/Chicago",
  lead_hours: 48, min_guests: 10, max_guests: 500, delivery_enabled: true, pickup_enabled: true,
  hours: "Test hours", privacy_notice: "Test-only privacy notice describing the purpose of storing a catering request.",
  accepting_requests: true,
};
export const item: MenuItem = {
  id: "7a1e2bb7-3a7d-49e4-8044-5b8b78eac9b3", name: "Test tray", description: "Test-only dish", category: "Tests", kind: "item",
  price_minor: 1250, unit: "tray", minimum_quantity: 2, quantity_step: 2, dietary: ["Vegetarian"], allergens: ["Milk"],
  image_url: null, available: true, published: true, sort_order: 0,
  options: [{ id: "spice", name: "Spice", min: 1, max: 1, choices: [{ id: "mild", label: "Mild", price_minor: 0 }, { id: "hot", label: "Hot", price_minor: 125 }] }],
};
export const line: CartLine = { line_id: "1fd90079-ea1d-48ab-8e3c-4d5d57a07bc5", item_id: item.id, quantity: 2, selections: { spice: ["hot"] }, notes: "Test note" };
export const customMenu: MenuItem = {
  ...item, id: "86e6bb27-f927-4858-8efe-c663207752c9", menu_type: "catering", is_custom_menu: true,
  name: "Build your own catering menu", category: "Customized catering", kind: "package",
  description: "Choose your dishes. Our manager confirms portions and pricing.", price_minor: null, unit: "custom menu",
  minimum_quantity: 1, quantity_step: 1, dietary: [], allergens: [],
  options: [
    { id: "appetizers", name: "Appetizers", min: 0, max: 2, choices: [
      { id: "gobi", label: "Gobi Manchurian", price_minor: 0 }, { id: "paneer", label: "Paneer 65", price_minor: 0 },
    ] },
    { id: "biryani", name: "Biryani", min: 0, max: 1, choices: [{ id: "veg", label: "Veg Biryani", price_minor: 0 }] },
  ],
};
export const input = {
  customer_mode: "guest",
  idempotency_key: "44d985af-4550-43d8-99a6-44920fc3565c", customer_name: "Test Customer", email: "customer@example.com",
  phone: "+12125551235", preferred_contact: "email", event_type: "Test occasion", event_date: "2027-06-20", event_time: "12:30",
  guests: 25, fulfillment: "pickup", address: "", notes: "Test venue note", allergies: "Test allergy note",
  privacy_accepted: true, whatsapp_consent: false, delivery_area_acknowledged: false, website: "", captcha_token: "test-token", items: [line],
} satisfies RequestInput;
export const savedRequest = {
  id: "65be5413-cd34-49fc-8d4c-caa304d9f409", reference: "CAT-2027-000001", created_at: "2027-05-20T13:00:00Z",
  customer_name: input.customer_name, email: input.email, phone: input.phone, preferred_contact: input.preferred_contact,
  event_type: input.event_type, event_date: input.event_date, event_time: input.event_time, timezone: settings.timezone,
  guests: input.guests, fulfillment: input.fulfillment, address: "", notes: input.notes, allergies: input.allergies,
  whatsapp_consent: false, currency: "USD", known_subtotal_minor: 2750, has_unpriced_items: false, status: "new", version: 1,
  items: [{ item_id: item.id, name: item.name, unit: item.unit, quantity: 2, selections: [{ group: "Spice", choices: [{ label: "Hot", price_minor: 125 }] }], notes: line.notes, unit_price_minor: 1375, total_minor: 2750 }],
} satisfies CateringRequest;
