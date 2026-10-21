import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

type WaterSample = {
  kind: "state" | "route";
  state: string;
  path: string;
  at: number;
  depth: number;
  curtainHeight: number;
};
type WaterWindow = Window & {
  waterTrace?: { finish: () => WaterSample[] };
  waterModifiedClick?: { ctrl: boolean; prevented: boolean };
  waterMainMotion?: { scaleCount: number; restore: () => void };
};

async function ready(page: Page) {
  await expect(page.locator("html")).toHaveAttribute(
    "data-studio-ready",
    "true",
  );
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.querySelectorAll(".site-header, .route-curtain")]
        .flatMap((node) => node.getAnimations({ subtree: true }))
        .filter(
          (animation) =>
            animation.playState === "running" &&
            animation.effect?.getTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
}

// Observe actual state changes and history commits without narrow polling
// windows: a 180ms expansion can finish between two Playwright round trips.
async function trace(page: Page) {
  await page.evaluate(() => {
    (window as WaterWindow).waterTrace?.finish();
    const header = document.querySelector<HTMLElement>(".site-header")!;
    const samples: WaterSample[] = [];
    const start = performance.now();
    const record = (kind: WaterSample["kind"]) => {
      samples.push({
        kind,
        state: header.dataset.navigationState || "",
        path: location.pathname,
        at: performance.now() - start,
        depth:
          document.querySelector(".header-spill")?.getBoundingClientRect()
            .height || 0,
        curtainHeight:
          document.querySelector(".route-curtain")?.getBoundingClientRect()
            .height || 0,
      });
    };
    const observer = new MutationObserver(() => record("state"));
    observer.observe(header, {
      attributes: true,
      attributeFilter: ["data-navigation-state"],
    });
    const push = history.pushState;
    const replace = history.replaceState;
    let path = location.pathname;
    const recordNavigation = () => {
      if (path !== location.pathname) {
        path = location.pathname;
        record("route");
      }
    };
    history.pushState = function (...args) {
      push.apply(this, args);
      recordNavigation();
    };
    history.replaceState = function (...args) {
      replace.apply(this, args);
      recordNavigation();
    };
    record("state");
    (window as WaterWindow).waterTrace = {
      finish: () => {
        observer.disconnect();
        history.pushState = push;
        history.replaceState = replace;
        delete (window as WaterWindow).waterTrace;
        return samples;
      },
    };
  });
}

async function finishTrace(page: Page) {
  return page.evaluate(() => (window as WaterWindow).waterTrace!.finish());
}

test("water moves autonomously while header controls and page layout stay steady", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/about");
  await ready(page);
  await page.mouse.move(2, 930);
  const samples = await page.evaluate(async () => {
    const sample = () => ({
      float: getComputedStyle(document.querySelector(".header-float")!)
        .transform,
      waves: [...document.querySelectorAll(".header-water-wave")].map(
        (node) => getComputedStyle(node).transform,
      ),
      controls: [
        ...document.querySelectorAll(
          ".header-bar .brand, .header-bar .theme-toggle, .header-bar .nav-project",
        ),
      ].map((node) => {
        const { x, y, width, height } = node.getBoundingClientRect();
        return { x, y, width, height };
      }),
      pageHeight: document.documentElement.scrollHeight,
    });
    const values = [sample()];
    for (let i = 0; i < 2; i++) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      values.push(sample());
    }
    return values;
  });
  expect(new Set(samples.map((sample) => sample.float)).size).toBeGreaterThan(
    1,
  );
  expect(
    new Set(samples.map((sample) => JSON.stringify(sample.waves))).size,
  ).toBeGreaterThan(1);
  expect(samples[0].waves).toHaveLength(2);
  for (const sample of samples.slice(1)) {
    expect(sample.controls).toEqual(samples[0].controls);
    expect(sample.pageHeight).toBe(samples[0].pageHeight);
  }
  await expect(page.locator(".header-spill")).toHaveCSS(
    "pointer-events",
    "none",
  );
  await page.locator(".site-header .theme-toggle").click();
  await expect(page.locator(".site-header")).toHaveAttribute(
    "data-navigation-state",
    "idle",
  );
});

