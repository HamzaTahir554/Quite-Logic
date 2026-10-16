import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
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
    await page.goto("/portfolio/atlas-cloud");
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.deployment-stage[data-started="true"]').waitFor();
    await page.waitForFunction(
      () =>
        Number(
          getComputedStyle(document.querySelector(".deployment-live")).opacity,
        ) === 1,
    );
    await page.screenshot({
      path: `qa/screenshots/atlas-${name}.png`,
      fullPage: true,
      style: ".studio-cursor{visibility:hidden!important}",
    });
    await page.locator(".atlas-primary").screenshot({
      path: `qa/screenshots/atlas-showcase-${name}.png`,
      style: ".studio-cursor{visibility:hidden!important}",
    });
    if (name === "desktop") {
      await page.goto("/");
      await page.locator(".atlas-showcase").scrollIntoViewIfNeeded();
      await page.locator('.deployment-stage[data-started="true"]').waitFor();
      await page.waitForFunction(
        () =>
          Number(
            getComputedStyle(document.querySelector(".deployment-live"))
              .opacity,
          ) === 1,
      );
      await page.locator(".atlas-showcase").screenshot({
        path: "qa/screenshots/atlas-home-card.png",
        style: ".studio-cursor{visibility:hidden!important}",
      });
    }
    await context.close();
  }
} finally {
  await browser.close();
}
