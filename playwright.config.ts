import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 2,
  timeout: 90000,
  use: {
    baseURL: "http://localhost:3102",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "android-chromium", use: { browserName: "chromium", isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
    { name: "iphone-webkit", use: { browserName: "webkit", isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
  webServer: {
    env: { TURNSTILE_SECRET_KEY: "", ALLOW_LOCAL_SUBMISSIONS: "false" },
    command: "node node_modules/next/dist/bin/next start --port 3102",
    url: "http://localhost:3102",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
