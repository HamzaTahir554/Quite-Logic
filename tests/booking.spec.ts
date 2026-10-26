import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import {
  mockCalendly,
  widgetScript,
  calendarFixture,
} from "./fixtures/calendly";
import { chooseTheme } from "./fixtures/theme";
const scriptUrl = "https://assets.calendly.com/assets/external/widget.js";
async function openContact(page: Page) {
  await page
    .locator("#book-call")
    .getByRole("button", { name: "Book a Meeting", exact: true })
    .click();
  return page.getByRole("dialog", { name: "Book a Meeting" });
}

test("header CTA opens official Calendly on demand, retains vendor booking and makes no custom booking API calls", async ({
  page,
}) => {
  let widgetRequests = 0;
  const customRequests: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (request.url() === scriptUrl) widgetRequests++;
    if (
      /\/api\/(?:meetings|admin\/meetings)|https:\/\/api\.calendly\.com\//.test(
        request.url(),
      )
    )
      customRequests.push(request.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await mockCalendly(page);
  await page.goto("/contact");
  await expect(page.locator("html")).toHaveAttribute(
    "data-studio-ready",
    "true",
  );
  expect(widgetRequests).toBe(0);
  const trigger = page
    .locator(".site-header")
    .getByRole("button", { name: "Book a Meeting", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Book a Meeting" });
  const iframe = dialog.locator("iframe");
  await expect(iframe).toHaveCount(1);
  await expect(iframe).toHaveAttribute(
    "src",
    /^https:\/\/calendly.com\/company-quitelogic\/30min\?/,
  );
  await expect(iframe).toHaveAttribute("title", /Book a 30-minute meeting/);
  await expect(dialog.locator(".booking-calendar")).toHaveAttribute(
    "data-calendar-state",
    "ready",
  );
  const frame = dialog.frameLocator("iframe");
  await expect(frame.getByText("Powered by Calendly")).toBeVisible();
  await frame.getByRole("button", { name: "Tuesday, 20 October" }).click();
  await frame.getByRole("button", { name: "10:00 AM", exact: true }).click();
  await frame.getByLabel("Name", { exact: true }).fill("Calendar Test");
  await frame
    .getByLabel("Email", { exact: true })
    .fill("calendar@example.test");
  await frame.getByRole("button", { name: "Schedule Event" }).click();
  await expect(
    frame.getByRole("heading", { name: "You are scheduled" }),
  ).toBeVisible();
  await expect(frame.getByText("Powered by Calendly")).toBeVisible();
  await expect(
    dialog.locator(".calendar-days,.meeting-details,.booking-progress"),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("link", { name: /Open Calendly in a new tab/ }),
  ).toHaveAttribute("href", "https://calendly.com/company-quitelogic/30min");
  await dialog.getByRole("button", { name: "Close booking" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog.locator("iframe")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(widgetRequests).toBe(1);
  expect(customRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("Contact booking and unmasked Calendly frames fit all requested mobile/tablet widths and both themes", async ({
  page,
}) => {
  await mkdir("qa/calendly-reset", { recursive: true });
  await mockCalendly(page);
  await page.goto("/contact");
  for (const theme of ["day", "night"] as const) {
    await chooseTheme(page, theme);
    for (const width of [320, 375, 390, 425, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const dialog = await openContact(page);
      const iframe = dialog.locator("iframe");
      await expect(iframe).toBeVisible();
      await expect(iframe).toHaveAttribute(
        "src",
        theme === "day" ? /background_color=e8ecf1/ : /background_color=303944/,
      );
      const bounds = (await dialog.boundingBox())!,
        frame = (await iframe.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(frame.width).toBeGreaterThanOrEqual(320);
      expect(frame.x).toBeGreaterThanOrEqual(0);
      expect(frame.x + frame.width).toBeLessThanOrEqual(width);
      expect(frame.height).toBeGreaterThanOrEqual(650);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        dialog.getByRole("button", { name: "Close booking" }),
      ).toBeVisible();
      await expect(
        dialog.getByRole("link", { name: /Open Calendly in a new tab/ }),
      ).toBeVisible();
      if ([320, 768, 1440].includes(width))
        await page.screenshot({
          path: `qa/calendly-reset/${theme}-${width}.png`,
        });
      await dialog.getByRole("button", { name: "Close booking" }).click();
      await expect(dialog).toHaveCount(0);
    }
  }
});

test("blocked widget shows a persistent direct link and retries without stale loading or duplicate frames", async ({
  page,
}) => {
  let blocked = true;
  await page.route(scriptUrl, (route) =>
    blocked
      ? route.abort("failed")
      : route.fulfill({ contentType: "text/javascript", body: widgetScript }),
  );
  await page.route("https://calendly.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: calendarFixture }),
  );
  await page.goto("/contact");
  const dialog = await openContact(page);
  await expect(dialog.locator(".booking-calendar")).toHaveAttribute(
    "data-calendar-state",
    "error",
  );
  await expect(
    dialog.getByRole("link", { name: /Open Calendly in a new tab/ }),
  ).toBeVisible();
  blocked = false;
  await dialog.getByRole("button", { name: "Try again" }).click();
  await expect(dialog.locator(".booking-calendar")).toHaveAttribute(
    "data-calendar-state",
    "ready",
  );
  await expect(dialog.locator("iframe")).toHaveCount(1);
  await expect(dialog.locator(".booking-calendar-notice")).toHaveCount(0);
});

test("closing while the widget loads never initializes an abandoned iframe and reopening stays usable", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route(scriptUrl, async (route) => {
    await gate;
    await route.fulfill({ contentType: "text/javascript", body: widgetScript });
  });
  await page.route("https://calendly.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: calendarFixture }),
  );
  try {
    await page.goto("/contact");
    const requested = page.waitForRequest(scriptUrl);
    const dialog = await openContact(page);
    await requested;
    await dialog.getByRole("button", { name: "Close booking" }).click();
    await expect(dialog).toHaveCount(0);
    release();
    await expect
      .poll(() => page.evaluate(() => "Calendly" in window))
      .toBe(true);
    await expect(page.locator("iframe")).toHaveCount(0);
    await openContact(page);
    await expect(dialog.locator("iframe")).toHaveCount(1);
    await expect(dialog.locator(".booking-calendar")).toHaveAttribute(
      "data-calendar-state",
      "ready",
    );
  } finally {
    release();
  }
});

test("obsolete scheduling endpoints are absent", async ({ request }) => {
  for (const path of [
    "/api/meetings/availability",
    "/api/meetings/book",
    "/api/meetings/hold",
    "/api/meetings/webhook",
  ])
    expect((await request.get(path)).status(), path).toBe(404);
});
