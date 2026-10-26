import { chooseTheme } from "./fixtures/theme";
import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const widths = [320, 375, 390, 412, 425];

test("mobile Day has no global gradient, readable copy and aligned controls across routes", async ({
  browser,
  baseURL,
}) => {
  await mkdir("qa/mobile-day/pages", { recursive: true });
  const errors: string[] = [];
  for (const width of widths) {
    const context = await browser.newContext({
      baseURL,
      viewport: { width, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
      colorScheme: "dark",
    });
    await context.addInitScript(() =>
      localStorage.setItem("quietlogic-theme", "day"),
    );
    try {
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          /hydration|did not match|server rendered|webgl|context lost/i.test(
            message.text(),
          )
        )
          errors.push(message.text());
      });
      for (const path of [
        "/",
        "/services",
        "/about",
        "/work",
        "/portfolio",
        "/portfolio/nexa-ops",
        "/portfolio/atlas-cloud",
        "/contact",
        "/reviews",
        "/admin/login",
        "/admin/forgot-password",
        "/admin/reset-password",
      ]) {
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
        const graph = page.locator(".graph-background");
        await expect(graph).toHaveAttribute("data-theme", "day");
        await expect(graph).toHaveAttribute("data-nodes", "20");
        const styles = await page.evaluate(() => {
          const root = getComputedStyle(document.documentElement);
          const body = getComputedStyle(document.body);
          const ambient = getComputedStyle(
            document.querySelector(".graph-background")!,
            "::after",
          );
          return {
            scheme: root.colorScheme,
            base: body.backgroundColor,
            ambient: ambient.backgroundImage,
            content: ambient.content,
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        expect(styles.scheme).toMatch(/^(?:only light|light only)$/);
        expect(styles.base).toBe("rgb(232, 236, 241)");
        expect(
          await page
            .locator("body")
            .evaluate((node) => getComputedStyle(node).backgroundImage),
        ).toBe("none");
        expect(styles.ambient).toBe("none");
        expect(styles.content).toBe("none");
        expect(styles.overflow, `${path} at ${width}`).toBe(false);
        await expect(page.locator("h1:visible")).toHaveCount(1);
        if (path === "/") {
          const header = await page.locator(".site-header").boundingBox();
          const controls = [
            page.locator(".site-header .brand"),
            page.getByRole("button", { name: "Open navigation" }),
          ];
          for (const control of controls) {
            const rect = await control.boundingBox();
            expect(
              Math.abs(
                rect!.y + rect!.height / 2 - header!.y - header!.height / 2,
              ),
            ).toBeLessThan(2);
            expect(rect!.x).toBeGreaterThanOrEqual(header!.x);
            expect(rect!.x + rect!.width).toBeLessThanOrEqual(
              header!.x + header!.width,
            );
          }
          const heading = page
            .locator(".section-heading")
            .filter({ hasText: "Focused design." });
          await heading.evaluate((node) =>
            window.scrollTo({
              top: node.getBoundingClientRect().top + scrollY - 180,
              behavior: "instant",
            }),
          );
          await expect(heading.locator("p")).toHaveCSS("font-size", "16px");
          await expect(heading.locator("p")).toHaveCSS(
            "color",
            "rgb(79, 91, 102)",
          );
          await expect(heading.locator(".section-label")).toHaveCSS(
            "opacity",
            "1",
          );
          await expect(
            page.locator(".project-copy .overline").first(),
          ).toHaveCSS("color", "rgb(79, 91, 102)");
          await expect(page.locator(".cube-shadow")).toHaveCSS(
            "filter",
            "none",
          );
          await page.screenshot({
            path: `qa/mobile-day/pages/home-${width}.png`,
          });
        }
        if (
          width === 375 &&
          [
            "/services",
            "/about",
            "/work",
            "/portfolio",
            "/portfolio/nexa-ops",
            "/contact",
            "/reviews",
            "/admin/login",
          ].includes(path)
        ) {
          await page.screenshot({
            path: `qa/mobile-day/pages/${path.slice(1).replaceAll("/", "-")}-375.png`,
          });
        }
      }
    } finally {
      await context.close();
    }
  }
  expect(errors).toEqual([]);
});

test("mobile Day backdrop stays light at its center and through Day/Night toggles", async ({
  browser,
  baseURL,
}) => {
  for (const width of widths) {
    const context = await browser.newContext({
      baseURL,
      viewport: { width, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    await context.addInitScript(() =>
      localStorage.setItem("quietlogic-theme", "day"),
    );
    try {
      const page = await context.newPage();
      await page.goto("/");
      const graph = page.locator(".graph-background");
      await expect(graph).toHaveAttribute("data-nodes", "20");
      const paint = await graph
        .locator("canvas")
        .evaluate((node: HTMLCanvasElement) => [
          ...node.getContext("2d")!.getImageData(1, 1, 1, 1).data,
        ]);
      expect(paint).toEqual([232, 236, 241, 255]);
      await graph
        .locator("canvas")
        .evaluate((node) => node.setAttribute("data-identity", "original"));
      // Inspect the painted backdrop itself, independently of text or cards.
      const probe = await page.addStyleTag({
        content:
          "main, header, footer, .studio-cursor, .route-curtain { visibility: hidden !important; }",
      });
      const screenshot = await page.screenshot();
      const { data, info } = await sharp(screenshot)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      for (const x of [
        Math.floor(width * 0.25),
        Math.floor(width * 0.5),
        Math.floor(width * 0.75),
      ]) {
        for (let y = 100; y < 800; y += 20) {
          const offset = (y * info.width + x) * info.channels;
          expect(
            Math.min(data[offset], data[offset + 1], data[offset + 2]),
            `Background at ${width}px, x=${x}, y=${y}`,
          ).toBeGreaterThan(180);
        }
      }
      await probe.evaluate((node) => node.parentNode?.removeChild(node));
      await chooseTheme(page, "night");
      await expect(graph).toHaveAttribute("data-theme", "night");
      await expect(graph).toHaveAttribute("data-nodes", "22");
      expect(
        await graph.evaluate(
          (node) => getComputedStyle(node, "::after").backgroundImage,
        ),
      ).not.toBe("none");
      await chooseTheme(page, "day");
      await expect(graph).toHaveAttribute("data-theme", "day");
      await expect(graph).toHaveAttribute("data-nodes", "20");
      expect(
        await graph.evaluate(
          (node) => getComputedStyle(node, "::after").content,
        ),
      ).toBe("none");
      await expect(graph.locator("canvas")).toHaveAttribute(
        "data-identity",
        "original",
      );
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
    } finally {
      await context.close();
    }
  }
});
