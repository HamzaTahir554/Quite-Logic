import { chromium } from "@playwright/test";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page.on("requestfailed", (r) =>
    console.log(
      "Request failed:",
      new URL(r.url()).hostname,
      r.failure()?.errorText,
    ),
  );
  await page.goto("http://localhost:3100/contact");
  await page.locator("#book-call button").click();
  const frame = page.frameLocator(".booking-frame iframe");
  await frame.locator("body").waitFor();
  await frame
    .getByText(/Select a Date|30 min|30 Minute/i)
    .first()
    .waitFor({ timeout: 30000 })
    .catch(() => {});
  console.log(
    "Booking headings:",
    await frame.locator("h1,h2").allTextContents(),
  );
  console.log(
    "Booking text:",
    (await frame.locator("body").innerText()).slice(0, 600),
  );
  await page.screenshot({ path: "qa/screenshots/booking-desktop.png" });
} finally {
  await browser.close();
}
