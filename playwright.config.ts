import { defineConfig, devices } from "@playwright/test";

// Automated browser tests (tests/*.spec.ts), run with: npx playwright test
// They run against the production build: `npm run build` first; the server
// is started here (or an already running one on port 3100 is used).
// The installed Google Chrome is used (channel "chrome"), emulating an
// iPhone 15 Pro (393x852, touch, its user agent): no extra browser to
// download.
const iPhone = devices["iPhone 15 Pro"];

export default defineConfig({
  testDir: "tests",
  timeout: 15 * 60 * 1000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
  },
  projects: [
    {
      name: "iphone-15-pro",
      use: {
        channel: "chrome",
        viewport: iPhone.viewport,
        deviceScaleFactor: iPhone.deviceScaleFactor,
        isMobile: iPhone.isMobile,
        hasTouch: true,
        userAgent: iPhone.userAgent,
      },
    },
  ],
  webServer: {
    command: "npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 60 * 1000,
  },
});
