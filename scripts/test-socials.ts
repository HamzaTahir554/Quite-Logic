import { expect, type Page } from "@playwright/test";
type Call = (
  path: string,
  method?: string,
  data?: unknown,
  authenticated?: boolean,
  origin?: string,
) => Promise<Response>;
type Check = (condition: unknown, message: string) => void;

export async function testSocialApi(call: Call, check: Check) {
  const endpoint = "/api/admin/socials";
  const input = {
    platform: "LinkedIn",
    url: "https://example.test/company",
    enabled: false,
    order: 0,
  };
  check(
    (await call(endpoint, "POST", input, true, "https://evil.example"))
      .status === 403,
    "Social changes reject cross-origin requests",
  );
  for (const invalid of [
    { url: "javascript:alert(1)" },
    { url: "data:text/html,test" },
    { url: "https://user:password@example.test" },
    { url: "/local" },
    { url: "invalid" },
    { platform: "Unsupported" },
    { order: -1 },
    { order: 0.5 },
    { enabled: "true" },
    { unexpected: true },
  ])
    check(
      (await call(endpoint, "POST", { ...input, ...invalid })).status === 400,
      "Invalid social fields and unsafe URLs rejected",
    );
  const created = await call(endpoint, "POST", input);
  check(created.status === 201, "Social link persisted in MongoDB");
  const { id } = await created.json();
  check(
    (await call(endpoint, "POST", input)).status === 409,
    "Duplicate platforms rejected",
  );
  check(
    (await (await call("/api/socials", "GET", undefined, false)).json()).links
      .length === 0,
    "Disabled social link stays private",
  );
  check(
    (await call(`${endpoint}/${id}`, "PATCH", { enabled: true })).status ===
      200,
    "Social enabled with partial update",
  );
  const updated = (await (await call(endpoint)).json()).items[0];
  check(
    updated.platform === input.platform &&
      updated.url === input.url &&
      updated.order === 0 &&
      updated.enabled,
    "Partial social updates preserve omitted values",
  );
  const publicLinks = await (
    await call("/api/socials", "GET", undefined, false)
  ).json();
  check(
    publicLinks.links[0]?.url === input.url &&
      Object.keys(publicLinks.links[0]).sort().join() ===
        "id,order,platform,url",
    "Public social API returns enabled links with restricted fields",
  );
  check(
    (await call(`${endpoint}/${id}`, "PATCH", {})).status === 400,
    "Empty social changes rejected",
  );
  check(
    (await call(`${endpoint}/${id}`, "PATCH", { url: "javascript:alert(1)" }))
      .status === 400,
    "Unsafe URL rejected on social edit",
  );
  check(
    (await call(`${endpoint}/invalid`, "DELETE")).status === 400,
    "Invalid social ID rejected",
  );
  check(
    (
      await call(`${endpoint}/000000000000000000000000`, "PATCH", {
        enabled: true,
      })
    ).status === 404,
    "Missing social link handled",
  );
  const second = await (
    await call(endpoint, "POST", {
      ...input,
      platform: "GitHub",
      url: "https://example.test/code",
      enabled: true,
    })
  ).json();
  const initial = (await (await call("/api/socials")).json()).links;
  const last = initial.at(-1);
  check(
    (
      await call(`${endpoint}/reorder`, "POST", {
        id: last.id,
        direction: "earlier",
      })
    ).status === 200,
    "Social reorder handles tied order values",
  );
  check(
    (await (await call("/api/socials")).json()).links[0].id === last.id,
    "Public social order matches admin order",
  );
  check(
    (await call(`${endpoint}/reorder`, "POST", { id, direction: "invalid" }))
      .status === 400,
    "Invalid social reorder rejected",
  );
  check(
    (await call(`${endpoint}/${id}`, "PATCH", { enabled: false })).status ===
      200,
    "Social link disabled",
  );
  check(
    (await (await call("/api/socials")).json()).links.length === 1,
    "Disabled social disappears immediately from public API",
  );
  check(
    (await call(`${endpoint}/${id}`, "DELETE")).status === 200 &&
      (await call(`${endpoint}/${second.id}`, "DELETE")).status === 200,
    "Social links deleted and fixtures cleaned",
  );
}

