import { afterEach, describe, expect, it, vi } from "vitest";
import { submissionBlockers } from "../src/lib/config";
afterEach(() => vi.unstubAllEnvs());
describe("launch protection", () => {
  it("does not consider a project URL alone a connected application", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    for (const name of ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "EMAIL_FROM", "CRON_SECRET", "RATE_LIMIT_SECRET", "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"]) vi.stubEnv(name, "");
    expect(submissionBlockers()).toContain("Database connection");
    expect(submissionBlockers()).toContain("Email delivery");
  });
  it("never permits the development spam bypass in production", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("ALLOW_LOCAL_SUBMISSIONS", "true");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", ""); vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(submissionBlockers()).toContain("Spam protection");
  });
});