test("header navigation spills, changes route near its peak and retracts across both themes", async ({
  page,
}) => {
  await mkdir("qa/header-water", { recursive: true });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 950 });
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
    await page.reload();
    await ready(page);
    for (const path of [
      "/services",
      "/about",
      "/work",
      "/portfolio",
      "/contact",
      "/",
    ]) {
      const oldPath = new URL(page.url()).pathname;
      await trace(page);
      const link =
        path === "/"
          ? page.locator(".site-header .brand")
          : page.locator(`.desktop-nav a[href="${path}"]`);
      await link.click();
      await expect(page).toHaveURL(path);
      await expect(page.locator(".site-header")).toHaveAttribute(
        "data-navigation-state",
        "idle",
      );
      const samples = await finishTrace(page);
      const spilling = samples.find((entry) => entry.state === "spilling")!;
      const covering = samples.find((entry) => entry.state === "covering")!;
      const route = samples.find((entry) => entry.kind === "route")!;
      expect(spilling, path).toBeTruthy();
      expect(covering, path).toBeTruthy();
      expect(route, path).toBeTruthy();
      expect(spilling.path).toBe(oldPath);
      expect(route.path).toBe(path);
      expect(route.at).toBeGreaterThanOrEqual(covering.at - 20);
      expect(covering.at - spilling.at).toBeGreaterThanOrEqual(130);
      expect(covering.depth).toBeGreaterThanOrEqual(120);
      expect(covering.depth).toBeLessThanOrEqual(280);
      expect(samples.some((entry) => entry.state === "retracting")).toBe(true);
      expect(samples.at(-1)!.state).toBe("idle");
      expect(samples.at(-1)!.at - spilling.at).toBeLessThan(1000);
      expect(
        Math.max(...samples.map((entry) => entry.curtainHeight)),
      ).toBeLessThan(1);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.screenshot({ path: `qa/header-water/idle-${theme}-1440.png` });
  }
  expect(errors).toEqual([]);
});

test("same-page and modified clicks stay native and a newer navigation replaces a pending spill", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/services");
  await ready(page);
  await trace(page);
  await page.locator('.desktop-nav a[href="/services"]').click();
  expect(
    (await finishTrace(page)).some((entry) => entry.state === "spilling"),
  ).toBe(false);
  await trace(page);
  await page.evaluate(() => {
    document.addEventListener(
      "click",
      (event) => {
        queueMicrotask(() => {
          (window as WaterWindow).waterModifiedClick = {
            ctrl: event.ctrlKey,
            prevented: event.defaultPrevented,
          };
        });
      },
      { once: true },
    );
  });
  await page.locator('.desktop-nav a[href="/about"]').click({
    modifiers: ["Control"],
  });
  // A headless browser may suppress background tabs. Verify our code leaves
  // the native modified click uncancelled after capture and bubble handlers.
  await expect
    .poll(() => page.evaluate(() => (window as WaterWindow).waterModifiedClick))
    .toEqual({ ctrl: true, prevented: false });
  await expect(page).toHaveURL("/services");
  expect(
    (await finishTrace(page)).some((entry) => entry.state === "spilling"),
  ).toBe(false);
  for (const other of page.context().pages())
    if (other !== page) await other.close();
  await trace(page);
  await page.evaluate(() => {
    document
      .querySelector<HTMLAnchorElement>('.desktop-nav a[href="/about"]')!
      .click();
    document
      .querySelector<HTMLAnchorElement>('.desktop-nav a[href="/work"]')!
      .click();
  });
  await expect(page).toHaveURL("/work");
  await expect(page.locator(".site-header")).toHaveAttribute(
    "data-navigation-state",
    "idle",
  );
  expect(
    (await finishTrace(page))
      .filter((entry) => entry.kind === "route")
      .map((entry) => entry.path),
  ).toEqual(["/work"]);
  await page.locator('.desktop-nav a[href="/about"]').focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/about");
  await page.goBack();
  await expect(page).toHaveURL("/work");
});

