import { defineConfig } from "@playwright/test";
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  timeout: 120000,
  use: {
    baseURL,
    browserName: "chromium",
    headless: true,
    reducedMotion: "reduce",
    colorScheme: "dark",
    trace: "retain-on-failure",
    actionTimeout: 10000,
  },
  webServer: {
    command: "npm.cmd start -- --port " + (new URL(baseURL).port || "3000"),
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
