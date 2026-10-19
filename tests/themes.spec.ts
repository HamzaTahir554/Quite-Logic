import { test, expect } from "@playwright/test";
import { mockCalendly } from "./fixtures/calendly";

const storageKey = "quietlogic-theme";
test("saved Day mode is applied before hydration even on a dark system", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  await context.addInitScript(() =>
    localStorage.setItem("quietlogic-theme", "day"),
  );
  const page = await context.newPage();
  await page.route(/\/_next\/static\/chunks\/.*\.js(?:\?.*)?$/, (route) =>
    route.abort(),
  );
  try {
    await page.goto("/services", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
    expect(
      await page.evaluate(() => getComputedStyle(document.body).color),
    ).toBe("rgb(24, 34, 45)");
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).colorScheme,
      ),
    ).toBe("light");
  } finally {
    await context.close();
  }
});

test("toggle preserves form values, graph identity, navigation and refresh preference", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|did not match|server rendered/i.test(message.text())
    )
      errors.push(message.text());
  });
  await page.goto("/contact");
  await page
    .getByRole("textbox", { name: "Your name" })
    .fill("Theme Test Client");
  await page
    .locator(".graph-background canvas")
    .evaluate((node) => node.setAttribute("data-test-identity", "original"));
  const toggle = page.getByRole("button", { name: "Switch to day mode" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
  await expect(
    page.getByRole("button", { name: "Switch to night mode" }),
  ).toBeFocused();
  await expect(page.getByRole("textbox", { name: "Your name" })).toHaveValue(
    "Theme Test Client",
  );
  await expect(page.locator(".graph-background")).toHaveAttribute(
    "data-theme",
    "day",
  );
  await expect(page.locator(".graph-background canvas")).toHaveAttribute(
    "data-test-identity",
    "original",
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe("day");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Services", exact: true })
    .click();
  await expect(page).toHaveURL("/services");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
  await page.getByRole("button", { name: "Switch to night mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe("night");
  expect(errors).toEqual([]);
});

test("first visit follows the system and blocked storage never breaks switching", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  try {
    await page.goto("/about");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new Error("Storage unavailable");
      };
      Storage.prototype.setItem = () => {
        throw new Error("Storage unavailable");
      };
    });
    await page.reload();
    await page.getByRole("button", { name: "Switch to day mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
  } finally {
    await context.close();
  }
});

test("Day palette covers public pages and admin auth without overflow", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("quietlogic-theme", "day"),
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|did not match|server rendered/i.test(message.text())
    )
      errors.push(message.text());
  });
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of [
      "/",
      "/services",
      "/about",
      "/work",
      "/portfolio",
      "/portfolio/atlas-cloud",
      "/reviews",
      "/contact",
      "/admin/login",
      "/admin/forgot-password",
      "/admin/reset-password",
    ]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
      // Async server sections can temporarily exist inside hidden streaming containers.
      await expect(page.locator("h1:visible")).toHaveCount(1);
      await expect(
        page.getByRole("button", { name: "Switch to night mode" }),
      ).toBeVisible();
      await expect(page.locator("h1:visible")).toHaveCSS(
        "color",
        "rgb(24, 34, 45)",
      );
      if (path === "/" && width === 375) {
        const menu = await page
          .getByRole("button", { name: "Open navigation" })
          .boundingBox();
        const header = await page.locator(".site-header").boundingBox();
        expect(menu!.x + menu!.width).toBeLessThanOrEqual(
          header!.x + header!.width,
        );
        await expect(page.locator(".hero-actions .primary")).toHaveCSS(
          "color",
          "rgb(255, 255, 255)",
        );
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (path === "/contact") {
        await page.locator("footer").scrollIntoViewIfNeeded();
        await expect(page.locator("footer")).toHaveCSS(
          "background-color",
          "rgb(223, 228, 234)",
        );
        await expect(page.locator(".footer-motion")).toHaveCSS(
          "background-color",
          "rgba(0, 0, 0, 0)",
        );
      }
    }
  }
  expect(errors).toEqual([]);
});

