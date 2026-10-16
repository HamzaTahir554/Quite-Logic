import { test, expect } from "@playwright/test";

test("banner layers react within bounds on all pages and reset with reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of [
    "/",
    "/services",
    "/about",
    "/work",
    "/portfolio",
    "/portfolio/atlas-cloud",
    "/portfolio/nexa-ops",
    "/portfolio/pulse-crm",
    "/contact",
  ]) {
    await page.goto(route);
    await expect(page.locator("html")).toHaveAttribute(
      "data-studio-ready",
      "true",
    );
    const banner = page.locator(
      route === "/"
        ? ".reference-hero"
        : route === "/portfolio/atlas-cloud"
          ? ".atlas-primary"
          : ".banner-motion",
    );
    await banner.scrollIntoViewIfNeeded();
    const bounds = (await banner.boundingBox())!;
    await page.mouse.move(
      bounds.x + bounds.width * 0.85,
      bounds.y + bounds.height * 0.6,
    );
    const heading = page.locator("h1");
    await expect
      .poll(() =>
        heading.evaluate(
          (el) => parseFloat((el as HTMLElement).style.translate) || 0,
        ),
      )
      .toBeGreaterThan(1);
    const translation = await heading.evaluate((el) =>
      (el as HTMLElement).style.translate.split(" ").map(parseFloat),
    );
    expect(Math.abs(translation[0])).toBeLessThanOrEqual(6);
    expect(Math.abs(translation[1])).toBeLessThanOrEqual(4);
    await expect(heading).toHaveCSS("filter", "none");
    await page.locator("header .brand").hover();
    await expect
      .poll(() => heading.evaluate((el) => (el as HTMLElement).style.translate))
      .toBe("");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.mouse.move(
      bounds.x + bounds.width * 0.85,
      bounds.y + bounds.height * 0.6,
    );
    await expect(heading).toHaveCSS("translate", "none");
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
  expect(errors).toEqual([]);
});

test("booking stays on site, loads only on demand and closes accessibly", async ({
  page,
}) => {
  let requests = 0;
  await page.route("https://calendly.com/**", async (route) => {
    requests++;
    await route.fulfill({
      contentType: "text/html",
      body: "<html><body><h1>Booking calendar</h1></body></html>",
    });
  });
  await page.goto("/contact");
  await expect(
    page.getByRole("link", {
      name: "company.quitelogic@gmail.com",
      exact: true,
    }),
  ).toHaveAttribute("href", "mailto:company.quitelogic@gmail.com");
  await expect(
    page.getByRole("heading", { name: "Send us a message", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Book a call", exact: true }),
  ).toBeVisible();
  expect(requests).toBe(0);
  const trigger = page
    .locator("#book-call")
    .getByRole("button", { name: "Book a Meeting" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("iframe")).toHaveAttribute(
    "src",
    /^https:\/\/calendly.com\/company-quitelogic\/30min\?/,
  );
  await expect(dialog.locator("iframe")).toHaveAttribute(
    "title",
    /30-minute meeting/,
  );
  await expect.poll(() => requests).toBe(1);
  await expect(page).toHaveURL("/contact");
  await dialog.getByRole("button", { name: "Close booking" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page
    .locator("header")
    .getByRole("button", { name: "Book a Meeting" })
    .click();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  for (const width of [320, 375, 768]) {
    await page.setViewportSize({ width, height: 812 });
    await trigger.click();
    const rect = (await dialog.boundingBox())!;
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await dialog.getByRole("button", { name: "Close booking" }).click();
  }
});

test("touch devices retain still banner text and native scrolling", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 375, height: 812 },
    reducedMotion: "no-preference",
  });
  try {
    const page = await context.newPage();
    for (const route of ["/", "/contact"]) {
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute(
        "data-studio-ready",
        "true",
      );
      await page.mouse.move(300, 300);
      await expect(page.locator("h1")).toHaveCSS("translate", "none");
      await expect(page.locator(".studio-cursor")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  } finally {
    await context.close();
  }
});
