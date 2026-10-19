import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { mockCalendly, widgetScript } from "./fixtures/calendly";

test("booking follows trusted calendar events, retains vendor branding and confirms only after completion", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockCalendly(page);
  let scriptRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("assets.calendly.com")) scriptRequests++;
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/contact");
  expect(scriptRequests).toBe(0);
  const trigger = page
    .locator("#book-call")
    .getByRole("button", { name: "Book a Meeting" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  const frame = dialog.frameLocator("iframe");
  const progress = dialog.getByRole("list", { name: "Booking progress" });
  await expect(dialog.locator(".booking-calendar")).toHaveAttribute(
    "data-calendar-state",
    "ready",
  );
  await expect(progress.locator('[aria-current="step"]')).toHaveText(
    /Choose a time/,
  );
  const src = new URL((await dialog.locator("iframe").getAttribute("src"))!);
  expect(src.origin + src.pathname).toBe(
    "https://calendly.com/company-quitelogic/30min",
  );
  expect(src.searchParams.get("background_color")).toBe("303944");
  expect(src.searchParams.get("text_color")).toBe("f0f1f8");
  expect(src.searchParams.get("primary_color")).toBe("2f80fe");
  expect(src.searchParams.get("hide_event_type_details")).toBe("1");
  expect(src.searchParams.has("hide_gdpr_banner")).toBe(false);
  expect(src.searchParams.has("branding")).toBe(false);
  await expect(
    dialog.getByRole("link", { name: /Open Calendly/ }),
  ).toHaveAttribute("href", "https://calendly.com/company-quitelogic/30min");
  await expect(frame.getByText("Powered by Calendly")).toBeVisible();
  await mkdir("qa/booking", { recursive: true });
  await dialog.screenshot({ path: "qa/booking/desktop-calendar-fixture.png" });
  await page.evaluate(() => {
    const source = document.querySelector<HTMLIFrameElement>(
      ".booking-frame iframe",
    )!.contentWindow;
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://evil.example",
        source,
        data: { event: "calendly.event_scheduled" },
      }),
    );
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://calendly.com",
        source: window,
        data: { event: "calendly.event_scheduled" },
      }),
    );
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://calendly.com",
        source,
        data: null,
      }),
    );
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://calendly.com",
        source,
        data: { event: "calendly.unknown" },
      }),
    );
  });
  await expect(progress.locator('[aria-current="step"]')).toHaveText(
    /Choose a time/,
  );
  await expect(dialog.getByText("You’re booked.")).toHaveCount(0);
  await frame
    .getByRole("button", { name: "Tuesday, 20 October", exact: true })
    .click();
  await expect(progress.locator('[aria-current="step"]')).toHaveText(
    /Choose a time/,
  );
  await frame.getByRole("button", { name: "10:00 AM", exact: true }).click();
  await expect(progress.locator('[aria-current="step"]')).toHaveText(
    /Your details/,
  );
  await expect(dialog.getByText("You’re booked.")).toHaveCount(0);
  await frame.getByRole("button", { name: "Choose another time" }).click();
  await expect(progress.locator('[aria-current="step"]')).toHaveText(
    /Choose a time/,
  );
  await frame.getByRole("button", { name: "10:00 AM", exact: true }).click();
  await frame.getByLabel("Name", { exact: true }).fill("Fixture Client");
  await frame.getByLabel("Email", { exact: true }).fill("fixture@example.test");
  await frame
    .getByLabel("What would you like to discuss?")
    .fill(
      "Testing the host page's booking progress without a real appointment.",
    );
  await dialog.screenshot({ path: "qa/booking/desktop-details-fixture.png" });
  await frame
    .getByRole("button", { name: "Schedule Event", exact: true })
    .click();
  await expect(progress.locator('[aria-current="step"]')).toHaveText(
    /Confirmed/,
  );
  await expect(dialog.getByText("You’re booked.")).toBeVisible();
  await expect(dialog.locator(".booking-header-check")).toBeVisible();
  await expect(dialog.locator(".booking-confirmed-label")).toHaveText(
    /Confirmed/,
  );
  await expect(frame.getByText("Powered by Calendly")).toBeVisible();
  await expect(dialog.locator("iframe")).toBeVisible();
  await dialog.screenshot({
    path: "qa/booking/desktop-confirmation-fixture.png",
  });
  await dialog.getByRole("button", { name: "Close booking" }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(progress.locator('[aria-current="step"]')).toHaveText(
    /Choose a time/,
  );
  await expect(dialog.locator("iframe")).toHaveCount(1);
  await expect(
    frame.getByRole("heading", { name: "Select a date & time" }),
  ).toBeVisible();
  expect(scriptRequests).toBe(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("booking shell stays usable across sizes, keyboard, touch and reduced motion", async ({
  page,
  browser,
  baseURL,
}) => {
  await mockCalendly(page);
  await page.goto("/contact");
  await mkdir("qa/booking", { recursive: true });
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page
      .getByRole("button", { name: "Book a Meeting" })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator(".booking-calendar")).toHaveAttribute(
      "data-calendar-state",
      "ready",
    );
    const size = await dialog.evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      contentWidth: element.scrollWidth,
      pageWidth: document.documentElement.scrollWidth,
    }));
    expect(size.width).toBeLessThanOrEqual(width);
    expect(size.contentWidth).toBeLessThanOrEqual(size.width + 1);
    expect(size.pageWidth).toBeLessThanOrEqual(width);
    await expect(dialog.locator(".booking-step-copy")).toHaveCSS(
      "animation-name",
      "none",
    );
    await dialog
      .frameLocator("iframe")
      .getByRole("button", { name: "Tuesday, 20 October", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      dialog
        .frameLocator("iframe")
        .getByRole("button", { name: "10:00 AM", exact: true }),
    ).toBeVisible();
    await dialog.screenshot({
      path: `qa/booking/booking-${width}-fixture.png`,
    });
    await dialog.getByRole("button", { name: "Close booking" }).click();
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Book a Meeting" })
    .click();
  await expect(page.locator(".booking-step-copy")).toHaveCSS(
    "animation-duration",
    "0.3s",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".booking-step-copy")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.getByRole("button", { name: "Close booking" }).click();
  const touch = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference",
  });
  try {
    const mobile = await touch.newPage();
    await mockCalendly(mobile);
    await mobile.goto("/contact");
    await mobile
      .getByRole("button", { name: "Book a Meeting" })
      .first()
      .tap();
    const dialog = mobile.getByRole("dialog");
    const frame = dialog.frameLocator("iframe");
    await frame
      .getByRole("button", { name: "Tuesday, 20 October", exact: true })
      .tap();
    await frame.getByRole("button", { name: "10:00 AM", exact: true }).tap();
    await expect(dialog.locator('[aria-current="step"]')).toHaveText(
      /Your details/,
    );
    await frame.getByLabel("Name", { exact: true }).fill("Mobile Fixture");
    await frame
      .getByLabel("Email", { exact: true })
      .fill("mobile@example.test");
    await frame.getByRole("button", { name: "Schedule Event" }).tap();
    await expect(dialog.locator('[aria-current="step"]')).toHaveText(
      /Confirmed/,
    );
    await dialog.screenshot({
      path: "qa/booking/mobile-confirmation-fixture.png",
    });
  } finally {
    await touch.close();
  }
});

