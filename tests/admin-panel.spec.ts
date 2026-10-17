import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("admin login and recovery screens remain accessible at desktop, tablet and mobile sizes", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["login", "forgot-password", "reset-password"]) {
      await page.goto(`/admin/${route}`);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        /noindex/,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page.locator(".studio-cursor")).toHaveCount(0);
    }
  }
  for (const route of [
    "/admin",
    "/admin/reviews",
    "/admin/portfolio",
    "/admin/account",
    "/admin/settings",
  ]) {
    const response = await request.get(route, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe("/admin/login");
  }
  expect(errors).toEqual([]);
});

test("portfolio supports desktop hover, touch reveal and keyboard controls", async ({
  browser,
  baseURL,
}) => {
  const desktop = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "no-preference",
  });
  const page = await desktop.newPage();
  await mkdir("qa/admin-ux", { recursive: true });
  try {
    await page.goto("/portfolio");
    const card = page.locator(".managed-project-card").first();
    await card.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await expect(card).toHaveAttribute("data-open", "false");
    await expect(card.locator(".project-disclosure-hint")).toHaveCount(0);
    await card.hover();
    await expect(card).toHaveAttribute("data-open", "true");
    await expect(card.locator(".managed-project-description")).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(card.locator(".managed-project-description")).toHaveCSS(
      "filter",
      "none",
    );
    await page.locator(".managed-project-grid").screenshot({ path: "qa/admin-ux/public-cards-desktop.png" });
    await page.mouse.move(0, 0);
    await card.getByRole("button").focus();
    await page.keyboard.press("Space");
    await expect(card.getByRole("button")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await page.keyboard.press("Tab");
    await expect(card.getByRole("region")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(card.getByRole("link")).toBeFocused();
    const destination = await card.getByRole("link").getAttribute("href");
    await page.keyboard.press("Escape");
    await expect(card).toHaveAttribute("data-open", "false");
    await card.getByRole("button").click();
    await expect(page).toHaveURL(destination!);
    await page.goto("/portfolio");
    await card.hover();
    await card.click();
    await expect(page).toHaveURL(destination!);
    await page.goto("/portfolio");
    await card.hover();
    await card.locator(".project-description-copy").click();
    await expect(page).toHaveURL(destination!);
  } finally {
    await desktop.close();
  }
  for (const width of [390, 768]) {
    const touch = await browser.newContext({
      baseURL,
      hasTouch: true,
      isMobile: true,
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    try {
      const page = await touch.newPage();
      await page.goto("/portfolio");
      const card = page.locator(".managed-project-card").first();
      await expect(card).toHaveAttribute("data-open", "false");
      await expect(card.locator(".project-touch-hint")).toBeVisible();
      await card.screenshot({ path: `qa/admin-ux/public-card-${width}-default.png` });
      await card.getByRole("button").tap();
      await expect(card).toHaveAttribute("data-open", "true");
      await expect(page).toHaveURL("/portfolio");
      await card.screenshot({ path: `qa/admin-ux/public-card-${width}-open.png` });
      const destination = await card.getByRole("link").getAttribute("href");
      await card.getByRole("link").tap();
      await expect(page).toHaveURL(destination!);
    } finally {
      await touch.close();
    }
  }
});

test("portfolio filters show skeletons, recover from errors, and use a safe logo fallback", async ({
  page,
}) => {
  await page.route("**/projects/pulse.svg", (route) => route.abort());
  await page.goto("/portfolio");
  await expect(
    page.getByRole("img", { name: "Pulse / CRM logo placeholder" }),
  ).toBeVisible();
  let release: (() => void) | undefined;
  const paused = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/projects?**", async (route) => {
    await paused;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unavailable" }),
    });
  });
  await page
    .getByRole("button", { name: "Computer Vision", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Loading projects" }),
  ).toBeVisible();
  release!();
  await expect(
    page.locator(".portfolio-section").getByRole("alert"),
  ).toContainText("couldn’t be loaded");
  await page.unroute("**/api/projects?**");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".portfolio-empty")).toContainText("no projects");
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page.locator(".managed-project-card")).toHaveCount(3);
});
