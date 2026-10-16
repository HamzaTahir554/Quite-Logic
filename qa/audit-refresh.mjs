import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch();
const result = {
  environment: "Local Windows / headless Chromium / production build",
  routes: [],
  errors: [],
};
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "no-preference",
  });
  result.blankPageFrameSample = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let count = 0,
          start = performance.now();
        function frame(now) {
          count++;
          if (now - start < 1800) requestAnimationFrame(frame);
          else resolve({ frames: count, elapsedMs: Math.round(now - start) });
        }
        requestAnimationFrame(frame);
      }),
  );
  page.on("pageerror", (e) => result.errors.push(e.message));
  await page.addInitScript(() => {
    window.refreshCLS = 0;
    window.refreshShifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        if (!entry.hadRecentInput) {
          window.refreshCLS += entry.value;
          window.refreshShifts.push({
            time: entry.startTime,
            value: entry.value,
            sources: entry.sources.map((s) => ({
              tag: s.node?.tagName,
              class: s.node?.className,
              previous: s.previousRect,
              current: s.currentRect,
            })),
          });
        }
    }).observe({ type: "layout-shift", buffered: true });
  });
  for (const route of ["/services", "/contact"]) {
    await page.goto("http://localhost:3100" + route);
    await page.waitForFunction(
      () => document.documentElement.dataset.studioReady === "true",
    );
    await page.evaluate(() => document.fonts.ready);
    const target = page
      .locator(route === "/services" ? ".service-art-frame" : ".banner-motion")
      .first();
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const bounds = await target.boundingBox();
    const sample = page.evaluate(
      () =>
        new Promise((resolve) => {
          const samples = [];
          let previous = performance.now(),
            start = previous;
          function frame(now) {
            samples.push(now - previous);
            previous = now;
            if (now - start < 1800) requestAnimationFrame(frame);
            else {
              samples.sort((a, b) => a - b);
              resolve({
                frames: samples.length,
                p95FrameMs: Number(
                  samples[Math.floor(samples.length * 0.95)].toFixed(2),
                ),
                cls: window.refreshCLS,
              });
            }
          }
          requestAnimationFrame(frame);
        }),
    );
    for (let i = 0; i < 35; i++) {
      await page.mouse.move(
        bounds.x + bounds.width * (0.3 + i / 90),
        bounds.y + bounds.height * 0.5,
      );
      await page.waitForTimeout(30);
    }
    result.routes.push({
      route,
      ...(await sample),
      shifts: await page.evaluate(() => window.refreshShifts),
      horizontalOverflow: await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    });
  }
  result.note =
    "A short local RAF sample is not a cross-device frame-rate guarantee.";
  await writeFile("qa/refresh-metrics.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
