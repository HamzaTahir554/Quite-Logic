import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { projectNarrative } from "../components/projects/ProjectNarrative";

const longTitle =
  "IdeasRepo: A student project idea discovery, duplicate prevention and Collaboration Portal";
const description =
  "A complete collaboration platform for discovering useful project ideas. ".repeat(
    18,
  );
const projects = [
  longTitle,
  "Atlas Cloud",
  "A third carefully considered project",
].map((title, index) => ({
  id: `presentation-${index}`,
  title,
  description,
  category: "Web Development",
  project_url: "/portfolio/atlas-cloud",
  image_url: "/projects/pulse.svg",
  source_slug: null,
}));
async function loadCards(page: Page, count = 3) {
  await page.route("**/api/projects?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        projects: projects.slice(0, count),
        total: count,
        page: 1,
      }),
    }),
  );
  await page.goto("/portfolio");
  await expect(page.locator("html")).toHaveAttribute(
    "data-studio-ready",
    "true",
  );
  await page
    .locator(".portfolio-filters")
    .getByRole("button", { name: "Web", exact: true })
    .click();
  await expect(page.locator(".project-identity-button")).toHaveCount(count);
}

test("portfolio cards stay compact, aligned and readable across themes and screen sizes", async ({
  page,
}) => {
  await mkdir("qa/portfolio-refinement", { recursive: true });
  await page.goto("/contact");
  for (const theme of ["day", "night"]) {
    for (const width of [1440, 1280, 1024, 768, 425, 375, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(
        (mode) => localStorage.setItem("quietlogic-theme", mode),
        theme,
      );
      await loadCards(page);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const cards = page.locator(
        ".managed-project-card:has(.project-identity-button)",
      );
      const card = cards.first();
      await card.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      await expect(card).toHaveAttribute("data-open", "false");
      const metrics = await cards.evaluateAll((nodes) =>
        nodes.map((node) => {
          const title = node.querySelector(".managed-project-title")!;
          const rect = node.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            titleHeight: title.getBoundingClientRect().height,
            lineHeight: parseFloat(getComputedStyle(title).lineHeight),
            fit: getComputedStyle(node.querySelector("img")!).objectFit,
          };
        }),
      );
      for (const metric of metrics) {
        expect(metric.width).toBeLessThanOrEqual(380);
        expect(metric.height).toBeGreaterThanOrEqual(420);
        expect(metric.height).toBeLessThanOrEqual(500);
        expect(metric.titleHeight).toBeLessThanOrEqual(
          metric.lineHeight * 3 + 1,
        );
        expect(metric.fit).toBe("contain");
      }
      if (width >= 768)
        expect(Math.abs(metrics[0].top - metrics[1].top)).toBeLessThan(1);
      if (width >= 1100)
        expect(Math.abs(metrics[0].top - metrics[2].top)).toBeLessThan(1);
      if (width < 650)
        expect(metrics[1].top).toBeGreaterThan(
          metrics[0].top + metrics[0].height,
        );
      await expect(
        card.getByRole("heading", { name: longTitle, exact: true }),
      ).toBeVisible();
      await card.hover();
      await expect(card).toHaveAttribute("data-open", "true");
      await expect(card.locator(".managed-project-description")).toHaveCSS(
        "opacity",
        "1",
      );
      const overlap = await card.evaluate(
        (node) =>
          node.querySelector(".managed-project-title")!.getBoundingClientRect()
            .bottom -
          node
            .querySelector(".managed-project-description")!
            .getBoundingClientRect().top,
      );
      expect(overlap).toBeLessThanOrEqual(0);
      await expect(card.locator(".project-description-copy")).toHaveCSS(
        "overflow",
        "hidden",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await card.screenshot({
        path: `qa/portfolio-refinement/${theme}-${width}-open.png`,
      });
      await page.unroute("**/api/projects?**");
    }
  }
});

test("a single project is centered without stretching the card", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loadCards(page, 1);
  const grid = await page.locator(".managed-project-grid").boundingBox();
  const card = await page
    .locator(".managed-project-card:has(.project-identity-button)")
    .boundingBox();
  expect(card!.width).toBeLessThanOrEqual(380);
  expect(
    Math.abs(card!.x + card!.width / 2 - grid!.x - grid!.width / 2),
  ).toBeLessThan(1);
});

