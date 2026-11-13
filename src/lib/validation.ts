import { z } from "zod";
import type { BusinessSettings, CartLine, MenuItem, PricedLine } from "./types";

const text = (max: number) => z.string().trim().max(max);
const phone = z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Use international format, for example +12125551234.");
const choiceSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,40}$/),
  label: z.string().trim().min(1).max(80),
  price_minor: z.number().int().min(0).max(100_000_000),
});
const groupSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,40}$/),
  name: z.string().trim().min(1).max(80),
  min: z.number().int().min(0).max(20),
  max: z.number().int().min(1).max(20),
  choices: z.array(choiceSchema).min(1).max(20),
}).superRefine((group, ctx) => {
  if (group.min > group.max || group.max > group.choices.length) {
    ctx.addIssue({ code: "custom", message: "Option limits must fit the available choices." });
  }
  if (new Set(group.choices.map(c => c.id)).size !== group.choices.length) {
    ctx.addIssue({ code: "custom", message: "Choice IDs must be unique within a group." });
  }
});

export const menuSchema = z.object({
  name: text(120).min(1),
  description: text(1200),
  category: text(80).min(1),
  kind: z.enum(["item", "package"]),
  price_minor: z.number().int().min(0).max(100_000_000).nullable(),
  unit: text(50).min(1),
  minimum_quantity: z.number().int().min(1).max(10000),
  quantity_step: z.number().int().min(1).max(10000),
  dietary: z.array(text(50).min(1)).max(12),
  allergens: z.array(text(50).min(1)).max(20),
  image_url: z.string().url().startsWith("https://").nullable(),
  options: z.array(groupSchema).max(10),
  available: z.boolean(),
  published: z.boolean(),
  sort_order: z.number().int().min(0).max(10000),
}).superRefine((item, ctx) => {
  if (new Set(item.options.map(g => g.id)).size !== item.options.length) {
    ctx.addIssue({ code: "custom", message: "Option group IDs must be unique." });
  }
});

export const settingsSchema = z.object({
  name: text(100).min(1),
  tagline: text(200),
  phone,
  email: z.email().max(254),
  whatsapp: z.union([phone, z.literal("")]),
  address: text(500).min(1),
  service_area: text(500),
  currency: z.string().regex(/^[A-Z]{3}$/).refine(value =>
    Intl.supportedValuesOf("currency").includes(value), "Choose a supported ISO currency."),
  timezone: text(80).refine(value => {
    try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; }
    catch { return false; }
  }, "Choose a valid IANA timezone."),
  lead_hours: z.number().int().min(0).max(8760),
  min_guests: z.number().int().min(1).max(100000),
  max_guests: z.number().int().min(1).max(100000),
  delivery_enabled: z.boolean(),
  pickup_enabled: z.boolean(),
  hours: text(500).min(1),
  privacy_notice: text(10000).min(50),
  accepting_requests: z.boolean(),
}).superRefine((s, ctx) => {
  if (s.min_guests > s.max_guests) ctx.addIssue({ code: "custom", message: "Maximum guests must be at least the minimum." });
  if (!s.pickup_enabled && !s.delivery_enabled) ctx.addIssue({ code: "custom", message: "Enable pickup or delivery." });
  if (s.delivery_enabled && !s.service_area) ctx.addIssue({ code: "custom", message: "Describe your delivery service area." });
});

const lineSchema = z.object({
  line_id: z.uuid(),
  item_id: z.uuid(),
  quantity: z.number().int().min(1).max(10000),
  selections: z.record(z.string().max(40), z.array(z.string().max(40)).max(20)),
  notes: text(500),
});
export const requestSchema = z.object({
  customer_mode: z.enum(["guest", "account"]).default("guest"),
  idempotency_key: z.uuid(),
  customer_name: text(120).min(2),
  email: z.email().max(254),
  phone,
  preferred_contact: z.enum(["email", "phone", "whatsapp"]),
  event_type: text(80).min(1),
  event_date: z.iso.date(),
  event_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  guests: z.number().int().min(1).max(100000),
  fulfillment: z.enum(["pickup", "delivery"]),
  address: text(500),
  notes: text(2000),
  allergies: text(1000),
  privacy_accepted: z.literal(true, { error: "Please acknowledge the privacy notice." }),
  whatsapp_consent: z.boolean(),
  delivery_area_acknowledged: z.boolean(),
  website: z.string().max(0),
  captcha_token: z.string().max(4096),
  items: z.array(lineSchema).min(1).max(50),
}).superRefine((r, ctx) => {
  if (r.fulfillment === "delivery" && (!r.address || !r.delivery_area_acknowledged)) {
    ctx.addIssue({ code: "custom", message: "Enter a delivery address and acknowledge the service area." });
  }
  if (r.preferred_contact === "whatsapp" && !r.whatsapp_consent) {
    ctx.addIssue({ code: "custom", message: "WhatsApp contact requires your consent." });
  }
});
export type RequestInput = z.infer<typeof requestSchema>;

