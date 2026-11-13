import type { BusinessSettings, CateringRequest, MenuItem, NotificationJob, PricedLine } from "./types";
import type { EmailMessage } from "./email";
import type { WhatsAppMessage } from "./whatsapp";

type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
export type SubmissionRecord = Omit<CateringRequest, "id" | "reference" | "created_at" | "status" | "version"> & {
  privacy_notice: string;
  privacy_accepted_at: string;
};
export type Database = {
  public: {
    Tables: {
      business_settings: Table<BusinessSettings>;
      staff_members: Table<{ user_id: string; role: "owner" | "manager"; created_at: string }>;
      customer_profiles: Table<{ id: string; full_name: string; phone: string; updated_at: string }>;
      notification_settings: Table<{ id: boolean; recipients: string[]; whatsapp_enabled: boolean; whatsapp_recipients: string[]; whatsapp_consent_at: string | null; whatsapp_consent_by: string | null }>;
      menu_items: Table<MenuItem & { created_at: string; updated_at: string }>;
      catering_requests: Table<CateringRequest & { customer_id: string | null; idempotency_key: string; payload_hash: string; privacy_notice: string; privacy_accepted_at: string }>;
      request_notes: Table<{ id: string; request_id: string; author_id: string; body: string; created_at: string }>;
      request_history: Table<{ id: string; request_id: string; actor_id: string; status: string; created_at: string }>;
      notification_jobs: Table<NotificationJob & { next_attempt_at: string; locked_until: string | null; lease_token: string | null; message: EmailMessage | null; whatsapp_message: WhatsAppMessage | null; send_started_at: string | null; send_token: string | null; delivery_updated_at: string | null }>;
    };
    Views: Record<string, never>;
    Functions: {
      submit_catering_request: {
        Args: { p_key: string; p_hash: string; p_payload: SubmissionRecord; p_customer_id?: string | null };
        Returns: { reference: string; id: string; duplicate: boolean }[];
      };
      consume_rate_limit: { Args: { p_key: string; p_limit: number; p_window_seconds: number }; Returns: boolean };
      claim_notifications: { Args: Record<string, never>; Returns: (NotificationJob & { lease_token: string })[] };
      change_request_status: { Args: { p_id: string; p_version: number; p_status: string }; Returns: boolean };
      save_business_settings: { Args: { p_settings: Omit<BusinessSettings, "id">; p_recipients: string[]; p_whatsapp_enabled?: boolean; p_whatsapp_recipients?: string[]; p_whatsapp_consent?: boolean }; Returns: undefined };
      customer_accounts_ready: { Args: Record<string, never>; Returns: boolean };
      record_whatsapp_status: { Args: { p_id: string; p_send_token: string; p_provider_id: string; p_status: string; p_time: string; p_error: string }; Returns: boolean };
      acknowledge_whatsapp_send: { Args: { p_id: string; p_lease_token: string; p_provider_id: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
export type { PricedLine };
