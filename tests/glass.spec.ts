import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("selected glass cards track the mouse and clear on scroll and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/services");
  await expect(page.locator("html")).toHaveAttribute(
    "data-studio-ready",
    "true",
  );
  const card = page.locator(".service-editorial-copy:visible").first();
  await page.evaluate(() => document.fonts.ready);
  await card.scrollIntoViewIfNeeded();
  // A pending smooth scroll clears lighting by design. Center the card first
  // and let scroll events settle before sending the pointer move being tested.
  await card.evaluate((node) =>
    node.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(card).toBeVisible();
  await card.hover({ position: { x: 45, y: 70 } });
  await expect(card).toHaveAttribute("data-glass-lit", "true");
  await expect(card.locator(".glass-spotlight")).toHaveCSS(
    "pointer-events",
    "none",
  );
  await expect
    .poll(() =>
      card.evaluate((el) => el.style.getPropertyValue("--glass-pointer-x")),
    )
    .not.toBe("");
  const first = await card
    .locator(".glass-spotlight")
    .evaluate((el) => getComputedStyle(el).transform);
  await card.hover({ position: { x: 110, y: 130 } });
  await expect
    .poll(() =>
      card
        .locator(".glass-spotlight")
        .evaluate((el) => getComputedStyle(el).transform),
    )
    .not.toBe(first);
  await page.mouse.wheel(0, 70);
  await expect(card).not.toHaveAttribute("data-glass-lit", "true");
  await card.hover({ position: { x: 55, y: 90 } });
  await expect(card).toHaveAttribute("data-glass-lit", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(card).not.toHaveAttribute("data-glass-lit", "true");
  await expect(card.locator(".glass-spotlight")).toHaveCSS("display", "none");
  await expect(card).toHaveCSS("scale", "1");
  expect(errors).toEqual([]);
});

test("glass surfaces remain usable across public pages, login and mobile inputs", async ({
  page,
}) => {
  await mkdir("qa/glass", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|webgl|context lost/i.test(message.text())
    )
      errors.push(message.text());
  });
  for (const width of [1440, 768, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/",
      "/services",
      "/about",
      "/work",
      "/portfolio",
      "/reviews",
      "/contact",
      "/portfolio/atlas-cloud",
      "/admin/login",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1:visible")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} at ${width}`,
      ).toBe(true);
      if (route !== "/admin/login") {
        await expect(page.locator(".site-header")).toHaveCSS(
          "backdrop-filter",
          `blur(${width <= 900 ? 6 : 12}px) saturate(1.2)`,
        );
      } else {
        await expect(page.locator(".admin-auth-logo")).toBeVisible();
        const input = page.getByRole("textbox", { name: "Email address" });
        await input.fill("admin@example.test");
        await expect(input).toHaveValue("admin@example.test");
        await expect(input).toHaveCSS("filter", "none");
      }
      await page.evaluate(() => document.fonts.ready);
      if (width !== 768)
        await page.screenshot({
          path: `qa/glass/${route === "/" ? "home" : route.slice(1).replaceAll("/", "-")}-${width}.png`,
        });
    }
  }
  expect(errors).toEqual([]);
});

test("touch interaction never enables mouse-follow lighting", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference",
  });
  try {
    const page = await context.newPage();
    await page.goto("/services");
    await expect(page.locator("html")).toHaveAttribute(
      "data-studio-ready",
      "true",
    );
    const card = page.locator(".service-editorial-copy:visible").first();
    await card.scrollIntoViewIfNeeded();
    await card.locator("h2").tap();
    await expect(card).not.toHaveAttribute("data-glass-lit", "true");
    await expect(card.locator(".glass-reflection")).toHaveCSS(
      "display",
      "none",
    );
    await card.getByRole("link", { name: "Explore Service" }).tap();
    await expect(page).toHaveURL(/\/contact\?service=Web%20Development/);
  } finally {
    await context.close();
  }
});
