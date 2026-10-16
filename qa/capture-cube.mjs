import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3100";
await mkdir("qa/screenshots", { recursive: true });
const browser = await chromium.launch();
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["tablet", 768, 1000],
    ["mobile", 375, 812],
  ]) {
    const context = await browser.newContext({
      baseURL,
      viewport: { width, height },
      reducedMotion: "no-preference",
      ...(name === "mobile" ? { isMobile: true, hasTouch: true } : {}),
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const explorer = page.locator(".signature-explorer");
    await explorer.scrollIntoViewIfNeeded();
    if (name === "desktop") await explorer.locator("canvas").waitFor();
    await page
      .getByRole("group", { name: "Choose a service" })
      .getByRole("button", { name: /01 Web/ })
      .click();
    await page.waitForTimeout(1700);
    await explorer.screenshot({
      path: `qa/screenshots/service-cube-${name}.png`,
      style: ".studio-cursor{visibility:hidden!important}",
    });
    if (name === "desktop") {
      await page
        .getByRole("group", { name: "Choose a service" })
        .getByRole("button", { name: /Custom Software/ })
        .click();
      await page.waitForTimeout(1700);
      await explorer.screenshot({
        path: "qa/screenshots/service-cube-custom.png",
        style: ".studio-cursor{visibility:hidden!important}",
      });
      await page.goto("/");
      await page.waitForTimeout(1700);
      await page.screenshot({
        path: "qa/screenshots/smoky-home-motion.png",
        style: ".studio-cursor{visibility:hidden!important}",
      });
      await page.locator("footer").scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);
      await page.locator("footer").screenshot({
        path: "qa/screenshots/smoky-footer.png",
        style: ".studio-cursor{visibility:hidden!important}",
      });
    }
    console.log(JSON.stringify({ name, errors }));
    await context.close();
  }
} finally {
  await browser.close();
}
