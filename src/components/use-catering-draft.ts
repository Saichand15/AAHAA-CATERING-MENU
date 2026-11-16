"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { lineSchema } from "@/lib/validation";

export const cateringDraftKey = "aahaa:catering-draft:v1";
const receiptSchema = z.object({
  reference: z.string().max(80), name: z.string().max(120), date: z.string().max(10).nullable(), time: z.string().max(5).nullable(),
  guests: z.number().int().positive().nullable(), fulfillment: z.string().max(20).nullable(), address: z.string().max(500),
  emailProvided: z.boolean().default(true),
  chatWarning: z.string().max(500).optional(),
  notes: z.string().max(2000), allergies: z.string().max(1000), currency: z.string().length(3),
  knownSubtotal: z.number().nonnegative(), hasUnpriced: z.boolean(),
  items: z.array(z.object({
    item_id: z.uuid(), name: z.string().max(120), unit: z.string().max(50),
    description: z.string().max(1200).optional(), quantity: z.number().int().positive(),
    selections: z.array(z.object({
      group: z.string().max(80),
      choices: z.array(z.object({ label: z.string().max(80), price_minor: z.number().nonnegative() })).max(20),
    })).max(10),
    notes: z.string().max(500), substitution_request: z.string().max(500).optional(),
    unit_price_minor: z.number().nonnegative().nullable(), total_minor: z.number().nonnegative().nullable(),
  })).max(50),
});
const viewSchema = z.object({ category: z.string().max(80), search: z.string().max(254), partySize: z.string().max(50) });
export const eventDraftSchema = z.object({
  customer_name: z.string().max(120).optional(),
  email: z.string().max(254).optional(),
  phone: z.string().max(40).optional(),
  preferred_contact: z.string().max(20).optional(),
  event_type: z.string().max(80).optional(),
  guests: z.string().max(10).optional(),
  event_date: z.string().max(10).optional(),
  event_time: z.string().max(5).optional(),
  fulfillment: z.enum(["", "pickup", "delivery"]).optional(),
  address: z.string().max(500).optional(),
  allergies: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});
const draftSchema = z.object({
  cart: z.array(lineSchema).max(50),
  fields: eventDraftSchema,
  checkout: z.boolean(),
  quick: z.boolean().default(false),
  submission: z.object({ key: z.uuid(), fingerprint: z.string().max(100000) }).nullable(),
  receipt: receiptSchema.nullable().default(null),
  views: z.object({ catering: viewSchema.optional(), regular: viewSchema.optional() }).default({}),
});
export type EventDraft = z.infer<typeof eventDraftSchema>;
export type Receipt = z.infer<typeof receiptSchema>;
type Draft = z.infer<typeof draftSchema>;
const emptyDraft: Draft = { cart: [], fields: {}, checkout: false, quick: false, submission: null, receipt: null, views: {} };

export function useCateringDraft() {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(cateringDraftKey);
      // Browser storage is only available after hydration, never during server rendering.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setDraft(draftSchema.parse(JSON.parse(saved)));
    } catch (error) {
      console.error("Could not restore catering draft", error);
      setStorageError("Your saved draft could not be restored. Keep this page open while completing your request.");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(cateringDraftKey, JSON.stringify(draft));
    } catch (error) {
      console.error("Could not save catering draft", error);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStorageError("Your browser could not save this draft. Keep this page open to avoid losing your selections.");
    }
  }, [draft, ready]);
  return { draft, setDraft, ready, storageError, emptyDraft };
}