test("keyboard controls expose the preview and follow the dedicated project link", async ({
  page,
}) => {
  await loadCards(page);
  const card = page
    .locator(".managed-project-card:has(.project-identity-button)")
    .first();
  await page.mouse.move(0, 0);
  await card.locator(".project-identity-button").focus();
  await page.keyboard.press("Space");
  await expect(card).toHaveAttribute("data-open", "true");
  await page.keyboard.press("Tab");
  await expect(card.getByRole("region")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(card.getByRole("link", { name: "View Project" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/portfolio/atlas-cloud");
});

test("touch reveals first, then opens on a second tap or the CTA", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 900 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    await loadCards(page);
    let card = page
      .locator(".managed-project-card:has(.project-identity-button)")
      .first();
    await card.locator(".project-identity-button").tap();
    await expect(page).toHaveURL("/portfolio");
    await expect(card).toHaveAttribute("data-open", "true");
    await card.locator(".managed-project-logo").tap();
    await expect(page).toHaveURL("/portfolio/atlas-cloud");
    await page.unroute("**/api/projects?**");
    await loadCards(page);
    card = page
      .locator(".managed-project-card:has(.project-identity-button)")
      .first();
    await card.locator(".project-identity-button").tap();
    await card.getByRole("link", { name: "View Project" }).tap();
    await expect(page).toHaveURL("/portfolio/atlas-cloud");
  } finally {
    await context.close();
  }
});

test("featured work uses the existing flag and public cards show concise metadata", async ({
  page,
}) => {
  await page.route("**/api/projects?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        projects: [
          { ...projects[0], source_slug: "atlas-cloud" },
          projects[1],
          {
            ...projects[2],
            featured: true,
            short_description:
              "A concise introduction to the featured project.",
          },
        ],
        total: 3,
        page: 1,
      }),
    }),
  );
  for (const width of [1440, 768, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/portfolio");
    await page
      .locator(".portfolio-filters")
      .getByRole("button", { name: "Web", exact: true })
      .click();
    await expect(
      page.locator(".managed-project-card:has(.project-identity-button)"),
    ).toHaveCount(3);
    const featured = page.locator(".portfolio-featured .managed-project-card");
    await expect(featured).toContainText("Featured");
    await expect(
      featured.locator(".managed-project-description"),
    ).toContainText("A concise introduction");
    await expect(
      featured.getByRole("link", { name: "View Project" }),
    ).toBeVisible();
    await expect(page.locator(".project-concept-label")).toHaveText("Concept");
    await expect(page.locator(".portfolio-count")).toHaveText(
      "3 Projects · Web",
    );
    await expect(page.locator("main")).not.toContainText("published project");
    const before = await featured.boundingBox();
    const mode = await page.locator("html").getAttribute("data-theme");
    await page
      .getByRole("button", {
        name: `Switch to ${mode === "day" ? "night" : "day"} mode`,
      })
      .click();
    const after = await featured.boundingBox();
    expect(after!.width).toBeCloseTo(before!.width, 0);
    expect(after!.height).toBe(before!.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await featured.screenshot({
      path: `qa/portfolio-refinement/featured-${width}.png`,
    });
  }
});

test("project narrative preserves supplied sections without inventing results", () => {
  expect(
    projectNarrative(
      "An introduction.\n\nChallenge: A fragmented workflow.\n\n## Solution\nOne clear workspace.\n\nOutcome:\nFewer manual steps.",
    ),
  ).toEqual([
    { title: "Project overview", text: "An introduction." },
    { title: "Challenge", text: "A fragmented workflow." },
    { title: "Solution", text: "One clear workspace." },
    { title: "Outcome", text: "Fewer manual steps." },
  ]);
  expect(projectNarrative("A simple project description.")).toEqual([
    { title: "Project overview", text: "A simple project description." },
  ]);
});

test("editorial project details preserve proportional lazy visuals and a clear return path", async ({
  page,
}) => {
  for (const width of [1440, 375, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const slug of ["nexa-ops", "pulse-crm"]) {
      await page.goto(`/portfolio/${slug}`);
      await expect(
        page.getByRole("link", { name: "← Back to Portfolio", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Technology direction" }),
      ).toBeVisible();
      const visual = page.locator(".case-artwork img");
      await expect(visual).toHaveAttribute("loading", "lazy");
      await visual.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          visual.evaluate((node: HTMLImageElement) => node.naturalWidth),
        )
        .toBeGreaterThan(0);
      await expect(visual).toHaveCSS("object-fit", "contain");
      await expect(page.locator(".graph-background canvas")).toHaveCount(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (slug === "nexa-ops") {
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "instant" }),
        );
        await page.screenshot({
          path: `qa/portfolio-refinement/detail-${width}.png`,
          fullPage: true,
        });
      }
    }
  }
});
