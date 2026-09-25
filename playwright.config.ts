import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the production build, served the way GitHub
// Pages serves it (e2e/serve.mjs). Build first: npm run build && npm run test:e2e
const PORT = 4173;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}/Cookbook/`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `node e2e/serve.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/Cookbook/`,
    reuseExistingServer: !process.env.CI,
  },
});
