import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir("qa/screenshots", { recursive: true });
const browser = await chromium.launch();
try {
  for (const [label, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 375, 812],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: "no-preference",
    });
    await page.goto("http://localhost:3000");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(4600);
    await page.screenshot({
      path: `qa/screenshots/hero-${label}-motion.png`,
      fullPage: false,
    });
    await page
      .locator(".reference-hero")
      .screenshot({ path: `qa/screenshots/hero-${label}-object.png` });
    if (label === "desktop") {
      await page.goto("http://localhost:3000/");
      await page.locator(".service-explorer").scrollIntoViewIfNeeded();
      await page.locator(".explorer-visual canvas").waitFor();
      await page
        .getByRole("group", { name: "Choose a service" })
        .getByRole("button", { name: /AI Automation/ })
        .click();
      await page.waitForTimeout(1000);
      await page
        .locator(".service-explorer")
        .screenshot({ path: "qa/screenshots/services-dice-motion.png" });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
