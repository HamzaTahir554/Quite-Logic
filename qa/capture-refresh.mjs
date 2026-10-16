import { chromium } from "@playwright/test";
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3100";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  for (const route of ["/", "/services", "/contact"]) {
    await page.goto(baseURL + route);
    await page.evaluate(() => document.fonts.ready);
    const selector =
      route === "/services"
        ? ".service-editorial"
        : route === "/contact"
          ? ".contact-layout"
          : ".reference-hero";
    const section = page.locator(selector).first();
    await section.scrollIntoViewIfNeeded();
    for (const image of await section.locator("img").all())
      await image.evaluate((el) => el.decode());
    await page.screenshot({
      path: `qa/screenshots/refresh-${route.slice(1) || "home"}-desktop.png`,
    });
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(baseURL + "/contact");
  await page.screenshot({
    path: "qa/screenshots/contact-mobile.png",
    fullPage: true,
  });
} finally {
  await browser.close();
}
