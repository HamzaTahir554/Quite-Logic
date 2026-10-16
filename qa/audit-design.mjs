import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3100";
const browser = await chromium.launch();
const result = {
  viewport: "1440 × 1000",
  environment: "Local Windows, headless Chromium, production Next.js build",
  errors: [],
};
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "no-preference",
  });
  page.on("pageerror", (error) => result.errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") result.errors.push(message.text());
  });
  await page.addInitScript(() => {
    window.designCLS = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        if (!entry.hadRecentInput) window.designCLS += entry.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(`${baseURL}/`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".hero-scene canvas").waitFor();
  await page.waitForTimeout(1800);
  result.homeInitialCLS = await page.evaluate(() => window.designCLS);
  await page.goto(`${baseURL}/`);
  const cube = page.locator(".signature-explorer");
  await cube.scrollIntoViewIfNeeded();
  await cube.locator("canvas").waitFor();
  result.renderingBackend = await cube.locator("canvas").evaluate((canvas) => {
    const gl = canvas.getContext("webgl2");
    const extension = gl.getExtension("WEBGL_debug_renderer_info");
    return extension
      ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
  });
  await page
    .getByRole("group", { name: "Choose a service" })
    .getByRole("button")
    .first()
    .click();
  await page.waitForTimeout(1400);
  await page.mouse.move(5, 400);
  result.serviceCube = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const times = [];
        let previous = performance.now(),
          start = previous;
        function sample(now) {
          times.push(now - previous);
          previous = now;
          if (now - start < 2000) requestAnimationFrame(sample);
          else {
            const mean =
              times.reduce((sum, value) => sum + value, 0) / times.length;
            times.sort((a, b) => a - b);
            resolve({
              frames: times.length,
              meanFrameMs: Number(mean.toFixed(2)),
              approximateRAFPerSecond: Number((1000 / mean).toFixed(1)),
              p95FrameMs: Number(
                times[Math.floor(times.length * 0.95)].toFixed(2),
              ),
            });
          }
        }
        requestAnimationFrame(sample);
      }),
  );
  result.colors = await page.evaluate(() => ({
    background: getComputedStyle(document.body).backgroundColor,
    card: getComputedStyle(document.querySelector(".signature-explorer"))
      .backgroundColor,
    footer: getComputedStyle(document.querySelector("footer")).backgroundColor,
    primaryText: getComputedStyle(document.body).color,
    accent: getComputedStyle(document.documentElement)
      .getPropertyValue("--blue")
      .trim(),
  }));
  result.notes =
    "A short local requestAnimationFrame sample measures this browser run only. It is not a cross-device FPS, GPU frame-time, or memory-leak guarantee.";
  await writeFile(
    "qa/design-metrics.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
