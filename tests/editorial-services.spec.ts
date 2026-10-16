import { test, expect } from "@playwright/test";

test("home removes only the requested sections and services use matching artwork", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.locator(".about-panel, .process-step")).toHaveCount(0);
  await expect(page.locator(".project-list")).toHaveCount(1);
  await expect(page.locator(".signature-explorer")).toHaveCount(1);
  await expect(page.locator(".cta-compact")).toHaveCSS("padding-top", "0px");
  await page.goto("/services");
  await expect(page.locator(".service-editorial")).toHaveCount(5);
  await expect(
    page.locator("canvas, .signature-explorer, .service-detail"),
  ).toHaveCount(0);
  for (const [slug, name, file] of [
    ["web-development", "Web Development", "Web.png"],
    ["app-development", "App Development", "App.png"],
    ["ai-automation", "AI Automation", "Ai.png"],
    ["ai-vision", "AI Vision", "ai_vision.png"],
    ["custom-software", "Custom Software Solutions", "custom_software.png"],
  ]) {
    const row = page.locator(`#${slug}`);
    await row.scrollIntoViewIfNeeded();
    await expect(row.locator("h2")).toHaveText(name);
    const img = row.locator("img");
    await img.evaluate((el: HTMLImageElement) => el.decode());
    expect(
      await img.evaluate((el: HTMLImageElement) => el.naturalWidth),
    ).toBeGreaterThan(0);
    expect(decodeURIComponent((await img.getAttribute("src"))!)).toContain(
      `/services/${file}`,
    );
    await expect(
      row.getByRole("link", { name: "Explore Service", exact: true }),
    ).toHaveAttribute("href", `/contact?service=${encodeURIComponent(name)}`);
  }
  const positions = await page
    .locator(".service-editorial")
    .evaluateAll((rows) =>
      rows.map((row) => ({
        image: row.querySelector(".service-art-frame")!.getBoundingClientRect()
          .x,
        copy: row
          .querySelector(".service-editorial-copy")!
          .getBoundingClientRect().x,
      })),
    );
  expect(positions[0].image).toBeLessThan(positions[0].copy);
  expect(positions[1].image).toBeGreaterThan(positions[1].copy);
  await page.goto("/services#ai-vision");
  await expect(page.locator("#ai-vision h2")).toBeInViewport();
  await page
    .locator("#ai-vision")
    .getByRole("link", { name: "Explore Service", exact: true })
    .click();
  await expect(page).toHaveURL(/\/contact\?service=AI%20Vision/);
  expect(errors).toEqual([]);
});

test("desktop cursor and image/button motion remain sharp, bounded and accessible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/services");
  await expect(page.locator("html")).toHaveAttribute(
    "data-studio-ready",
    "true",
  );
  await expect(page.locator(".service-editorial")).toHaveCount(5);
  const row = page.locator(".service-editorial").first();
  await row.scrollIntoViewIfNeeded();
  const art = row.locator(".service-art-frame");
  const bounds = (await art.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width * 0.8,
    bounds.y + bounds.height * 0.4,
  );
  const cursor = page.locator(".studio-cursor");
  await expect(cursor).toHaveAttribute("data-state", "OPEN");
  await expect(cursor).toHaveCSS("opacity", "1");
  await expect(cursor.locator(".cursor-ring")).toHaveCSS(
    "border-top-color",
    "rgb(47, 128, 254)",
  );
  await expect
    .poll(() =>
      row
        .locator(".service-art-drift")
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41),
    )
    .toBeGreaterThan(1);
  const shift = await row
    .locator(".service-art-drift")
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
  expect(shift).toBeLessThanOrEqual(4);
  const cta = row.getByRole("link", { name: "Explore Service", exact: true });
  const layout = await cta.evaluate((el) => ({
    w: (el as HTMLElement).offsetWidth,
    h: (el as HTMLElement).offsetHeight,
  }));
  await cta.hover();
  await expect(cursor).toHaveAttribute("data-state", "interactive");
  await expect(cta).toHaveCSS("scale", "1.04");
  expect(
    await cta.evaluate((el) => ({
      w: (el as HTMLElement).offsetWidth,
      h: (el as HTMLElement).offsetHeight,
    })),
  ).toEqual(layout);
  for (const el of [
    cta,
    cta.locator(".button-label"),
    cta.locator(".button-arrow"),
    cursor,
    cursor.locator(".cursor-ring"),
  ]) {
    await expect(el).toHaveCSS("filter", "none");
    await expect(el).toHaveCSS("backdrop-filter", "none");
  }
  await page.mouse.move(5, 400);
  await expect(cursor).toHaveAttribute("data-state", "normal");
  await expect(cta).toHaveCSS("scale", "1");
  await page.goto("/portfolio");
  await expect(page.locator("html")).toHaveAttribute(
    "data-studio-ready",
    "true",
  );
  await page.locator('[data-cursor="VIEW"]').first().hover();
  await expect(cursor).toHaveAttribute("data-state", "VIEW");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(cursor).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-studio-cursor");
});

test("mobile services stack without overflow, custom cursor or pointer drift", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 375, height: 812 },
    reducedMotion: "no-preference",
  });
  try {
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/services");
    await expect(page.locator("html")).toHaveAttribute(
      "data-studio-ready",
      "true",
    );
    for (const row of await page.locator(".service-editorial").all()) {
      await row.scrollIntoViewIfNeeded();
      await row.locator("img").evaluate((el: HTMLImageElement) => el.decode());
      const image = (await row.locator(".service-art-frame").boundingBox())!;
      const copy = (await row
        .locator(".service-editorial-copy")
        .boundingBox())!;
      expect(copy.y).toBeGreaterThanOrEqual(image.y + image.height);
      await expect(row.locator(".service-art-drift")).toHaveCSS(
        "transform",
        "none",
      );
    }
    await expect(page.locator(".studio-cursor, canvas")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: "qa/screenshots/services-mobile.png",
      fullPage: true,
    });
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
