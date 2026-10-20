import { test, expect, type Page } from "@playwright/test";

declare global {
  interface Window {
    phoneInputAccess: string[];
  }
}

const cube = (page: Page) => page.locator(".signature-explorer");
const selector = (page: Page) =>
  page.getByRole("group", { name: "Choose a service" });
async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute(
    "data-studio-ready",
    "true",
  );
  await expect(cube(page)).toBeVisible();
  await cube(page).evaluate((el) =>
    el.scrollIntoView({ block: "center", behavior: "instant" }),
  );
}

test("exact gray design system and all six keyboard-accessible cube faces", async ({
  page,
}) => {
  await ready(page);
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(75, 85, 96)",
  );
  await expect(cube(page)).toHaveCSS("background-color", "rgb(89, 101, 114)");
  await expect(page.locator("footer")).toHaveCSS(
    "background-color",
    "rgb(48, 57, 68)",
  );
  await expect(cube(page)).toHaveAttribute("data-renderer", "css");
  await expect(cube(page).locator("canvas")).toHaveCount(0);
  await expect(cube(page).locator(".cube-face")).toHaveCount(6);
  const headings = [
    "Web Development",
    "App Development",
    "AI Automation",
    "AI Vision",
    "Custom Software Solutions",
    "Quite Logic",
  ];
  for (let i = 0; i < 6; i++) {
    const button = selector(page).getByRole("button").nth(i);
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(cube(page).locator(".explorer-selection h2")).toHaveText(
      headings[i],
    );
    await expect(cube(page)).toHaveAttribute("data-settled-face", `${i + 1}`);
  }
  await page.getByRole("button", { name: "Next service", exact: true }).click();
  await expect(cube(page).locator(".explorer-selection h2")).toHaveText(
    "Web Development",
  );
  await page.goto("/");
  await expect(page.locator(".service-blocks")).toHaveCount(0);
  await selector(page)
    .getByRole("button", { name: /AI Vision/ })
    .click();
  await expect(cube(page).locator(".explorer-selection a")).toHaveAttribute(
    "href",
    "/services#ai-vision",
  );
});

test("WebGL cube scrolls, snaps, selects and drags without browser errors", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await ready(page);
  await expect(cube(page)).toHaveAttribute("data-renderer", "webgl");
  await expect(cube(page)).toHaveAttribute("data-canvas-ready", "true");
  await expect(cube(page).locator(".css-service-cube")).toHaveCount(0);
  await cube(page).locator("canvas").waitFor();
  await expect(cube(page)).toHaveAttribute("data-active-face", "6");
  await page.waitForTimeout(3600); // Initial brand hold precedes scroll-driven exploration.
  const visual = cube(page).locator(".explorer-visual");
  const y = await visual.evaluate(
    (el) => el.getBoundingClientRect().top + scrollY,
  );
  await page.evaluate(
    (y) =>
      window.scrollTo({ top: y - innerHeight * 0.76, behavior: "instant" }),
    y,
  );
  await expect(cube(page)).toHaveAttribute("data-active-face", "1");
  await page.evaluate(
    (y) => window.scrollTo({ top: y + 100, behavior: "instant" }),
    y,
  );
  await expect(cube(page)).toHaveAttribute("data-active-face", "4");
  await expect(cube(page)).toHaveAttribute("data-settled-face", "4");
  await visual.scrollIntoViewIfNeeded();
  await selector(page)
    .getByRole("button", { name: /01 Web/ })
    .click();
  await expect(cube(page)).toHaveAttribute("data-settled-face", "1");
  const canvasBounds = await cube(page).locator("canvas").boundingBox();
  if (!canvasBounds) throw new Error("Canvas has no bounds");
  // A level front face is directly selectable; no angled side-face hit target.
  await page.mouse.click(
    canvasBounds.x + canvasBounds.width / 2,
    canvasBounds.y + canvasBounds.height / 2,
  );
  await expect(cube(page)).toHaveAttribute("data-settled-face", "1");
  const bounds = await cube(page).locator(".cube-interaction").boundingBox();
  if (!bounds) throw new Error("Cube has no bounds");
  await page.mouse.move(
    bounds.x + bounds.width * 0.6,
    bounds.y + bounds.height * 0.5,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.25,
    bounds.y + bounds.height * 0.5,
    { steps: 16 },
  );
  await page.mouse.up();
  await expect(cube(page)).toHaveAttribute("data-active-face", "2");
  await expect(cube(page)).toHaveAttribute("data-settled-face", "2");
  await expect(cube(page).locator(".explorer-selection h2")).toHaveText(
    "App Development",
  );
  // Releasing a vertical mouse gesture outside the object must not leave drag mode stuck.
  await page.mouse.move(
    bounds.x + bounds.width * 0.5,
    bounds.y + bounds.height * 0.5,
  );
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.5, bounds.y - 20, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(cube(page).locator(".cube-interaction")).toHaveAttribute(
    "data-dragging",
    "false",
  );
  // Selecting every physical face exercises the quaternion snap, including top/bottom.
  for (let index = 2; index < 6; index++) {
    await selector(page).getByRole("button").nth(index).click();
    await expect(cube(page)).toHaveAttribute(
      "data-settled-face",
      `${index + 1}`,
    );
  }
  const frames = await page.evaluate(
    () =>
      new Promise<{ count: number; p95: number }>((resolve) => {
        const times: number[] = [];
        let previous = performance.now();
        const start = previous;
        function frame(now: number) {
          times.push(now - previous);
          previous = now;
          if (now - start < 1000) requestAnimationFrame(frame);
          else {
            times.sort((a, b) => a - b);
            resolve({
              count: times.length,
              p95: times[Math.floor(times.length * 0.95)],
            });
          }
        }
        requestAnimationFrame(frame);
      }),
  );
  await testInfo.attach("local-frame-sample", {
    body: JSON.stringify(frames),
    contentType: "application/json",
  });
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(cube(page)).toHaveAttribute("data-motion-active", "false");
  expect(errors).toEqual([]);
});

