import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const baseURL = "http://localhost:3100";
const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL,
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await mkdir("qa/screenshots", { recursive: true });
const login = await context.request.post("/api/admin/login", {
  headers: { Origin: baseURL },
  data: { email: "admin@example.test", password: "Local-Test-Only-123456!" },
});
if (!login.ok()) throw new Error("Run the isolated test server first.");
const reviews = await (await context.request.get("/api/admin/reviews")).json();
const review = reviews.items.find((item) => item.name === "Form Test Client");
if (review)
  await context.request.post("/api/admin/reviews", {
    headers: { Origin: baseURL },
    data: { id: review.id, action: "Approve" },
  });
try {
  for (const [route, name] of [
    ["/admin", "admin-dashboard"],
    ["/admin/reviews", "admin-reviews"],
    ["/reviews", "client-reviews"],
  ]) {
    await page.goto(route);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `qa/screenshots/${name}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, name] of [
    ["/admin/messages", "admin-messages-mobile"],
    ["/reviews", "client-reviews-mobile"],
  ]) {
    await page.goto(route);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `qa/screenshots/${name}.png`,
      fullPage: true,
    });
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw new Error(`Overflow on ${route}`);
  }
  console.log(JSON.stringify({ screenshots: 5, browserErrors: errors }));
} finally {
  if (review)
    await context.request.post("/api/admin/reviews", {
      headers: { Origin: baseURL },
      data: { id: review.id, action: "Reject" },
    });
  await browser.close();
}