test("booking recovers from blocked widget scripts with a retry and permanent fallback", async ({
  page,
}) => {
  await mockCalendly(page);
  let attempts = 0;
  await page.route(
    "https://assets.calendly.com/assets/external/widget.js",
    (route) => {
      attempts++;
      return attempts === 1
        ? route.abort()
        : route.fulfill({ contentType: "text/javascript", body: widgetScript });
    },
  );
  await page.goto("/contact");
  await page
    .locator(".site-header")
    .getByRole("button", { name: "Book a Meeting" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toContainText("couldn’t load");
  await expect(
    dialog.getByRole("link", { name: /Open Calendly/ }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Try again" }).click();
  await expect(dialog.locator(".booking-calendar")).toHaveAttribute(
    "data-calendar-state",
    "ready",
  );
  await expect(dialog.locator("iframe")).toHaveCount(1);
  expect(attempts).toBe(2);
});

test("a slow calendar can be closed before loading and reopened without stale initialization", async ({
  page,
}) => {
  await page.clock.install();
  await mockCalendly(page);
  let release!: () => void;
  const paused = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "https://assets.calendly.com/assets/external/widget.js",
    async (route) => {
      await paused;
      await route.fulfill({
        contentType: "text/javascript",
        body: widgetScript,
      });
    },
  );
  await page.goto("/contact");
  const trigger = page
    .locator(".site-header")
    .getByRole("button", { name: "Book a Meeting" });
  await trigger.click();
  await expect(page.locator(".booking-calendar")).toHaveAttribute(
    "data-calendar-state",
    "loading",
  );
  await page.clock.fastForward(12001);
  await expect(page.locator(".booking-calendar")).toHaveAttribute(
    "data-calendar-state",
    "slow",
  );
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await page.getByRole("button", { name: "Close booking" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  release();
  await expect.poll(() => page.evaluate(() => "Calendly" in window)).toBe(true);
  await expect(page.locator("iframe")).toHaveCount(0);
  await trigger.click();
  await expect(page.locator(".booking-calendar")).toHaveAttribute(
    "data-calendar-state",
    "ready",
  );
  await expect(page.locator(".booking-frame iframe")).toHaveCount(1);
});
