import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { input, item, settings } from "./fixtures";

const mocks = vi.hoisted(() => ({
  after: vi.fn(), deliver: vi.fn(), from: vi.fn(), rpc: vi.fn(), existing: null as Record<string, unknown> | null,
}));
vi.mock("next/server", async importOriginal => ({
  ...await importOriginal<typeof import("next/server")>(),
  after: mocks.after,
}));
vi.mock("../src/lib/notifications", () => ({ deliverNotifications: mocks.deliver }));
vi.mock("../src/lib/chat", () => ({ connectRequestChat: vi.fn() }));
vi.mock("../src/lib/supabase", () => ({ serviceDb: () => ({ from: mocks.from, rpc: mocks.rpc }) }));
import { POST } from "../src/app/api/requests/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.existing = null;
  for (const [key, value] of Object.entries({
    NODE_ENV: "development", ALLOW_LOCAL_SUBMISSIONS: "true", APP_URL: "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test",
    SUPABASE_SERVICE_ROLE_KEY: "test", RESEND_API_KEY: "test", EMAIL_FROM: "test@example.com",
    RATE_LIMIT_SECRET: "test-rate-limit-secret-with-at-least-32-characters",
    CRON_SECRET: "test-worker-secret-with-at-least-32-characters",
  })) vi.stubEnv(key, value);
  mocks.from.mockImplementation((table: string) => {
    const result = () => ({ data: table === "catering_requests" ? mocks.existing : table === "business_settings" ? settings : { whatsapp_enabled: false }, error: null });
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn(async () => result()), single: vi.fn(async () => result()), in: vi.fn(async () => ({ data: [item], error: null })) };
    return query;
  });
  mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "consume_rate_limit" ? true : [{ reference: "CAT-TEST-1" }], error: null }));
  mocks.deliver.mockResolvedValue({ claimed: 2, accepted: 2, failed: 0, retried: 0 });
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
const send = (patch: Record<string, unknown> = {}) => POST(new Request("http://localhost:3000/api/requests", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify({ ...input, event_date: "2099-06-20", ...patch }) }));

describe("request persistence and immediate notifications", () => {
  it("persists contact-only enquiries with null event/email fields and schedules manager delivery", async () => {
    const response = await send({ email: "", event_type: "", event_date: "", event_time: "", guests: "", fulfillment: "", preferred_contact: "phone" });
    expect(response.status).toBe(201);
    expect(mocks.rpc).toHaveBeenCalledWith("submit_catering_request", expect.objectContaining({ p_payload: expect.objectContaining({
      customer_name: input.customer_name, phone: input.phone, email: null,
      event_type: null, event_date: null, event_time: null, guests: null, fulfillment: null,
    }) }));
    expect(mocks.after).toHaveBeenCalledTimes(1);
  });
  it("saves the enquiry before scheduling durable notification delivery after the response", async () => {
    const response = await send();
    expect(response.status).toBe(201);
    expect((await response.json()).reference).toBe("CAT-TEST-1");
    expect(mocks.rpc).toHaveBeenCalledWith("submit_catering_request", expect.any(Object));
    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.deliver).not.toHaveBeenCalled();
    await mocks.after.mock.calls[0][0]();
    expect(mocks.deliver).toHaveBeenCalledTimes(1);
  });
  it("does not schedule an email when the request transaction fails", async () => {
    mocks.rpc.mockImplementation(async (name: string) => name === "consume_rate_limit" ? { data: true, error: null } : { data: null, error: { message: "REQUESTS_PAUSED" } });
    expect((await send()).status).toBe(503);
    expect(mocks.after).not.toHaveBeenCalled();
  });
  it("logs worker failures without turning an already saved request into a failed submission", async () => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.deliver.mockRejectedValue(new Error("Database unavailable"));
    expect((await send()).status).toBe(201);
    await mocks.after.mock.calls[0][0]();
    expect(logger).toHaveBeenCalledWith(expect.stringContaining("saved jobs remain"), expect.any(Error));
  });
});
