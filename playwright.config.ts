import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;
// Optional: point at an existing Chromium (e.g. in CI images with preinstalled browsers).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1366, height: 860 } } },
    { name: "tablet", use: { browserName: "chromium", viewport: { width: 820, height: 1180 }, hasTouch: true } },
    { name: "mobile", use: { browserName: "chromium", viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true } },
  ],
  webServer: {
    // Dev server with the in-memory store so the invite flow can be exercised without Firebase.
    command: `npx next dev -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      DEV_MEMORY_STORE: "true",
      NEXT_TELEMETRY_DISABLED: "1",
      RATE_LIMIT_INVITE_PER_IP: "100",
      RATE_LIMIT_PILOT_PER_IP: "100",
      // Signed links work without an email provider; no email is actually sent in tests.
      EMAIL_TOKEN_SECRET: "e2e-email-token-secret-0123456789abcdef",
      // Pin everything a developer's .env.development.local might change, so results are reproducible.
      // (Real environment variables take precedence over .env files in Next.js.)
      AI_PROVIDER: "none",
      EMAIL_DEV_OUTBOX: "false",
      NEXT_PUBLIC_ADS_PREVIEW: "false",
      NEXT_PUBLIC_GA_MEASUREMENT_ID: "",
      NEXT_PUBLIC_GOOGLE_PLAY_URL: "",
      NEXT_PUBLIC_APP_STORE_URL: "",
    },
  },
});
