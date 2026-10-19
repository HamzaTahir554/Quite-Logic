import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

test("one static graph covers public and auth routes at desktop, laptop, tablet and mobile sizes", async ({
  page,
}) => {
  await mkdir("qa/graph", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|canvas|context lost/i.test(message.text())
    )
      errors.push(message.text());
  });
  for (const width of [1920, 1366, 768, 375]) {
    await page.setViewportSize({ width, height: 950 });
    for (const path of [
      "/",
      "/services",
      "/about",
      "/work",
      "/portfolio",
      "/portfolio/atlas-cloud",
      "/contact",
      "/reviews",
      "/admin/login",
      "/admin/forgot-password",
      "/admin/reset-password",
    ]) {
      await page.goto(path);
      const graph = page.locator(".graph-background");
      await expect(graph).toHaveCount(1);
      await expect(graph).toHaveAttribute("data-graph-state", "static");
      await expect(graph).toHaveAttribute(
        "data-variant",
        path.startsWith("/admin/") ? "auth" : "public",
      );
      await expect(graph).toHaveAttribute("aria-hidden", "true");
      await expect(graph).toHaveCSS("pointer-events", "none");
      await expect(graph.locator("canvas")).toHaveCount(1);
      const bounds = await graph.boundingBox();
      expect(bounds).toEqual({ x: 0, y: 0, width, height: 950 });
      const nodes = Number(await graph.getAttribute("data-nodes"));
      expect(nodes).toBeGreaterThanOrEqual(
        width <= 600 ? 15 : width <= 1000 ? 25 : width <= 1600 ? 40 : 60,
      );
      expect(nodes).toBeLessThanOrEqual(
        width <= 600 ? 25 : width <= 1000 ? 40 : width <= 1600 ? 70 : 90,
      );
      expect(
        Number(await graph.getAttribute("data-edges")),
      ).toBeLessThanOrEqual(nodes * 1.5);
      expect(
        await graph.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
          const data = canvas
            .getContext("2d")!
            .getImageData(0, 0, canvas.width, canvas.height).data;
          for (let index = 3; index < data.length; index += 4)
            if (data[index]) return true;
          return false;
        }),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} at ${width}`,
      ).toBe(true);
      if (["/", "/contact", "/admin/login"].includes(path)) {
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({
          path: `qa/graph/${path === "/" ? "home" : path.slice(1).replaceAll("/", "-")}-${width}.png`,
        });
      }
    }
    await page.goto("/contact");
    await page.evaluate(() =>
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "instant",
      }),
    );
    await expect(page.locator(".graph-background")).toHaveCSS(
      "position",
      "fixed",
    );
    expect((await page.locator(".graph-background").boundingBox())?.y).toBe(0);
    await expect(page.locator("footer")).toHaveCSS(
      "background-color",
      "rgb(48, 57, 68)",
    );
    await expect(page.locator(".footer-motion")).toHaveCSS(
      "background-image",
      "none",
    );
  }
  expect(errors).toEqual([]);
});

test("graph survives client navigation, stays behind controls and changes intensity at admin login", async ({
  page,
}) => {
  await page.goto("/");
  const graph = page.locator(".graph-background");
  await expect(graph).toHaveAttribute("data-graph-state", "static");
  await graph
    .locator("canvas")
    .evaluate((canvas) =>
      canvas.setAttribute("data-continuity-probe", "same-canvas"),
    );
  await page
    .locator("header")
    .getByRole("link", { name: "Services", exact: true })
    .click();
  await expect(page).toHaveURL("/services");
  await expect(graph.locator("canvas")).toHaveAttribute(
    "data-continuity-probe",
    "same-canvas",
  );
  await page
    .locator("header")
    .getByRole("link", { name: "Contact", exact: true })
    .click();
  const name = page.getByRole("textbox", { name: "Your name" });
  await name.fill("Graph interaction check");
  await expect(name).toHaveValue("Graph interaction check");
  await page
    .locator("footer")
    .getByRole("link", { name: "Admin Login" })
    .click();
  await expect(page).toHaveURL("/admin/login");
  await expect(graph.locator("canvas")).toHaveAttribute(
    "data-continuity-probe",
    "same-canvas",
  );
  await expect(graph).toHaveAttribute("data-intensity", "0.85");
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("graph@example.test");
  await expect(
    page.getByRole("textbox", { name: "Email address" }),
  ).toHaveValue("graph@example.test");
});

test("graph pauses for hidden tabs and live reduced motion; rendering cost stays bounded", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const native = HTMLCanvasElement.prototype.getContext;
    const stats = { frames: 0, costs: [] as number[] };
    Object.assign(window, { graphStats: stats });
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: unknown[]
    ) {
      const ctx = Reflect.apply(native, this, args);
      if (
        args[0] === "2d" &&
        this.closest(".graph-background") &&
        ctx &&
        !ctx.graphMeasured
      ) {
        ctx.graphMeasured = true;
        const clear = ctx.clearRect.bind(ctx);
        const save = ctx.save.bind(ctx);
        const restore = ctx.restore.bind(ctx);
        let start = 0;
        let depth = 0;
        ctx.clearRect = (...values: number[]) => {
          stats.frames++;
          start = performance.now();
          return clear(...values);
        };
        ctx.save = () => {
          depth++;
          return save();
        };
        ctx.restore = () => {
          const result = restore();
          if (--depth === 0) stats.costs.push(performance.now() - start);
          return result;
        };
      }
      return ctx;
    } as typeof native;
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/about");
  const graph = page.locator(".graph-background");
  await expect(graph).toHaveAttribute("data-graph-state", "running");
  await expect(graph).toHaveAttribute("data-interaction", "autonomous");
  const stillCursorImage = await graph
    .locator("canvas")
    .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  const frames = () =>
    page.evaluate(
      () =>
        (window as unknown as { graphStats: { frames: number } }).graphStats
          .frames,
    );
  const initial = await frames();
  // Measure actual draw work, not an assumed host compositor frame rate.
  await expect.poll(frames, { timeout: 20000 }).toBeGreaterThan(initial + 12);
  expect(
    await graph
      .locator("canvas")
      .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL()),
  ).not.toBe(stillCursorImage);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(graph).toHaveAttribute("data-graph-state", "paused");
  const paused = await frames();
  await page.waitForTimeout(250);
  expect(await frames()).toBe(paused);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(graph).toHaveAttribute("data-graph-state", "running");
  await expect.poll(frames).toBeGreaterThan(paused);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(graph).toHaveAttribute("data-graph-state", "static");
  await expect(graph).toHaveAttribute("data-interaction", "autonomous");
  await page.waitForTimeout(100);
  const frozen = await frames();
  await page.mouse.move(400, 500);
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(250);
  expect(await frames()).toBe(frozen);
  const costs = await page.evaluate(
    () =>
      (window as unknown as { graphStats: { costs: number[] } }).graphStats
        .costs,
  );
  costs.sort((a, b) => a - b);
  const metrics = {
    samples: costs.length,
    frameBudget: await graph.getAttribute("data-frame-budget"),
    meanDrawMs: costs.reduce((a, b) => a + b, 0) / costs.length,
    p95DrawMs: costs[Math.floor(costs.length * 0.95)],
  };
  await mkdir("qa/graph", { recursive: true });
  await writeFile(
    "qa/graph/render-metrics.json",
    JSON.stringify(metrics, null, 2) + "\n",
  );
  expect(metrics.p95DrawMs).toBeLessThan(12);
});

test("graph caps DPR, remains autonomous on desktop and touch, and fails gracefully without Canvas 2D", async ({
  browser,
  baseURL,
}) => {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: mobile ? 375 : 1440, height: 900 },
      deviceScaleFactor: 3,
      hasTouch: mobile,
      isMobile: mobile,
      reducedMotion: "no-preference",
    });
    try {
      const page = await context.newPage();
      await page.goto("/about");
      const graph = page.locator(".graph-background");
      await expect(graph).toHaveAttribute("data-graph-state", "running");
      await expect(graph).toHaveAttribute("data-dpr", mobile ? "1" : "1.5");
      await expect(graph).toHaveAttribute("data-interaction", "autonomous");
      await expect(graph).toHaveAttribute(
        "data-frame-rate",
        mobile ? "30" : "60",
      );
    } finally {
      await context.close();
    }
  }
  const context = await browser.newContext({ baseURL });
  try {
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const native = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        ...args: unknown[]
      ) {
        if (this.closest(".graph-background") && args[0] === "2d") return null;
        return Reflect.apply(native, this, args);
      } as typeof native;
    });
    await page.goto("/contact");
    await expect(page.locator(".graph-background")).toHaveAttribute(
      "data-graph-state",
      "unavailable",
    );
    await page
      .getByRole("textbox", { name: "Your name" })
      .fill("Canvas fallback check");
    await expect(page.getByRole("textbox", { name: "Your name" })).toHaveValue(
      "Canvas fallback check",
    );
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
