import { defineConfig, devices } from "@playwright/test";

const WEB_PORT = 3100;
const WEB_BASE_URL = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: "./test/smoke",
  timeout: 30_000,
  fullyParallel: true,
  expect: {
    timeout: 5_000
  },
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL: WEB_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ],
  webServer: {
    command: `pnpm --filter @tabletop-booking/web exec next dev --port ${WEB_PORT}`,
    url: WEB_BASE_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI
  }
});
