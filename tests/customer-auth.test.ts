import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { customerPassword, customerProfileSchema, customerRedirect } from "../src/lib/customer-validation";
const mocks = vi.hoisted(() => ({
  auth: { signInWithPassword: vi.fn(), signUp: vi.fn(), resend: vi.fn(), resetPasswordForEmail: vi.fn(), signOut: vi.fn() },
  rpc: vi.fn(),
}));
vi.mock("../src/lib/supabase", () => ({ sessionDb: async () => ({ auth: mocks.auth }), serviceDb: () => ({ rpc: mocks.rpc }) }));
import { POST } from "../src/app/api/customer/auth/route";
import { customerAuthTestEmail } from "../src/lib/customer";

beforeEach(() => {
  vi.clearAllMocks();
  for (const [key, value] of Object.entries({
    APP_URL: "https://catering.example.com", CUSTOMER_AUTH_ENABLED: "true", RATE_LIMIT_SECRET: "test-only-secret-with-at-least-32-characters",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-public", SUPABASE_SERVICE_ROLE_KEY: "test-server",
  })) vi.stubEnv(key, value);
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.auth.signOut.mockResolvedValue({ error: null });
  mocks.auth.signUp.mockResolvedValue({ error: null, data: { session: null } });
  mocks.auth.resend.mockResolvedValue({ error: null });
  mocks.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());
const call = (body: unknown, origin = "https://catering.example.com") => POST(new Request("https://catering.example.com/api/customer/auth", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) }));
const signup = { action: "signup", email: "customer@example.com", password: "StrongPassword123", captcha_token: "" };

describe("customer account API", () => {
  it("allows other emails when accounts are enabled even if a local test email remains configured", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CUSTOMER_AUTH_TEST_EMAIL", "restricted@example.com");
    expect(customerAuthTestEmail()).toBeNull();
    const response = await call(signup);
    expect(response.status).toBe(200);
    expect(mocks.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: signup.email }));
  });
  it("limits local test accounts to one email and never enables production using the test setting", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CUSTOMER_AUTH_ENABLED", "false");
    vi.stubEnv("CUSTOMER_AUTH_TEST_EMAIL", signup.email);
    vi.stubEnv("APP_URL", "http://localhost:3000");
    expect(customerAuthTestEmail()).toBe(signup.email);
    const request = (email: string) => new Request("http://localhost:3000/api/customer/auth", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify({ ...signup, email }) });
    expect((await POST(request("other@example.com"))).status).toBe(403);
    expect(mocks.auth.signUp).not.toHaveBeenCalled();
    expect((await POST(request(signup.email))).status).toBe(200);
    vi.stubEnv("NODE_ENV", "production");
    expect(customerAuthTestEmail()).toBeNull();
    expect((await POST(request(signup.email))).status).toBe(503);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_URL", "https://public.example.com");
    expect(customerAuthTestEmail()).toBeNull();
    vi.stubEnv("APP_URL", "invalid address");
    expect(customerAuthTestEmail()).toBeNull();
  });
  it.each(["login", "signup", "reset", "resend"])("rejects non-allowlisted %s attempts before contacting Supabase", async action => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv("CUSTOMER_AUTH_ENABLED", "false");
    vi.stubEnv("CUSTOMER_AUTH_TEST_EMAIL", "allowed@example.com");
    const response = await call({ ...signup, action }, "http://localhost:3000");
    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
    for (const method of [mocks.auth.signInWithPassword, mocks.auth.signUp, mocks.auth.resend, mocks.auth.resetPasswordForEmail]) expect(method).not.toHaveBeenCalled();
  });
  it("requests verified signup through Supabase without granting staff access", async () => {
    const response = await call(signup);
    expect(response.status).toBe(200);
    expect(mocks.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ emailRedirectTo: "https://catering.example.com/auth/callback" }) }));
    expect((await response.json()).message).toContain("verification");
    expect(mocks.auth.signOut).toHaveBeenCalled();
  });
  it("does not authenticate an unverified email", async () => {
    mocks.auth.signInWithPassword.mockResolvedValue({ error: null, data: { user: { email_confirmed_at: null } } });
    const response = await call({ ...signup, action: "login" });
    expect(response.status).toBe(401);
    expect(mocks.auth.signOut).toHaveBeenCalled();
  });
  it("returns a signed-in response only after verified authentication", async () => {
    mocks.auth.signInWithPassword.mockResolvedValue({ error: null, data: { user: { email_confirmed_at: "2026-01-01" } } });
    expect(await (await call({ ...signup, action: "login" })).json()).toMatchObject({ signedIn: true });
  });
  it("uses the password-reset callback and a non-enumerating response", async () => {
    const response = await call({ action: "reset", email: signup.email, captcha_token: "" });
    expect(response.status).toBe(200);
    expect(mocks.auth.resetPasswordForEmail).toHaveBeenCalledWith(signup.email, expect.objectContaining({ redirectTo: "https://catering.example.com/auth/callback?next=/account/password" }));
    expect((await response.json()).message).toContain("If the address has an account");
  });
  it("enforces origin, setup gate, rate limits and strong passwords", async () => {
    expect((await call(signup, "https://untrusted.example")).status).toBe(403);
    expect((await call({ ...signup, password: "short" })).status).toBe(400);
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    expect((await call(signup)).status).toBe(429);
    vi.stubEnv("CUSTOMER_AUTH_ENABLED", "false");
    expect((await call(signup)).status).toBe(503);
  });
  it("restricts callback destinations and profile values", () => {
    expect(customerRedirect("https://untrusted.example")).toBe("/account");
    expect(customerRedirect("//untrusted.example")).toBe("/account");
    expect(customerRedirect("/account/password")).toBe("/account/password");
    expect(customerPassword.safeParse("StrongPassword123").success).toBe(true);
    expect(customerPassword.safeParse("alllowercasepassword").success).toBe(false);
    expect(customerProfileSchema.safeParse({ full_name: "Test Customer", phone: "123" }).success).toBe(false);
  });
});
