import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const baseURL = "http://localhost:3100";
const browser = await chromium.launch();
const page = await browser.newPage({
  baseURL,
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "no-preference",
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await mkdir("qa/screenshots", { recursive: true });
try {
  await page.goto("/portfolio");
  await page.waitForFunction(
    () => document.documentElement.dataset.studioReady === "true",
  );
  await page.waitForTimeout(300);
  await page.locator(".managed-project-card").first().scrollIntoViewIfNeeded();
  await page.mouse.move(3, 300);
  await page.screenshot({
    path: "qa/screenshots/portfolio-managed-default.png",
  });
  await page.locator(".managed-project-card").first().hover();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "qa/screenshots/portfolio-managed-hover.png" });
  const login = await page.request.post("/api/admin/login", {
    headers: { Origin: baseURL },
    data: { email: "admin@example.test", password: "Local-Test-Only-123456!" },
  });
  if (!login.ok()) throw new Error("Run the disposable test server first.");
  await page.goto("/admin/portfolio");
  await page
    .getByRole("button", { name: "Add project", exact: true })
    .waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "qa/screenshots/admin-portfolio.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/change-password");
  await page.getByLabel("Current password").waitFor();
  await page.screenshot({
    path: "qa/screenshots/admin-change-password-mobile.png",
    fullPage: true,
  });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw new Error("Admin mobile overflow.");
  await page.goto("/admin/forgot-password");
  await page.screenshot({
    path: "qa/screenshots/admin-forgot-password-mobile.png",
    fullPage: true,
  });
  console.log(JSON.stringify({ browserErrors: errors, screenshots: 5 }));
} finally {
  await browser.close();
}