test("live reduced-motion preference freezes the surface and keeps navigation working", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/about");
  await ready(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const node of await page
    .locator(".header-float, .header-water-wave, .header-water-reflection")
    .all())
    await expect(node).toHaveCSS("animation-name", "none");
  await trace(page);
  await page.locator('.desktop-nav a[href="/work"]').click();
  await expect(page).toHaveURL("/work");
  await expect(page.locator(".site-header")).toHaveAttribute(
    "data-navigation-state",
    "idle",
  );
  const samples = await finishTrace(page);
  expect(samples.some((entry) => entry.state === "spilling")).toBe(false);
  expect(samples.some((entry) => entry.kind === "route")).toBe(true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".header-float")).not.toHaveCSS(
    "animation-name",
    "none",
  );
  await trace(page);
  await page.locator('.desktop-nav a[href="/about"]').click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page).toHaveURL("/about");
  await expect(page.locator(".site-header")).toHaveAttribute(
    "data-navigation-state",
    "idle",
  );
  expect(
    (await finishTrace(page))
      .filter((entry) => entry.kind === "route")
      .map((entry) => entry.path),
  ).toEqual(["/about"]);
});

test("mobile menu navigation avoids spill while the brand uses a smaller sheet and booking stays usable", async ({
  page,
}) => {
  await mkdir("qa/header-water", { recursive: true });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await ready(page);
  await expect(page.locator(".header-water-reflection")).toBeHidden();
  await trace(page);
  await page.getByRole("button", { name: "Open navigation" }).click();
  const panel = page.getByRole("dialog", { name: "Site navigation" });
  await panel.getByRole("link", { name: "Services", exact: true }).click();
  await expect(page).toHaveURL("/services");
  await expect(panel).toHaveCount(0);
  expect(
    (await finishTrace(page)).some((entry) => entry.state === "spilling"),
  ).toBe(false);
  await trace(page);
  await page.locator(".site-header .brand").click();
  await expect(page).toHaveURL("/");
  await expect(page.locator(".site-header")).toHaveAttribute(
    "data-navigation-state",
    "idle",
  );
  const covering = (await finishTrace(page)).find(
    (entry) => entry.state === "covering",
  )!;
  expect(covering).toBeTruthy();
  expect(covering.depth).toBeGreaterThanOrEqual(80);
  expect(covering.depth).toBeLessThanOrEqual(160);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await panel
    .getByRole("button", { name: "Book a Meeting", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: /Book a Meeting/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close booking" }).click();
  await page.getByRole("button", { name: "Close navigation" }).click();
  await page.screenshot({ path: "qa/header-water/idle-mobile-390.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("a delayed route cannot leave the spill covering content or navigation locked", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 950 });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let observed!: () => void;
  const requestSeen = new Promise<void>((resolve) => {
    observed = resolve;
  });
  await page.route("**/contact?*", async (route) => {
    if (new URL(route.request().url()).searchParams.has("_rsc")) {
      observed();
      await gate;
    }
    await route.continue();
  });
  try {
    await page.goto("/about");
    await ready(page);
    await page.evaluate(() => {
      const main = document.getElementById("main")!;
      const original = main.animate;
      const spy = {
        scaleCount: 0,
        restore: () => {
          main.animate = original;
          delete (window as WaterWindow).waterMainMotion;
        },
      };
      main.animate = function (keyframes, options) {
        if (JSON.stringify(keyframes).includes("scale(")) spy.scaleCount++;
        return original.call(this, keyframes, options);
      };
      (window as WaterWindow).waterMainMotion = spy;
    });
    await trace(page);
    await page.locator('.desktop-nav a[href="/contact"]').click();
    await requestSeen;
    await expect(page.locator(".site-header")).toHaveAttribute(
      "data-navigation-state",
      "idle",
      { timeout: 1500 },
    );
    const samples = await finishTrace(page);
    expect(samples.some((entry) => entry.state === "spilling")).toBe(true);
    expect(samples.some((entry) => entry.state === "retracting")).toBe(true);
    await expect(page.locator(".header-spill")).toHaveCSS("opacity", "0");
    await page.locator(".site-header .theme-toggle").click();
    release();
    await expect(page).toHaveURL("/contact");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const scaleCount = await page.evaluate(async () => {
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      return (window as WaterWindow).waterMainMotion!.scaleCount;
    });
    expect(scaleCount).toBe(0);
  } finally {
    release();
    await page.evaluate(() =>
      (window as WaterWindow).waterMainMotion?.restore(),
    );
  }
});
