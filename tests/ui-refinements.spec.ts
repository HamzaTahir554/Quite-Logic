import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import {
  cubeOrientations,
  multiply,
  nearestFace,
  turn,
} from "../lib/cube-rotation";

test("cube face selection follows its visible normal after rotations on either axis", () => {
  cubeOrientations.forEach((q, index) => expect(nearestFace(q)).toBe(index));
  expect(nearestFace(multiply(turn(0, -1), cubeOrientations[5]))).toBe(1);
  expect(nearestFace(multiply(turn(1, 0), cubeOrientations[5]))).toBe(0);
});

test("straight arrows move right on hover and focus, and respect reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const link = page.locator(".hero-actions a").first();
  const arrow = link.locator(".link-arrow");
  await expect(arrow).toHaveAttribute("aria-hidden", "true");
  await link.hover();
  await expect(arrow).toHaveCSS("transform", "matrix(1, 0, 0, 1, 5, 0)");
  await expect(arrow).toHaveCSS("translate", "0px");
  await page.mouse.move(0, 0);
  await expect(arrow).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  await link.focus();
  await expect(arrow).toHaveCSS("transform", "matrix(1, 0, 0, 1, 5, 0)");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      arrow.evaluate(
        (node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41,
      ),
    )
    .toBe(0);
  await expect(arrow).toHaveCSS("transition-duration", "0s");
  for (const path of [
    "/services",
    "/about",
    "/work",
    "/portfolio",
    "/portfolio/atlas-cloud",
    "/contact",
    "/reviews",
    "/admin/login",
  ]) {
    await page.goto(path);
    const legacy = await page
      .locator("a")
      .evaluateAll((links) =>
        links
          .filter((link) => /[↗↘➜]/.test(link.textContent || ""))
          .map((link) => link.textContent),
      );
    expect(legacy).toEqual([]);
  }
});

test("Home media and mobile typography stay consistent across both themes and all requested widths", async ({
  page,
}) => {
  await mkdir("qa/ui-refinements", { recursive: true });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute(
    "data-studio-ready",
    "true",
  );
  for (const theme of ["day", "night"]) {
    await page.evaluate(
      (value) => localStorage.setItem("quietlogic-theme", value),
      theme,
    );
    for (const width of [320, 375, 390, 425, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute(
        "data-studio-ready",
        "true",
      );
      const cards = page.locator(".home-projects .project-card");
      await expect(cards).toHaveCount(3);
      await expect(cards.first()).toBeVisible();
      expect(await page.locator(".home-projects .atlas-showcase").count()).toBe(
        0,
      );
      const frames = await cards
        .locator(".home-project-visual")
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const r = node.getBoundingClientRect();
            return { width: r.width, height: r.height };
          }),
        );
      expect(
        Math.max(...frames.map((f) => f.width)) -
          Math.min(...frames.map((f) => f.width)),
      ).toBeLessThan(1);
      expect(
        Math.max(...frames.map((f) => f.height)) -
          Math.min(...frames.map((f) => f.height)),
      ).toBeLessThan(1);
      if (width <= 900)
        for (const frame of frames)
          expect(frame.width / frame.height).toBeCloseTo(1.6, 2);
      for (const image of await cards.locator("img").all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate((img: HTMLImageElement) => img.decode());
        await expect(image).toHaveCSS("object-fit", "contain");
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (width <= 768) {
        await expect(page.locator("body")).toHaveCSS("font-weight", "500");
        await expect(page.locator("h1")).toHaveCSS("font-weight", "750");
        await expect(cards.locator("h3").first()).toHaveCSS(
          "font-weight",
          "650",
        );
        await expect(cards.locator("p").first()).toHaveCSS("font-size", "16px");
        await expect(cards.locator("p").first()).toHaveCSS(
          "color",
          theme === "day" ? "rgb(79, 91, 102)" : "rgb(209, 214, 221)",
        );
      }
      if ([375, 768, 1440].includes(width)) {
        await page.locator(".home-projects .section-heading").evaluate((node) =>
          window.scrollTo({
            top: node.getBoundingClientRect().top + scrollY - 120,
            behavior: "instant",
          }),
        );
        await page.screenshot({
          path: `qa/ui-refinements/home-${theme}-${width}.png`,
        });
        if (width === 375) {
          await cards.first().evaluate((node) =>
            window.scrollTo({
              top: node.getBoundingClientRect().top + scrollY - 140,
              behavior: "instant",
            }),
          );
          await page.screenshot({
            path: `qa/ui-refinements/project-${theme}-375.png`,
          });
        }
      }
    }
  }
});

test("touch cube owns both drag axes while its surrounding plane scrolls", async ({
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
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute(
      "data-studio-ready",
      "true",
    );
    const root = page.locator(".signature-explorer"),
      physical = page.locator(".css-cube-tilt");
    await physical.scrollIntoViewIfNeeded();
    await expect(root).toHaveAttribute("data-active-face", "6");
    await expect(root).toHaveAttribute("data-settled-face", "6");
    const client = await context.newCDPSession(page);
    async function swipe(dx: number, dy: number, outside = false) {
      const r = (await physical.boundingBox())!;
      const x = outside ? 12 : r.x + r.width / 2,
        y = r.y + r.height / 2;
      await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y }],
      });
      for (let i = 1; i <= 10; i++)
        await client.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: x + (dx * i) / 10, y: y + (dy * i) / 10 }],
        });
      await client.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    }
    const before = await page.evaluate(() => scrollY);
    await swipe(0, 110);
    await expect(root).toHaveAttribute("data-settled-face", "1");
    expect(
      Math.abs((await page.evaluate(() => scrollY)) - before),
    ).toBeLessThan(2);
    await swipe(-110, 0);
    await expect(root).toHaveAttribute("data-settled-face", "2");
    await expect(page.locator(".cube-interaction")).toHaveAttribute(
      "data-dragging",
      "false",
    );
    const previous = await page.evaluate(() => scrollY);
    await swipe(0, -120, true);
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(previous);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await physical.scrollIntoViewIfNeeded();
    await page
      .getByRole("group", { name: "Choose a service" })
      .getByRole("button")
      .first()
      .click();
    await physical.scrollIntoViewIfNeeded();
    await swipe(0, 110);
    await expect(root).toHaveAttribute("data-settled-face", "5");
  } finally {
    await context.close();
  }
});