test("automatic rotation continues without the removed pause control and stops when the tab is hidden", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page);
  await page.mouse.move(5, 400);
  const before = await cube(page).getAttribute("data-active-face");
  await expect
    .poll(() => cube(page).getAttribute("data-active-face"), { timeout: 12000 })
    .not.toBe(before);
  await expect(
    page.getByRole("button", {
      name: /(?:Pause|Play) automatic service rotation/,
    }),
  ).toHaveCount(0);
  await page.clock.install();
  // Page visibility is simulated explicitly: a browser's hidden-tab policy varies in headless mode.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(cube(page)).toHaveAttribute("data-motion-active", "false");
  await expect(page.locator("html")).toHaveAttribute(
    "data-motion-paused",
    "true",
  );
  const paused = await cube(page).getAttribute("data-active-face");
  await page.clock.fastForward(17000);
  await expect(cube(page)).toHaveAttribute("data-active-face", paused!);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(cube(page)).toHaveAttribute("data-motion-active", "true");
  await page.clock.fastForward(9000);
  await expect(cube(page)).not.toHaveAttribute("data-active-face", paused!);
});

test("mobile cube ignores physical motion and preserves touch, scrolling and reduced motion", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "no-preference",
  });
  try {
    await context.addInitScript(() => {
      window.phoneInputAccess = [];
      for (const name of [
        "DeviceOrientationEvent",
        "DeviceMotionEvent",
      ] as const) {
        const original = window[name];
        Object.defineProperty(window, name, {
          configurable: true,
          get() {
            window.phoneInputAccess.push(name);
            return original;
          },
        });
      }
      const original = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (
        type,
        listener,
        options,
      ) {
        if (/^device(orientation|motion)/.test(type))
          window.phoneInputAccess.push(type);
        return original.call(this, type, listener, options);
      };
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await ready(page);
    await expect(cube(page)).toHaveAttribute("data-renderer", "css");
    await expect(cube(page).locator("canvas")).toHaveCount(0);
    await selector(page).getByRole("button").first().click();
    await cube(page).locator(".cube-interaction").scrollIntoViewIfNeeded();
    const bounds = await cube(page).locator(".cube-interaction").boundingBox();
    if (!bounds) throw new Error("Cube has no bounds");
    const session = await context.newCDPSession(page);
    const x = bounds.x + bounds.width * 0.7,
      y = bounds.y + bounds.height * 0.5;
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let step = 1; step <= 8; step++)
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x - step * 14, y }],
      });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(cube(page)).toHaveAttribute("data-active-face", "2");
    await expect(cube(page).locator(".explorer-selection h2")).toHaveText(
      "App Development",
    );
    // Strong simulated readings must have no effect on the cube or site layers.
    for (const sign of [1, -1, 1, -1]) {
      await page.evaluate((sign) => {
        window.dispatchEvent(
          Object.assign(new Event("deviceorientation"), {
            beta: 80 * sign,
            gamma: 60 * sign,
            alpha: 90 * sign,
          }),
        );
        window.dispatchEvent(
          Object.assign(new Event("devicemotion"), {
            acceleration: { x: 30 * sign, y: 0, z: 0 },
            accelerationIncludingGravity: { x: 30 * sign, y: 9.8, z: 0 },
            rotationRate: {
              alpha: 500 * sign,
              beta: 500 * sign,
              gamma: 500 * sign,
            },
            interval: 16,
          }),
        );
      }, sign);
      await page.waitForTimeout(50);
      await expect(cube(page)).toHaveAttribute("data-active-face", "2");
      await expect(cube(page).locator(".cube-pointer-tilt")).toHaveCSS(
        "transform",
        "none",
      );
      expect(
        await page
          .locator("html, body, main, header, footer, .graph-background")
          .evaluateAll((elements) =>
            elements.every((element) => {
              const style = (element as HTMLElement).style;
              return !style.translate && !style.rotate;
            }),
          ),
      ).toBe(true);
    }
    const scrollX = bounds.x + 8;
    const beforeScroll = await page.evaluate(() => scrollY);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: scrollX, y }],
    });
    for (let step = 1; step <= 6; step++)
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: scrollX, y: y - step * 20 }],
      });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(beforeScroll);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(cube(page)).toHaveAttribute("data-motion-active", "false");
    await expect(page.locator(".cube-autoplay")).toHaveCount(0);
    await selector(page)
      .getByRole("button", { name: /Explore All/ })
      .click();
    await expect(cube(page).locator(".explorer-selection h2")).toHaveText(
      "Quite Logic",
    );
    await expect(cube(page).locator(".css-service-cube")).toHaveCSS(
      "transition-duration",
      "0s",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    for (const route of [
      "/",
      "/services",
      "/about",
      "/work",
      "/portfolio",
      "/contact",
    ]) {
      await page
        .locator("footer")
        .locator(`a[href="${route}"]`)
        .first()
        .click();
      await expect(page).toHaveURL(route);
      await expect(
        page.getByRole("button", { name: /phone motion/i }),
      ).toHaveCount(0);
      await expect(
        page.locator(
          "[data-device-shake-layer], [data-device-shaking], .device-motion-status, .cube-sensor",
        ),
      ).toHaveCount(0);
      expect(await page.evaluate(() => window.phoneInputAccess)).toEqual([]);
    }
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test("devices without WebGL retain the complete service experience", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith("webgl")) return null;
      return original.apply(this, [type, ...args] as Parameters<
        typeof original
      >);
    } as typeof original;
  });
  await ready(page);
  await expect(cube(page)).toHaveAttribute("data-renderer", "css");
  await selector(page)
    .getByRole("button", { name: /AI Vision/ })
    .click();
  await expect(cube(page).locator(".explorer-selection h2")).toHaveText(
    "AI Vision",
  );
  await expect(cube(page).locator("canvas")).toHaveCount(0);
  const interaction = cube(page).locator(".cube-interaction");
  await interaction.scrollIntoViewIfNeeded();
  const bounds = await interaction.boundingBox();
  if (!bounds) throw new Error("Cube has no bounds");
  const tilt = cube(page).locator(".cube-pointer-tilt");
  const angles = () =>
    tilt.evaluate((el) => {
      const transform = (el as HTMLElement).style.transform;
      const axis = (name: string) =>
        Number(
          transform.match(new RegExp(`${name}\\((-?[\\d.]+)deg\\)`))?.[1] ?? 0,
        );
      return { x: axis("rotateX"), y: axis("rotateY") };
    });
  await page.mouse.move(
    bounds.x + bounds.width * 0.85,
    bounds.y + bounds.height * 0.25,
  );
  await expect.poll(async () => (await angles()).y).toBeGreaterThan(1);
  const angle = await angles();
  expect(Math.abs(angle.x)).toBeLessThanOrEqual(3.01);
  expect(Math.abs(angle.y)).toBeLessThanOrEqual(3.01);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(tilt).toHaveCSS("transform", "none");
});
