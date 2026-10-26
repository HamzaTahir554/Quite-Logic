import { chooseTheme } from "./fixtures/theme";
import { test, expect, type Locator, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

async function ready(page: Page) {
  await expect(page.locator("html")).toHaveAttribute(
    "data-studio-ready",
    "true",
  );
  await page.evaluate(() => document.fonts.ready);
}
async function settle(node: Locator) {
  await node.evaluate(async (element) => {
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .filter(
          (animation) =>
            animation.playState === "running" &&
            animation.effect?.getTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
}
async function layoutY(node: Locator) {
  return node.evaluate((element) => {
    let top = 0;
    for (
      let item = element as HTMLElement | null;
      item;
      item = item.offsetParent as HTMLElement | null
    )
      top += item.offsetTop;
    return top;
  });
}

test("floating header reserves page space and aligns its controls across both themes and all requested widths", async ({
  page,
}) => {
  await mkdir("qa/floating-header", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  for (const theme of ["day", "night"]) {
    await page.goto("/");
    await page.evaluate(
      (value) => localStorage.setItem("quietlogic-theme", value),
      theme,
    );
    for (const width of [320, 375, 390, 425, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 950 });
      for (const route of [
        "/",
        "/services",
        "/about",
        "/work",
        "/portfolio",
        "/portfolio/atlas-cloud",
        "/contact",
        "/reviews",
      ]) {
        await page.goto(route);
        await ready(page);
        const header = page.locator(".site-header");
        const rect = (await header.boundingBox())!;
        expect(rect.y).toBeGreaterThanOrEqual(12);
        expect(rect.y).toBeLessThanOrEqual(24);
        expect(rect.x).toBeGreaterThanOrEqual(16);
        expect(Math.abs(rect.x * 2 + rect.width - width)).toBeLessThan(1);
        expect(rect.width).toBeLessThanOrEqual(1180);
        const heading = page.getByRole("heading", { level: 1 }).first();
        await expect(heading).toBeVisible();
        expect((await heading.boundingBox())!.y).toBeGreaterThan(
          rect.y + rect.height + 12,
        );
        if (route === "/portfolio") {
          const intro = (await page
            .locator(".portfolio-page .page-hero")
            .boundingBox())!;
          expect(intro.y - rect.y - rect.height).toBeLessThanOrEqual(32);
        }
        if (route === "/portfolio/atlas-cloud") {
          const breadcrumb = (await page
            .locator(".project-breadcrumbs a")
            .first()
            .boundingBox())!;
          expect(breadcrumb.y - rect.y - rect.height).toBeLessThanOrEqual(64);
        }
        const controls = header.locator(
          ".brand, .mobile-toggle:visible, .nav-project:visible",
        );
        for (const control of await controls.all()) {
          const bounds = (await control.boundingBox())!;
          expect(
            Math.abs(bounds.y + bounds.height / 2 - rect.y - rect.height / 2),
          ).toBeLessThan(1);
          expect(bounds.x).toBeGreaterThanOrEqual(rect.x);
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(
            rect.x + rect.width,
          );
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if (width <= 600)
          await expect(header.locator(".nav-project")).toBeHidden();
        else
          expect(
            (await header.locator(".nav-project").boundingBox())!.height,
          ).toBeLessThanOrEqual(40);
        await expect(page.locator(".header-surface")).toHaveCSS(
          "backdrop-filter",
          theme === "day" ? "none" : "blur(16px) saturate(1.2)",
        );
        if (route === "/" && [390, 768, 1440].includes(width)) {
          await page.screenshot({
            path: `qa/floating-header/${theme}-${width}.png`,
          });
          if (width < 981) {
            await header
              .getByRole("button", { name: "Open navigation" })
              .click();
            const panel = page.getByRole("dialog", { name: "Site navigation" });
            await expect(panel).toBeVisible();
            await settle(panel);
            await page.screenshot({
              path: `qa/floating-header/menu-${theme}-${width}.png`,
            });
            await page
              .getByRole("button", { name: "Close navigation" })
              .click();
          }
        }
      }
    }
  }
  expect(errors).toEqual([]);
});

test("header compacts with hysteresis, returns on deliberate upward scroll and does not shift page layout", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/services");
  await ready(page);
  const header = page.locator(".site-header");
  await settle(header);
  const heading = page.getByRole("heading", { level: 1 });
  const documentY = await layoutY(heading);
  const scroll = (top: number) =>
    page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), top);
  await scroll(100);
  await expect(header).toHaveAttribute("data-compact", "false");
  await scroll(110);
  await expect(header).toHaveAttribute("data-compact", "true");
  await expect(header).toHaveCSS("height", "64px");
  await settle(header);
  expect(
    (await page.locator(".header-surface").boundingBox())!.height,
  ).toBeCloseTo(64, 1);
  await scroll(400);
  await expect(header).toHaveAttribute("data-scrolling-down", "true");
  for (const y of [399, 400, 399, 400]) {
    await scroll(y);
    await page.evaluate(() => new Promise(requestAnimationFrame));
  }
  await expect(header).toHaveAttribute("data-scrolling-down", "true");
  await scroll(390);
  await expect(header).toHaveAttribute("data-scrolling-down", "true");
  await scroll(370);
  await expect(header).toHaveAttribute("data-scrolling-down", "false");
  await scroll(70);
  await expect(header).toHaveAttribute("data-compact", "true");
  await scroll(50);
  await expect(header).toHaveAttribute("data-compact", "false");
  expect(await layoutY(heading)).toBe(documentY);
  await page.keyboard.press("Tab");
  await header.locator(".brand").focus();
  await scroll(500);
  await expect(header).toHaveAttribute("data-compact", "false");
  await expect(header.locator(".brand")).toBeFocused();
  expect((await header.boundingBox())!.y).toBeGreaterThanOrEqual(16);
});

test("one active indicator follows nested routes and theme switching preserves header dimensions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/portfolio/atlas-cloud");
  await ready(page);
  const header = page.locator(".site-header");
  await expect(header.locator('.desktop-nav [aria-current="page"]')).toHaveText(
    "Portfolio",
  );
  await expect(header.locator(".desktop-nav .nav-active")).toHaveCount(1);
  const before = await header.boundingBox();
  await chooseTheme(page, "day");
  expect(await header.boundingBox()).toEqual(before);
  await header.getByRole("link", { name: "Services", exact: true }).click();
  await expect(page).toHaveURL(/\/services$/);
  await expect(header.locator('.desktop-nav [aria-current="page"]')).toHaveText(
    "Services",
  );
  await expect(header.locator(".desktop-nav .nav-active")).toHaveCount(1);
});