export async function testSocialBrowser(page: Page, check: Check) {
  await page.goto("/admin/settings");
  await expect(page.getByText("No social links yet")).toBeVisible();
  await page
    .getByRole("button", { name: "Add social link", exact: true })
    .click();
  const editor = page.locator(".admin-social-editor");
  await editor.getByRole("button", { name: "Save link", exact: true }).click();
  await expect(page.locator("#social-url")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByLabel("Profile URL").fill("https://example.test/company");
  await page.getByLabel("Enabled on the website").check();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Social editor is responsive",
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `qa/socials-portfolio/settings-editor-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("link", { name: "Account", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Leave without saving?" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  let saves = 0;
  await page.route("**/api/admin/socials", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    saves++;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Please try again." }),
    });
  });
  await editor.locator("form").evaluate((form) => {
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  await expect(editor.getByRole("alert")).toContainText("Please try again");
  await expect(page.getByLabel("Profile URL")).toHaveValue(
    "https://example.test/company",
  );
  check(
    saves === 1,
    "Social save prevents duplicate requests and retains data after failure",
  );
  await page.unroute("**/api/admin/socials");
  await editor.getByRole("button", { name: "Save link", exact: true }).click();
  const linkedin = page.getByRole("article", {
    name: "LinkedIn social link",
    exact: true,
  });
  await expect(linkedin).toBeVisible();
  await expect(linkedin.getByRole("switch")).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.goto("/portfolio");
  await expect(
    page
      .getByRole("navigation", { name: "Social media" })
      .getByRole("link", { name: /LinkedIn/ }),
  ).toHaveAttribute("href", "https://example.test/company");
  await page.goto("/admin/settings");
  await linkedin.getByRole("switch").click();
  await expect(linkedin.getByRole("switch")).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await page.goto("/portfolio");
  await expect(page.locator(".footer-socials")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.locator(".footer-socials a")).toHaveCount(0);
  await page.goto("/admin/settings");
  await linkedin.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Profile URL")
    .fill("https://example.test/updated-company");
  await editor.getByRole("button", { name: "Save link", exact: true }).click();
  await expect(linkedin.locator("a")).toHaveAttribute(
    "href",
    "https://example.test/updated-company",
  );
  await page
    .getByRole("button", { name: "Add social link", exact: true })
    .click();
  await page.getByLabel("Platform", { exact: false }).selectOption("Instagram");
  await page.getByLabel("Profile URL").fill("https://example.test/photos");
  await editor.getByRole("button", { name: "Save link", exact: true }).click();
  const instagram = page.getByRole("article", {
    name: "Instagram social link",
    exact: true,
  });
  await expect(instagram).toBeVisible();
  await instagram
    .getByRole("button", { name: "Move Instagram earlier" })
    .click();
  await expect(page.locator(".admin-social-row").first()).toContainText(
    "Instagram",
  );
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Social list has no horizontal overflow",
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `qa/socials-portfolio/settings-list-${width}.png`,
      fullPage: true,
    });
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".admin-page-transition")).toHaveCSS(
    "animation-duration",
    "0.3s",
  );
  await linkedin.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Delete this social link?" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(linkedin).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".admin-page-transition")).toHaveCSS(
    "animation-name",
    "none",
  );
  for (const row of [linkedin, instagram]) {
    await row.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete link", exact: true })
      .click();
    await expect(row).toHaveCount(0);
  }
  check(
    true,
    "Social browser create, edit, visibility, reorder and confirmed delete workflows pass",
  );
}

export async function testPortfolioLayout(page: Page, check: Check) {
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/portfolio");
    await expect(
      page.getByRole("heading", { name: "New projects are coming soon." }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const layout = await page.evaluate(() => {
      const [hero, filters, count, empty, title, header, button] = [
        ".portfolio-page .page-hero",
        ".portfolio-filters",
        ".portfolio-count",
        ".portfolio-empty",
        ".portfolio-empty h2",
        ".site-header",
        ".site-header .nav-project",
      ].map((selector) =>
        document.querySelector(selector)!.getBoundingClientRect(),
      );
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        heroX: hero.x,
        heroWidth: hero.width,
        filtersX: filters.x,
        filtersWidth: filters.width,
        emptyX: empty.x,
        emptyWidth: empty.width,
        centered:
          Math.abs(title.x + title.width / 2 - empty.x - empty.width / 2) < 1,
        gap: count.top - filters.bottom,
        buttonHeight: button.height,
        buttonWidth: button.width,
        buttonCentered:
          Math.abs(
            button.y + button.height / 2 - header.y - header.height / 2,
          ) < 2,
      };
    });
    check(
      !layout.overflow &&
        Math.abs(layout.heroX - layout.filtersX) < 1 &&
        Math.abs(layout.emptyX - layout.filtersX) < 1 &&
        Math.abs(layout.heroWidth - layout.emptyWidth) < 1 &&
        Math.abs(layout.filtersWidth - layout.emptyWidth) < 1 &&
        layout.centered &&
        layout.gap >= 16,
      "Portfolio hero, filters and empty state align at responsive widths",
    );
    if (width <= 600) {
      check(
        layout.buttonHeight === 0,
        "Compact mobile header keeps booking in the navigation drawer",
      );
      await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(page.locator(".drawer-booking")).toBeVisible();
      await page.getByRole("button", { name: "Close navigation" }).click();
    } else {
      check(
        layout.buttonHeight <= 40 &&
          layout.buttonWidth <= 160 &&
          layout.buttonCentered,
        `Meeting CTA stays compact and aligned at ${width}px: ${JSON.stringify(layout)}`,
      );
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `qa/socials-portfolio/portfolio-empty-${width}.png`,
      fullPage: true,
    });
  }
}
