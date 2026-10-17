import { test, expect } from "@playwright/test";

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
    await page.mouse.move(0, 0);
    await card.getByRole("button").focus();
    await page.keyboard.press("Space");
    await expect(card.getByRole("button")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await page.keyboard.press("Tab");
    await expect(card.getByRole("link")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(card).toHaveAttribute("data-open", "false");
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
      await card.getByRole("button").tap();
      await expect(card).toHaveAttribute("data-open", "true");
      await expect(page).toHaveURL("/portfolio");
      const destination = await card.getByRole("link").getAttribute("href");
      await card.getByRole("link").tap();
      await expect(page).toHaveURL(destination!);
    } finally {
      await touch.close();
    }
  }
});