test("mobile menu opens below the bar, traps focus, restores it and retains booking above navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await ready(page);
  const header = page.locator(".site-header"),
    toggle = page.getByRole("button", { name: "Open navigation" });
  await settle(header);
  const controlledPanel = await toggle.getAttribute("aria-controls");
  await toggle.click();
  await expect(header).toHaveAttribute("data-menu-open", "true");
  const panel = page.getByRole("dialog", { name: "Site navigation" });
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("id", controlledPanel || "");
  await settle(panel);
  const bounds = (await panel.boundingBox())!;
  const bar = (await header.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(bar.y + bar.height + 6);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844 - 12);
  for (const link of await panel
    .getByRole("navigation")
    .getByRole("link")
    .all())
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press("Shift+Tab");
  expect(
    await panel.evaluate((node) => node.contains(document.activeElement)),
  ).toBe(true);
  const menuLayer = await panel.evaluate((node) =>
    Number(getComputedStyle(node.closest(".MuiModal-root")!).zIndex),
  );
  await panel
    .getByRole("button", { name: "Book a Meeting", exact: true })
    .click();
  const booking = page.getByRole("dialog", { name: /Book a Meeting/ });
  await expect(booking).toBeVisible();
  expect(
    await booking.evaluate((node) =>
      Number(getComputedStyle(node.closest(".MuiModal-root")!).zIndex),
    ),
  ).toBeGreaterThan(menuLayer);
  await page.getByRole("button", { name: "Close booking" }).click();
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await panel.getByRole("link", { name: "Contact", exact: true }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(panel).toHaveCount(0);
});

test("reduced motion removes arrival and hover movement; resizing closes the mobile drawer", async ({
  page,
}) => {
  await page.goto("/");
  await ready(page);
  const header = page.locator(".site-header");
  await expect(header).toHaveCSS("animation-name", "none");
  await expect(header).toHaveCSS("transition-duration", "0s");
  await header.locator(".brand").hover();
  await expect(header.locator(".brand")).toHaveCSS("transform", "none");
  await page.setViewportSize({ width: 768, height: 900 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("dialog", { name: "Site navigation" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(
    page.getByRole("dialog", { name: "Site navigation" }),
  ).toHaveCount(0);
  await expect(
    header.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
});

test("a short touch viewport keeps the menu scrollable and all controls reachable", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 320, height: 568 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await ready(page);
    const header = page.locator(".site-header");
    const before = await header.boundingBox();
    await chooseTheme(page, "day");
    expect(await header.boundingBox()).toEqual(before);
    await page.getByRole("button", { name: "Open navigation" }).tap();
    const panel = page.getByRole("dialog", { name: "Site navigation" });
    await expect(panel).toBeVisible();
    expect(
      (await panel.boundingBox())!.y + (await panel.boundingBox())!.height,
    ).toBeLessThanOrEqual(568 - 12);
    expect(
      await panel.evaluate((node) => node.scrollHeight > node.clientHeight),
    ).toBe(true);
    await panel
      .getByRole("button", { name: "Book a Meeting", exact: true })
      .tap();
    await expect(
      page.getByRole("dialog", { name: /Book a Meeting/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close booking" }).tap();
    await page.getByRole("button", { name: "Close navigation" }).tap();
    await expect(panel).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
