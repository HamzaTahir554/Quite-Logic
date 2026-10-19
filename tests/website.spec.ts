import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import type { Page } from "@playwright/test";
async function visit(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute(
    "data-studio-ready",
    "true",
  );
}
async function prepareScreenshot(page: Page) {
  await page.locator("footer").waitFor({ state: "attached" });
  await page.evaluate(() => document.fonts.ready);
  for (const img of await page.locator("main img").all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((element: HTMLImageElement) =>
      element.decode().catch(() => {}),
    );
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}
const routes = ["/", "/services", "/about", "/work", "/portfolio", "/contact"];
test("service selector works without WebGL and with keyboard", async ({
  page,
}) => {
  await visit(page, "/");
  const selector = page.getByRole("group", { name: "Choose a service" });
  const ai = selector.getByRole("button", { name: /AI Automation/ });
  await ai.focus();
  await page.keyboard.press("Enter");
  await expect(ai).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".explorer-selection h2")).toHaveText(
    "AI Automation",
  );
  await expect(page.locator(".explorer-selection a")).toHaveAttribute(
    "href",
    "/services#ai-automation",
  );
  await expect(page.locator(".explorer-visual canvas")).toHaveCount(0);
});
test("motion-enabled navigation preserves client routing and scene lifecycle", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await visit(page, "/");
  await page.locator(".graph-background canvas").waitFor();
  await page.evaluate(
    () => (document.documentElement.dataset.clientRouteProbe = "preserved"),
  );
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("link", { name: "Services", exact: true })
    .click();
  await expect(page).toHaveURL("/services");
  await expect(page.locator(".service-editorial")).toHaveCount(5);
  await expect(page.locator("main canvas")).toHaveCount(0);
  await expect(page.locator(".graph-background canvas")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.dataset.clientRouteProbe,
    ),
  ).toBe("preserved");
  await expect(page.locator("#ai-vision h2")).toHaveText("AI Vision");
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("link", { name: "About", exact: true })
    .click();
  await expect(page).toHaveURL("/about");
  await expect(page.locator("main canvas")).toHaveCount(0);
  await expect(page.locator(".graph-background canvas")).toHaveCount(1);
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("link", { name: "Work", exact: true })
    .click();
  await expect(page).toHaveURL("/work");
  await page.locator(".process-step").last().scrollIntoViewIfNeeded();
  await expect
    .poll(() => page.locator(".workflow-caption").innerText())
    .not.toContain("01 / 06");
  await page.goBack();
  await expect(page).toHaveURL("/about");
  expect(errors).toEqual([]);
});
test("pages, responsive layouts, and metadata", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const titles = new Set();
  for (const width of [320, 375, 425, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await visit(page, route);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `http://localhost:3000${route === "/" ? "" : route}`,
      );
      if (width === 1440) titles.add(await page.title());
    }
  }
  expect(titles.size).toBe(6);
  expect(errors).toEqual([]);
});
test("mobile navigation and portfolio interactions", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await visit(page, "/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  const nav = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(nav).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(nav).not.toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await nav.getByRole("link", { name: "Services", exact: true }).click();
  await expect(page).toHaveURL("/services");
  await expect(nav).not.toBeVisible();
  await visit(page, "/portfolio");
  await expect(page.locator(".managed-project-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await expect(page.locator(".managed-project-card")).toHaveCount(1);
  await expect(page.locator(".managed-project-card")).toContainText(
    "Pulse / CRM",
  );
  await page
    .getByRole("button", { name: "Computer Vision", exact: true })
    .click();
  await expect(page.locator(".managed-project-card")).toHaveCount(0);
  await expect(page.locator(".portfolio-empty")).toContainText("no projects");
  await page.getByRole("button", { name: "Explore all projects" }).click();
  await expect(page.locator(".managed-project-card")).toHaveCount(3);
  await page
    .getByRole("button", { name: "View details for Atlas / Cloud" })
    .focus();
  await page.keyboard.press("Space");
  await page
    .locator(".managed-project-card")
    .filter({ hasText: "Atlas / Cloud" })
    .getByRole("link", { name: "View Project" })
    .click();
  await expect(page).toHaveURL("/portfolio/atlas-cloud");
});
test("contact submits on site and confirms only after the SMTP endpoint responds", async ({
  page,
}) => {
  let submissions = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/contact", async (route) => {
    submissions++;
    const payload = route.request().postDataJSON();
    expect(payload.email).toBe("client@example.test");
    expect(payload.to).toBeUndefined();
    await gate;
    await route.continue();
  });
  await visit(page, "/contact");
  await page.getByRole("button", { name: "Send Message", exact: true }).click();
  await expect(
    page.getByText("Please enter at least 2 characters."),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Your name" }).fill("Contact Client");
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("client@example.test");
  await page
    .getByRole("textbox", { name: "Tell us about your project" })
    .fill("A detailed project inquiry submitted directly through the website.");
  await page.getByRole("button", { name: "Send Message", exact: true }).click();
  const form = page.getByRole("form", { name: "Project inquiry" });
  await expect(form).toHaveAttribute("aria-busy", "true");
  await expect(
    page.getByRole("button", { name: "Sending…", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "Your name" })).toBeDisabled();
  await expect(form.getByRole("alert")).toContainText("Sending your message");
  await form.evaluate((element: HTMLFormElement) => {
    element.requestSubmit();
    element.requestSubmit();
  });
  await mkdir("qa/contact-email", { recursive: true });
  await form.screenshot({ path: "qa/contact-email/sending.png" });
  const delivered = page.waitForResponse((response) =>
    response.url().endsWith("/api/contact"),
  );
  release();
  expect((await delivered).status()).toBe(200);
  await expect(form.getByRole("alert")).toContainText(
    "Your message has been submitted",
  );
  await expect(form).toHaveAttribute("aria-busy", "false");
  await expect(
    page.getByRole("button", { name: "Message submitted", exact: true }),
  ).toBeDisabled();
  expect(submissions).toBe(1);
  await form.screenshot({ path: "qa/contact-email/submitted.png" });
  await expect(page.getByRole("link", { name: "Open email app" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("textbox", { name: "Your name" })).toHaveValue(
    "Contact Client",
  );
  await page.getByRole("textbox", { name: "Your name" }).fill("Updated Client");
  await expect(form.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Send Message", exact: true }),
  ).toBeEnabled();
});

test("SEO endpoints and branded 404", async ({ page, request }) => {
  for (const route of [
    "/sitemap.xml",
    "/robots.txt",
    "/manifest.webmanifest",
    "/social-image.png",
  ])
    expect((await request.get(route)).status()).toBe(200);
  expect((await page.goto("/missing-page"))?.status()).toBe(404);
  await expect(page.locator("h1")).toContainText("This page isn’t here.");
});
test("capture required design snaps", async ({ page }) => {
  await mkdir("qa/screenshots", { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [label, width] of [
    ["desktop", 1440],
    ["tablet", 768],
    ["mobile", 375],
  ] as const) {
    await page.setViewportSize({
      width,
      height: label === "mobile" ? 812 : 1000,
    });
    await visit(page, "/");
    await prepareScreenshot(page);
    await page.screenshot({
      path: `qa/screenshots/home-${label}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const route of routes.slice(1)) {
    await visit(page, route);
    await prepareScreenshot(page);
    await page.screenshot({
      path: `qa/screenshots/${route.slice(1)}-desktop.png`,
      fullPage: true,
    });
  }
  await visit(page, "/portfolio");
  await page
    .getByRole("button", { name: "Computer Vision", exact: true })
    .click();
  await expect(page.locator(".project-card")).toHaveCount(0);
  await page.screenshot({
    path: "qa/screenshots/portfolio-filter.png",
    fullPage: true,
  });
});
