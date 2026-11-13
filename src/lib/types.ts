export type Choice = { id: string; label: string; price_minor: number };
export type OptionGroup = {
  id: string;
  name: string;
  min: number;
  max: number;
  choices: Choice[];
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  kind: "item" | "package";
  price_minor: number | null;
  unit: string;
  minimum_quantity: number;
  quantity_step: number;
  dietary: string[];
  allergens: string[];
  image_url: string | null;
  options: OptionGroup[];
  available: boolean;
  published: boolean;
  sort_order: number;
};

export type BusinessSettings = {
  id: boolean;
  name: string;
  tagline: string;
  phone: string;
  email: string;
  whatsapp: string;
  address: string;
  service_area: string;
  currency: string;
  timezone: string;
  lead_hours: number;
  min_guests: number;
  max_guests: number;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  hours: string;
  privacy_notice: string;
  accepting_requests: boolean;
};

export type CartLine = {
  line_id: string;
  item_id: string;
  quantity: number;
  selections: Record<string, string[]>;
  notes: string;
};

export type PricedLine = {
  item_id: string;
  name: string;
  unit: string;
  quantity: number;
  selections: { group: string; choices: { label: string; price_minor: number }[] }[];
  notes: string;
  unit_price_minor: number | null;
  total_minor: number | null;
};

export type CateringRequest = {
  id: string;
  reference: string;
  created_at: string;
  customer_name: string;
  email: string;
  phone: string;
  preferred_contact: "email" | "phone" | "whatsapp";
  event_type: string;
  event_date: string;
  event_time: string;
  timezone: string;
  guests: number;
  fulfillment: "pickup" | "delivery";
  address: string;
  notes: string;
  allergies: string;
  whatsapp_consent: boolean;
  currency: string;
  known_subtotal_minor: number;
  has_unpriced_items: boolean;
  status: "new" | "contacted" | "closed";
  version: number;
  items: PricedLine[];
};

export type NotificationJob = {
  id: string;
  request_id: string;
  recipient: string;
  audience: "staff" | "customer";
  channel: "email" | "whatsapp";
  delivery_status: "sent" | "delivered" | "read" | "failed" | null;
  status: "pending" | "processing" | "sent" | "failed";
  attempts: number;
  last_error: string | null;
  provider_id: string | null;
  created_at: string;
  sent_at: string | null;
};
