import { test, expect } from "@playwright/test";

test("reference hero is centered, readable, and correctly branded", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute(
    "data-studio-ready",
    "true",
  );
  await expect(page.locator("h1")).toHaveText(
    "Software that feels calm. Built to move fast.",
  );
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(".hero-copy .eyebrow")).toHaveCount(0);
  await expect(page.locator(".terminal-window")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Quite Logic home" }),
  ).toBeVisible();
  const brand = page.locator("header .brand-name");
  await expect(brand).toHaveText("Quite Logic");
  await expect(brand.locator(".brand-quite")).toHaveCSS(
    "color",
    "rgb(240, 241, 248)",
  );
  await expect(brand.locator(".brand-logic")).toHaveCSS(
    "color",
    "rgb(47, 128, 254)",
  );
  const heading = await page.locator("h1").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      center: r.x + r.width / 2,
      align: getComputedStyle(el).textAlign,
      size: parseFloat(getComputedStyle(el).fontSize),
    };
  });
  expect(heading.center).toBeCloseTo(720, 0);
  expect(heading.align).toBe("center");
  expect(heading.size).toBeGreaterThan(90);
  await expect(
    page
      .locator(".hero-actions")
      .getByRole("link", { name: "Start a Project" }),
  ).toHaveAttribute("href", "/contact");
  await expect(
    page
      .locator(".hero-actions")
      .getByRole("link", { name: "Explore Our Work" }),
  ).toHaveAttribute("href", "/portfolio");
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator("h1")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const actions = await page.locator(".hero-actions a").evaluateAll((links) =>
    links.map((el) => {
      const r = el.getBoundingClientRect();
      return { y: r.y, height: r.height };
    }),
  );
  expect(actions[1].y).toBeGreaterThanOrEqual(actions[0].y + actions[0].height);
  await expect(page.locator(".hero-scene canvas")).toHaveCount(0);
});

test("initial hero layout remains stable", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { layoutShifts: number[] }).layoutShifts = [];
    (window as unknown as { shiftDetails: unknown[] }).shiftDetails = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
          sources?: {
            node?: Element;
            previousRect: DOMRectReadOnly;
            currentRect: DOMRectReadOnly;
          }[];
        };
        if (!shift.hadRecentInput) {
          (window as unknown as { layoutShifts: number[] }).layoutShifts.push(
            shift.value,
          );
          (window as unknown as { shiftDetails: unknown[] }).shiftDetails.push({
            value: shift.value,
            sources: shift.sources?.map((source) => ({
              tag: source.node?.tagName,
              className: source.node?.className,
              previous: source.previousRect,
              current: source.currentRect,
            })),
          });
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.locator(".hero-scene canvas").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1800);
  const cls = await page.evaluate(() =>
    (window as unknown as { layoutShifts: number[] }).layoutShifts.reduce(
      (sum, value) => sum + value,
      0,
    ),
  );
  const details = await page.evaluate(
    () => (window as unknown as { shiftDetails: unknown[] }).shiftDetails,
  );
  expect(cls, JSON.stringify(details)).toBeLessThan(0.1);
});
