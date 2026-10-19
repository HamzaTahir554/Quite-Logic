import { expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

export async function testAdminGraph(
  page: Page,
  check: (value: unknown, label: string) => void,
) {
  await mkdir("qa/graph", { recursive: true });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  try {
    for (const width of [1920, 1366, 768, 375]) {
      await page.setViewportSize({ width, height: 950 });
      for (const route of [
        "/admin",
        "/admin/reviews",
        "/admin/portfolio",
        "/admin/settings",
        "/admin/account",
      ]) {
        await page.goto(route);
        const graph = page.locator(".graph-background");
        await expect(page.locator("h1:visible")).toBeVisible();
        await expect(graph).toHaveAttribute("data-graph-state", "running");
        await expect(graph).toHaveAttribute("data-variant", "admin");
        await expect(graph).toHaveAttribute("data-intensity", "0.5");
        await expect(graph).toHaveCSS("pointer-events", "none");
        check(
          (await graph.count()) === 1 &&
            (await graph.locator("canvas").count()) === 1,
          "Exactly one graph canvas on protected admin screen",
        );
        check(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          "Graph adds no admin overflow",
        );
        const bounds = await graph.boundingBox();
        check(
          bounds?.width === width &&
            bounds?.height === 950 &&
            bounds?.x === 0 &&
            bounds?.y === 0,
          "Admin graph fills viewport",
        );
        if (width === 1366 || width === 375) {
          await expect(
            page.locator('.admin-shell [aria-busy="true"], .admin-skeleton'),
          ).toHaveCount(0);
          await page.evaluate(() => document.fonts.ready);
          await page.screenshot({
            path: `qa/graph/${route.slice(1).replaceAll("/", "-")}-${width}.png`,
            animations: "disabled",
          });
        }
      }
    }
    await page.setViewportSize({ width: 1366, height: 950 });
    await page.goto("/admin");
    await page
      .locator(".graph-background canvas")
      .evaluate((canvas) =>
        canvas.setAttribute("data-continuity-probe", "same-admin-canvas"),
      );
    await page.locator('.admin-nav a[href="/admin/reviews"]:visible').click();
    await expect(page).toHaveURL(/\/admin\/reviews$/);
    await expect(page.locator(".graph-background canvas")).toHaveAttribute(
      "data-continuity-probe",
      "same-admin-canvas",
    );
    check(true, "Admin navigation retains the same background canvas");
  } finally {
    await page.emulateMedia({ reducedMotion: "reduce" });
  }
}
