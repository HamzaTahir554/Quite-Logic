import { test, expect } from "@playwright/test";

test("Atlas replaces the project across routes, metadata, breadcrumbs and sitemap", async ({
  page,
  request,
}) => {
  for (const path of ["/", "/portfolio"]) {
    await page.goto(path);
    const card =
      path === "/"
        ? page.locator(".atlas-showcase")
        : page
            .locator(".managed-project-card")
            .filter({ hasText: "Atlas / Cloud" });
    if (path !== "/") await card.hover();
    await expect(card.getByRole("heading")).toHaveText("Atlas / Cloud");
    await expect(card).toContainText(
      "Developer-facing infrastructure interface with quick observability, deployments and system status.",
    );
    await expect(
      card.getByRole("link", {
        name: path === "/" ? "Explore concept" : "View Project",
      }),
    ).toHaveAttribute("href", "/portfolio/atlas-cloud");
  }
  await page.goto("/portfolio/atlas-cloud");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText("Atlas / Cloud");
  await expect(page).toHaveTitle(
    "Atlas / Cloud — Product Concept | Quite Logic",
  );
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
    "href",
    "http://localhost:3000/portfolio/atlas-cloud",
  );
  await expect(
    page.getByRole("navigation", { name: "Breadcrumb" }),
  ).toContainText("Home/Portfolio/Atlas / Cloud");
  const structured = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  expect(structured).toContain("Atlas / Cloud");
  expect(structured).toContain("/portfolio/atlas-cloud");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/portfolio/atlas-cloud");
  expect(sitemap).not.toContain("/portfolio/lens-insight");
  const legacy = await request.get("/portfolio/lens-insight", {
    maxRedirects: 0,
  });
  expect(legacy.status()).toBe(200);
  expect(await legacy.text()).toContain("/portfolio/atlas-cloud");
  await page.goto("/portfolio/lens-insight");
  await expect(page).toHaveURL("/portfolio/atlas-cloud");
});

test("Atlas layout, terminal and reduced motion stay usable across screen sizes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [320, 375, 425, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/portfolio/atlas-cloud");
    await expect(page.locator(".atlas-primary")).toBeVisible();
    await expect(
      page.getByRole("img", { name: /Illustrative deployment terminal/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width <= 850) {
      const header = await page.locator(".site-header").boundingBox();
      const menu = await page
        .getByRole("button", { name: "Open navigation" })
        .boundingBox();
      expect(
        Math.abs(header!.x + header!.width - menu!.x - menu!.width),
      ).toBeLessThan(25);
    }
    await expect(page.locator(".deployment-live")).toHaveCSS("opacity", "1");
    const layout = await page.locator(".atlas-primary").evaluate((el) => {
      const a = el.querySelector(".atlas-copy")!.getBoundingClientRect();
      const b = el.querySelector(".atlas-visual")!.getBoundingClientRect();
      return {
        ratio: a.width / (a.width + b.width),
        y: a.y,
        otherY: b.y,
        height: a.height,
      };
    });
    if (width > 650) {
      expect(layout.ratio).toBeCloseTo(0.43, 1);
      expect(Math.abs(layout.y - layout.otherY)).toBeLessThan(2);
    } else
      expect(layout.otherY).toBeGreaterThanOrEqual(
        layout.y + layout.height - 1,
      );
  }
  expect(errors).toEqual([]);
});

test("terminal sequence, gentle pointer tilt and unique banners work with motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/portfolio/atlas-cloud");
  await expect(page.locator(".deployment-stage")).toHaveAttribute(
    "data-started",
    "true",
  );
  await expect
    .poll(() =>
      page
        .locator(".deployment-live")
        .evaluate((el) => Number(getComputedStyle(el).opacity)),
    )
    .toBe(1);
  const initialTilt = await page
    .locator(".deployment-tilt")
    .evaluate((el) => getComputedStyle(el).transform);
  await page.mouse.move(1230, 350);
  await expect
    .poll(() =>
      page
        .locator(".deployment-tilt")
        .evaluate((el) => getComputedStyle(el).transform),
    )
    .not.toBe(initialTilt);
  const tilt = await page.locator(".deployment-tilt").evaluate((el) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return {
      x: (Math.asin(-matrix.m23) * 180) / Math.PI,
      y: (Math.asin(matrix.m13) * 180) / Math.PI,
    };
  });
  expect(Math.abs(tilt.x)).toBeLessThanOrEqual(3);
  expect(Math.abs(tilt.y)).toBeLessThanOrEqual(3);
  for (const variant of ["services", "about", "work", "portfolio", "contact"]) {
    await page.goto("/" + variant);
    await expect(page.locator("html")).toHaveAttribute(
      "data-studio-ready",
      "true",
    );
    await expect(page.locator(".banner-" + variant)).toHaveCount(1);
    await expect(page.locator(".banner-" + variant)).toBeVisible();
    await expect(page.locator(".banner-art")).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});

test("touch devices keep terminal motion without mouse tilt", async ({
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
    await page.goto("/portfolio/atlas-cloud");
    await expect(page.locator(".deployment-terminal")).toBeVisible();
    await expect(page.locator(".deployment-tilt")).toHaveCSS(
      "transform",
      "none",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