test("Day booking uses supported calendar colors and theme changes do not erase an open booking", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("quietlogic-theme", "day"),
  );
  await mockCalendly(page);
  await page.goto("/contact");
  await page
    .getByRole("button", { name: "Book a Meeting", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const frame = dialog.locator("iframe");
  await expect(frame).toHaveAttribute("src", /background_color=e8ecf1/);
  await expect(frame).toHaveAttribute("src", /text_color=18222d/);
  const source = await frame.getAttribute("src");
  await page.evaluate(() => {
    localStorage.setItem("quietlogic-theme", "night");
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "quietlogic-theme",
        newValue: "night",
      }),
    );
  });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
  await expect(frame).toHaveAttribute("src", source!);
  await dialog.getByRole("button", { name: "Close booking" }).click();
});

test("Day admin data rows, inputs and status chips stay readable", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("quietlogic-theme", "day"),
  );
  await page.goto("/admin/login");
  // Isolated native presentation fixture: no authentication bypass or database writes.
  await page.locator(".admin-shell").evaluate((shell) => {
    const fixture = document.createElement("section");
    fixture.className = "admin-panel";
    fixture.id = "theme-admin-fixture";
    fixture.innerHTML =
      '<h2>Review management</h2><table><tbody><tr><td>Pending review</td><td><span class="admin-badge">Pending</span><span class="admin-badge" data-status="approved">Approved</span><span class="admin-badge" data-status="rejected">Rejected</span></td></tr></tbody></table><form class="admin-form"><label>Filter<input value="A client"></label><span class="admin-field-error">Check this field</span></form>';
    shell.appendChild(fixture);
  });
  const panel = page.locator("#theme-admin-fixture");
  await expect(panel).toHaveCSS("background-color", "rgb(229, 233, 238)");
  await expect(panel.locator("td").first()).toHaveCSS(
    "color",
    "rgb(24, 34, 45)",
  );
  await expect(panel.locator("input")).toHaveCSS("color", "rgb(24, 34, 45)");
  await panel.locator("input").focus();
  await expect(panel.locator("input")).toHaveCSS(
    "border-color",
    "rgb(47, 128, 254)",
  );
  await expect(panel.locator("input")).toHaveCSS("box-shadow", /inset/);
  await expect(panel.locator('[data-status="approved"]')).toHaveCSS(
    "color",
    "rgb(47, 125, 90)",
  );
  await expect(panel.locator('[data-status="rejected"]')).toHaveCSS(
    "color",
    "rgb(194, 65, 75)",
  );
  await expect(panel.locator(".admin-field-error")).toHaveCSS(
    "color",
    "rgb(194, 65, 75)",
  );
  await page.getByRole("button", { name: "Switch to night mode" }).click();
  await expect(panel).not.toHaveCSS("background-color", "rgb(229, 233, 238)");
});

test("Day controls distinguish raised, pressed, focused and error states", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("quietlogic-theme", "day"),
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/contact");
  const field = page.getByRole("textbox", { name: "Your name" });
  const input = field.locator("..");
  await field.focus();
  await expect(input).toHaveCSS("box-shadow", /inset.*inset.*0px 0px 0px 3px/);
  await expect(input.locator("fieldset")).toHaveCSS(
    "border-color",
    "rgb(47, 128, 254)",
  );
  await expect(field).toHaveCSS("outline-style", "none");
  await expect(field).toHaveCSS("color", "rgb(24, 34, 45)");
  const submit = page.locator(".contact-form .submit-button");
  await expect(submit).toHaveCSS(
    "color",
    (await submit.isDisabled()) ? "rgb(70, 84, 99)" : "rgb(255, 255, 255)",
  );
  const primary = page.locator(".site-header .nav-project");
  await expect(primary).toHaveCSS("background-color", "rgb(47, 128, 254)");
  await primary.hover();
  await expect(primary).toHaveCSS("background-color", "rgb(31, 111, 229)");
  await expect(primary).toHaveCSS("scale", "1.025");
  await expect(primary.locator(".button-label")).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  await page.goto("/portfolio", { waitUntil: "domcontentloaded" });
  const selected = page.locator(".portfolio-filters button.selected");
  await expect(selected).toHaveCSS("box-shadow", /inset/);
  await expect(selected).toHaveCSS("background-color", "rgb(220, 233, 255)");
  await expect(page.locator(".portfolio-filters button").nth(1)).not.toHaveCSS(
    "box-shadow",
    /10px 0px inset/,
  );
});
