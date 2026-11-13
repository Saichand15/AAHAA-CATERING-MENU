import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("../src/lib/supabase", () => ({ serviceDb: () => mocks }));
import { GET, POST } from "../src/app/api/webhooks/whatsapp/route";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("WHATSAPP_APP_SECRET", "test-app-secret");
  vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "test-verify-token");
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "12345");
  mocks.rpc.mockResolvedValue({ data: true, error: null });
});
afterEach(() => vi.unstubAllEnvs());
describe("WhatsApp delivery webhooks", () => {
  it("verifies the subscription challenge only with the correct token", async () => {
    const good = await GET(new Request("https://example.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=123"));
    expect(good.status).toBe(200); expect(await good.text()).toBe("123");
    expect((await GET(new Request("https://example.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123"))).status).toBe(403);
  });
  it("rejects unsigned events before calling the database", async () => {
    expect((await POST(new Request("https://example.com/api/webhooks/whatsapp", { method: "POST", body: "{}" }))).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("records a signed delivery event only for the configured phone and send attempt", async () => {
    const id = "d29ab036-a036-4ca1-8f53-75b8f0f8ce88", token = "dcf7911f-d8ab-4b8e-a830-acb4bdcf0587";
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [{ changes: [{ value: { metadata: { phone_number_id: "12345" }, statuses: [{ id: "wamid.test", status: "delivered", timestamp: String(Math.floor(Date.now() / 1000)), biz_opaque_callback_data: `${id}:${token}` }] } }] }] });
    const signature = "sha256=" + createHmac("sha256", "test-app-secret").update(body).digest("hex");
    const response = await POST(new Request("https://example.com/api/webhooks/whatsapp", { method: "POST", headers: { "x-hub-signature-256": signature }, body }));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("record_whatsapp_status", expect.objectContaining({ p_id: id, p_send_token: token, p_status: "delivered", p_provider_id: "wamid.test" }));
  });
});
