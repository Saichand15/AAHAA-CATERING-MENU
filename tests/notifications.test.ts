import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { savedRequest, settings } from "./fixtures";
import { buildEmail, type EmailMessage } from "../src/lib/email";

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("../src/lib/supabase", () => ({ serviceDb: () => mocks }));
import { deliverNotifications } from "../src/lib/notifications";

let updates: Record<string, unknown>[];
let saved: EmailMessage | null;
const job = { id: "test-job", request_id: savedRequest.id, recipient: "owner@example.com", audience: "staff", channel: "email", attempts: 1, lease_token: "test-lease", created_at: new Date().toISOString() };
beforeEach(() => {
  updates = []; saved = null;
  vi.stubEnv("RESEND_API_KEY", "test-key"); vi.stubEnv("EMAIL_FROM", "notify@example.com"); vi.stubEnv("APP_URL", "https://catering.example.com");
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.rpc.mockResolvedValue({ data: [job], error: null });
  mocks.from.mockImplementation((table: string) => {
    let patch: Record<string, unknown> | null = null;
    const result = () => {
      if (patch) { updates.push(patch); return { data: { id: job.id }, error: null }; }
      return { data: table === "catering_requests" ? savedRequest : table === "business_settings" ? settings : { message: saved }, error: null };
    };
    const chain = {
      update: (value: Record<string, unknown>) => { patch = value; return chain; },
      select: () => chain, eq: () => chain, gte: () => chain, lte: () => chain,
      single: async () => result(), maybeSingle: async () => result(),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return chain;
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("durable notification delivery", () => {
  it("sends with an idempotency key and records provider acceptance", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ id: "provider-message" }));
    vi.stubGlobal("fetch", fetcher);
    const result = await deliverNotifications();
    expect(result.accepted).toBe(1);
    expect(fetcher.mock.calls[0][1].headers["Idempotency-Key"]).toBe("catering/test-job");
    expect(updates.some(u => u.status === "sent" && u.provider_id === "provider-message")).toBe(true);
    expect(updates.some(u => Boolean(u.message))).toBe(true);
  });
  it("network failures schedule retries rather than pretending delivery succeeded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const result = await deliverNotifications();
    expect(result.retried).toBe(1); expect(result.accepted).toBe(0);
    expect(updates.some(u => u.status === "pending" && typeof u.next_attempt_at === "string")).toBe(true);
    expect(updates.some(u => u.status === "sent")).toBe(false);
  });
  it("reuses the immutable email snapshot after restaurant details change", async () => {
    saved = buildEmail(savedRequest, { ...settings, name: "Original business" }, job.recipient, "staff", "https://original.example.com", "original@example.com");
    const fetcher = vi.fn().mockResolvedValue(Response.json({ id: "provider-message" }));
    vi.stubGlobal("fetch", fetcher);
    await deliverNotifications();
    expect(JSON.parse(fetcher.mock.calls[0][1].body).from).toBe("original@example.com");
    expect(updates.some(u => Boolean(u.message))).toBe(false);
  });
  it("stops automatic resend outside the provider idempotency window", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ ...job, attempts: 2, created_at: new Date(Date.now() - 25 * 3600_000).toISOString() }], error: null });
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const result = await deliverNotifications();
    expect(result.failed).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
    expect(updates.some(u => u.status === "failed" && String(u.last_error).includes("uncertain"))).toBe(true);
  });
  it("sends approved WhatsApp templates with per-attempt correlation", async () => {
    for (const [key, value] of Object.entries({ WHATSAPP_ACCESS_TOKEN: "test-token", WHATSAPP_PHONE_NUMBER_ID: "123456", WHATSAPP_API_VERSION: "v23.0", WHATSAPP_TEMPLATE_NAME: "catering_request", WHATSAPP_TEMPLATE_LANGUAGE: "en_US", WHATSAPP_APP_SECRET: "test-secret", WHATSAPP_VERIFY_TOKEN: "test-verify" })) vi.stubEnv(key, value);
    const whatsapp = { ...job, channel: "whatsapp", recipient: "+12125551234" };
    mocks.rpc.mockImplementation(async (name: string) => name === "claim_notifications" ? { data: [whatsapp], error: null } : { data: true, error: null });
    const fetcher = vi.fn().mockResolvedValue(Response.json({ messages: [{ id: "wamid.test" }] }));
    vi.stubGlobal("fetch", fetcher);
    expect((await deliverNotifications()).accepted).toBe(1);
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.type).toBe("template");
    expect(body.template.components[0].parameters).toHaveLength(5);
    expect(body.biz_opaque_callback_data).toBe("test-job:test-lease");
    expect(body.to).toBe("12125551234");
  });
  it("does not automatically resend an uncertain WhatsApp network attempt", async () => {
    for (const [key, value] of Object.entries({ WHATSAPP_ACCESS_TOKEN: "test-token", WHATSAPP_PHONE_NUMBER_ID: "123456", WHATSAPP_API_VERSION: "v23.0", WHATSAPP_TEMPLATE_NAME: "catering_request", WHATSAPP_TEMPLATE_LANGUAGE: "en_US", WHATSAPP_APP_SECRET: "test-secret", WHATSAPP_VERIFY_TOKEN: "test-verify" })) vi.stubEnv(key, value);
    mocks.rpc.mockResolvedValue({ data: [{ ...job, channel: "whatsapp", recipient: "+12125551234" }], error: null });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    const result = await deliverNotifications();
    expect(result.failed).toBe(1); expect(result.retried).toBe(0);
    expect(updates.some(u => u.status === "failed" && String(u.last_error).includes("uncertain"))).toBe(true);
  });
});
