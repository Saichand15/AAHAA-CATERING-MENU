import { z } from "zod";
import { requestSchema } from "./validation";

export const chatMessageSchema = z.object({
  client_id: z.uuid(),
  body: z.string().trim().min(1, "Enter a message.").max(2000),
});
export const chatStartSchema = chatMessageSchema.extend({
  customer_name: requestSchema.shape.customer_name,
  phone: requestSchema.shape.phone,
  privacy_accepted: z.literal(true, { error: "Please acknowledge the privacy notice." }),
  captcha_token: z.string().max(4096).default(""),
  website: z.string().max(0).default(""),
  request_id: z.uuid().optional(),
});
export type ChatConversation = {
  id: string;
  customer_name: string;
  phone: string;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
  last_body: string;
  last_message_id: number;
  last_customer_id: number;
  last_staff_id: number;
  customer_read_id: number;
  staff_read_id: number;
};
export type ChatRecord = ChatConversation & {
  access_hash: string;
  customer_id: string | null;
  privacy_notice: string;
  privacy_accepted_at: string;
};
export type ChatMessage = {
  id: number;
  conversation_id: string;
  client_id: string;
  sender: "customer" | "staff";
  author_id: string | null;
  body: string;
  created_at: string;
};
export type ChatThread = {
  conversation: ChatConversation | null;
  messages: ChatMessage[];
  requests: { id: string; reference: string }[];
  hasMore: boolean;
};
export const chatPublicColumns = "id,customer_name,phone,status,created_at,updated_at,last_body,last_message_id,last_customer_id,last_staff_id,customer_read_id,staff_read_id" as const;