export class ValidationError extends Error {}

export function priceCart(lines: CartLine[], menu: MenuItem[]): { items: PricedLine[]; knownSubtotal: number; hasUnpriced: boolean } {
  const items = lines.map(line => {
    const item = menu.find(i => i.id === line.item_id);
    if (!item || !item.available || !item.published) throw new ValidationError("An item is no longer available. Please review your selection.");
    if (!Number.isInteger(line.quantity) || line.quantity < item.minimum_quantity || line.quantity > 10000 ||
      (line.quantity - item.minimum_quantity) % item.quantity_step !== 0) {
      throw new ValidationError(`Check the quantity for ${item.name}. Minimum ${item.minimum_quantity}, increments of ${item.quantity_step}.`);
    }
    if (Object.keys(line.selections).some(id => !item.options.some(g => g.id === id))) {
      throw new ValidationError(`The options for ${item.name} have changed. Please select it again.`);
    }
    let extras = 0;
    const selections = item.options.map(group => {
      const selected = line.selections[group.id] ?? [];
      if (new Set(selected).size !== selected.length || selected.length < group.min || selected.length > group.max) {
        throw new ValidationError(`Choose ${group.min === group.max ? group.min : `${group.min}-${group.max}`} option(s) for ${group.name}.`);
      }
      const choices = selected.map(id => {
        const choice = group.choices.find(c => c.id === id);
        if (!choice) throw new ValidationError(`An option for ${item.name} is no longer available.`);
        extras += choice.price_minor;
        return { label: choice.label, price_minor: choice.price_minor };
      });
      return { group: group.name, choices };
    });
    const unitPrice = item.price_minor === null ? null : item.price_minor + extras;
    const total = unitPrice === null ? null : unitPrice * line.quantity;
    if (total !== null && !Number.isSafeInteger(total)) throw new ValidationError("This request is too large. Please contact the restaurant.");
    return { item_id: item.id, name: item.name, unit: item.unit, quantity: line.quantity, selections, notes: line.notes, unit_price_minor: unitPrice, total_minor: total };
  });
  const knownSubtotal = items.reduce((sum, item) => sum + (item.total_minor ?? 0), 0);
  if (!Number.isSafeInteger(knownSubtotal)) throw new ValidationError("This request is too large. Please contact the restaurant.");
  return { items, knownSubtotal, hasUnpriced: items.some(item => item.total_minor === null) };
}

export function validateEvent(input: RequestInput, settings: BusinessSettings, now = new Date()) {
  if (!settings.accepting_requests) throw new ValidationError("Online requests are currently paused. Please contact the restaurant.");
  if (input.guests < settings.min_guests || input.guests > settings.max_guests) {
    throw new ValidationError(`We accept requests for ${settings.min_guests}-${settings.max_guests} guests. Contact us for other group sizes.`);
  }
  if ((input.fulfillment === "pickup" && !settings.pickup_enabled) || (input.fulfillment === "delivery" && !settings.delivery_enabled)) {
    throw new ValidationError("That fulfillment option is not available.");
  }
  if (input.preferred_contact === "whatsapp" && !settings.whatsapp) throw new ValidationError("WhatsApp contact is not configured.");
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: settings.timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const target = `${input.event_date}T${input.event_time}`;
  const localValue = (date: Date) => {
    const parts = formatter.formatToParts(date);
    const get = (type: string) => parts.find(p => p.type === type)!.value;
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  };
  const wallTime = Date.parse(`${target}:00Z`);
  // Offsets on either side catch both DST overlaps and nonexistent local times.
  const offsets = new Set([-86400000, 0, 86400000].map(delta => {
    const instant = wallTime + delta;
    return Date.parse(`${localValue(new Date(instant))}:00Z`) - instant;
  }));
  const candidates = [...offsets].map(offset => wallTime - offset).filter(instant => localValue(new Date(instant)) === target);
  if (candidates.length !== 1) throw new ValidationError("That local time is affected by a daylight-saving change. Choose another time or contact the restaurant.");
  if (candidates[0] < now.getTime() + settings.lead_hours * 3600_000 || candidates[0] <= now.getTime()) {
    throw new ValidationError(`Please allow at least ${settings.lead_hours} hours' notice (${settings.timezone}).`);
  }
}

export function money(minor: number, currency: string) {
  const formatter = new Intl.NumberFormat("en", { style: "currency", currency });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(minor / 10 ** digits);
}

export function minorFromDecimal(value: string, currency: string): number | null {
  if (!value.trim()) return null;
  const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${Math.max(1, digits)}})?$`).test(value.trim()) ||
      (digits === 0 && value.includes("."))) throw new ValidationError("Enter a valid price for the selected currency.");
  const [whole, fraction = ""] = value.trim().split(".");
  const amount = Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, "0"));
  if (!Number.isSafeInteger(amount)) throw new ValidationError("Price is too large.");
  return amount;
}
