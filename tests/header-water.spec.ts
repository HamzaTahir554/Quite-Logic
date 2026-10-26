import { test, expect } from "@playwright/test";
import { chooseTheme } from "./fixtures/theme";
test("water header persists through immediate navigation without any spill or page-cover animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 950 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const theme of ["day", "night"] as const) {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute(
      "data-studio-ready",
      "true",
    );
    await chooseTheme(page, theme);
    await page
      .locator(".header-float")
      .evaluate((node) => node.setAttribute("data-persistent", "yes"));
    for (const path of [
      "/services",
      "/about",
      "/work",
      "/portfolio",
      "/contact",
      "/",
    ]) {
      const before = await page.locator(".site-header").boundingBox();
      await page.locator(`.desktop-nav a[href="${path}"]`).click();
      await expect(page).toHaveURL(path);
      await expect(
        page.locator('.desktop-nav a[aria-current="page"]'),
      ).toHaveAttribute("href", path);
      await expect(page.locator(".header-spill")).toHaveCount(0);
      await expect(page.locator(".header-float")).toHaveAttribute(
        "data-persistent",
        "yes",
      );
      const after = (await page.locator(".site-header").boundingBox())!;
      for (const key of ["x", "y", "width", "height"] as const)
        expect(after[key]).toBeCloseTo(before![key], 1);
      expect(
        (await page.locator(".route-curtain").boundingBox())!.height,
      ).toBeLessThan(1);
      await expect(page.locator(".header-float")).toHaveCSS(
        "animation-play-state",
        "running",
      );
    }
  }
  expect(errors).toEqual([]);
});
test("autonomous waves move while controls remain stable and reduced motion freezes the surface", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/about");
  await expect(page.locator("html")).toHaveAttribute(
    "data-studio-ready",
    "true",
  );
  await page.waitForTimeout(500);
  const result = await page.evaluate(async () => {
    const snapshot = () => ({
      wave: getComputedStyle(document.querySelector(".header-water-wave")!)
        .transform,
      float: getComputedStyle(document.querySelector(".header-float")!)
        .transform,
      bar: document
        .querySelector(".header-bar")!
        .getBoundingClientRect()
        .toJSON(),
    });
    const first = snapshot();
    await new Promise((resolve) => setTimeout(resolve, 800));
    return [first, snapshot()];
  });
  expect(result[0].wave).not.toBe(result[1].wave);
  expect(result[0].float).not.toBe(result[1].float);
  expect(result[0].bar).toEqual(result[1].bar);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".header-float")).toHaveCSS(
    "animation-name",
    "none",
  );
});
