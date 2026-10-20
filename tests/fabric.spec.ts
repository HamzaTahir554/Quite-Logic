import { test, expect } from "@playwright/test";

test("Fabric CTAs stretch, compress and focus without shifting surrounding layout", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const theme of ["day", "night"]) {
    await page.goto("/");
    await page.evaluate(
      (value) => localStorage.setItem("quietlogic-theme", value),
      theme,
    );
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute(
      "data-studio-ready",
      "true",
    );
    const button = page.locator(".hero-actions .fabric-button").first();
    const sibling = page.locator(".hero-actions .fabric-button").nth(1);
    await button.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    const original = await sibling.evaluate((node) => ({
      x: (node as HTMLElement).offsetLeft,
      y: (node as HTMLElement).offsetTop,
    }));
    await button.hover();
    await expect(button).toHaveCSS(
      "transform",
      "matrix(1.025, 0, 0, 1.01, 0, 0)",
    );
    await expect(button.locator(".link-arrow")).toHaveCSS(
      "transform",
      "matrix(1, 0, 0, 1, 5, 0)",
    );
    await expect
      .poll(() =>
        button.evaluate((node) => getComputedStyle(node, "::before").opacity),
      )
      .toBe("0.7");
    await expect(button.locator(".button-label")).toHaveCSS("filter", "none");
    await page.mouse.down();
    await expect(button).toHaveCSS(
      "transform",
      "matrix(0.985, 0, 0, 0.96, 0, 0)",
    );
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await expect(button).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    expect(
      await sibling.evaluate((node) => ({
        x: (node as HTMLElement).offsetLeft,
        y: (node as HTMLElement).offsetTop,
      })),
    ).toEqual(original);
    await page.keyboard.press("Tab");
    await button.focus();
    await expect(button).toHaveCSS("outline-style", "solid");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await button.hover();
    await expect(button).toHaveCSS("scale", "1");
    await expect(button).toHaveCSS("transform", "none");
    await expect(button).toHaveCSS("transition-duration", "0s");
    await expect(button.locator(".button-label")).toHaveCSS(
      "transform",
      "none",
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
});

test("Public primary and secondary CTAs share Fabric while text links remain lightweight", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/services",
    "/about",
    "/work",
    "/portfolio",
    "/portfolio/atlas-cloud",
    "/contact",
    "/reviews",
  ]) {
    await page.goto(path);
    expect(
      await page
        .locator(
          ".public-site .button:not(.fabric-button), .public-site .ql-button:not(.fabric-button)",
        )
        .count(),
    ).toBe(0);
    expect(await page.locator(".text-link.fabric-button").count()).toBe(0);
    for (const button of await page
      .locator(".public-site .fabric-button")
      .all()) {
      const tag = await button.evaluate((node) => node.tagName);
      expect(["A", "BUTTON"]).toContain(tag);
      if (tag === "A") await expect(button).toHaveAttribute("href", /.+/);
    }
  }
});

test("Mobile Fabric buttons preserve touch targets, form semantics and booking interaction", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    await page.goto("/contact");
    const submit = page.getByRole("button", {
      name: "Send Message",
      exact: true,
    });
    await expect(submit).toHaveAttribute("type", "submit");
    await submit.scrollIntoViewIfNeeded();
    expect((await submit.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const meeting = page
      .getByRole("button", { name: "Book a Meeting", exact: true })
      .filter({ visible: true })
      .first();
    await meeting.tap();
    await expect(
      page.getByRole("dialog", { name: /Book a Meeting/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close booking" }).tap();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } finally {
    await context.close();
  }
});
