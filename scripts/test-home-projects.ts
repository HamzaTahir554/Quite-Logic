import { expect, devices, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { Project } from "../lib/models";

export async function testHomeProjects(
  page: Page,
  check: (value: unknown, label: string) => void,
) {
  console.log(
    "Testing Admin-controlled Home selections, ordering and live content…",
  );
  const records = await Project.find().sort({ order: 1, _id: 1 }).lean();
  const record = (title: string) =>
    page
      .locator(".admin-project-record")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  const cards = page.locator(".home-projects .project-card");
  const titles = () => cards.locator("h3").allTextContents();
  await mkdir("qa/home-projects", { recursive: true });
  try {
    await page.setViewportSize({ width: 1440, height: 950 });
    for (const project of records) {
      await page.goto("/admin/portfolio");
      await record(project.title)
        .getByRole("button", { name: "Edit", exact: true })
        .click();
      await page
        .getByRole("checkbox", { name: "Show on Home Page", exact: true })
        .uncheck();
      await page
        .getByRole("button", { name: "Save as Draft", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Edit project", exact: true }),
      ).toHaveCount(0);
      await page.goto("/");
      await expect(
        cards.locator("h3").filter({ hasText: project.title }),
      ).toHaveCount(0);
      await page.goto("/admin/portfolio");
      await record(project.title)
        .getByRole("button", { name: "Edit", exact: true })
        .click();
      await page
        .getByRole("checkbox", { name: "Show on Home Page", exact: true })
        .check();
      await page
        .getByRole("button", { name: "Publish Project", exact: true })
        .click();
      await expect(
        record(project.title).getByRole("button", {
          name: `Show ${project.title} on Home Page`,
        }),
      ).toHaveAttribute("aria-pressed", "true");
      await page.goto("/");
      await expect(
        cards.getByRole("heading", { name: project.title, exact: true }),
      ).toHaveCount(1);
      await expect(
        cards
          .getByRole("link", { name: /Explore concept/ })
          .filter({ hasText: "Explore concept" }),
      ).toHaveCount(3);
      await expect(
        cards
          .getByRole("heading", { name: project.title, exact: true })
          .getByRole("link"),
      ).toHaveAttribute("href", `/portfolio/${project.slug}`);
      await page.goto("/admin/portfolio");
      await record(project.title)
        .getByRole("button", { name: `Show ${project.title} on Home Page` })
        .click();
      await expect(record(project.title)).toContainText("Home Page: Hidden");
      await page.goto("/");
      await expect(
        cards.getByRole("heading", { name: project.title, exact: true }),
      ).toHaveCount(0);
      await page.goto("/portfolio");
      await expect(
        page
          .locator(".managed-project-card")
          .getByRole("heading", { name: project.title, exact: true }),
      ).toHaveCount(1);
      await page.goto("/admin/portfolio");
      await record(project.title)
        .getByRole("button", { name: `Show ${project.title} on Home Page` })
        .click();
      await expect(record(project.title)).toContainText("Home Page: Visible");
      check(
        true,
        `${project.title}: Admin edit/publish/selection toggle controls Home independently of Portfolio`,
      );
    }
    const first = records[0];
    await record(first.title)
      .getByRole("button", { name: "Edit", exact: true })
      .click();
    await page.locator("#project-order").fill("100");
    await page
      .getByRole("button", { name: "Publish Project", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Edit project", exact: true }),
    ).toHaveCount(0);
    await page.goto("/");
    expect(await titles()).toEqual([
      records[1].title,
      records[2].title,
      first.title,
    ]);
    check(true, "Home follows the Admin Display order immediately");

    const longTitle =
      "Admin title update with a deliberately long name for responsive layout verification "
        .repeat(2)
        .slice(0, 155);
    const response = await page.request.patch(
      `/api/admin/projects/${first._id}`,
      {
        headers: { Origin: new URL(page.url()).origin },
        data: {
          title: longTitle,
          logo: records[1].logo,
          shortDescription: "Updated Home introduction from MongoDB.",
          category: "Updated category",
        },
      },
    );
    expect(response.status()).toBe(200);
    await page.goto("/");
    const updated = cards.filter({
      has: page.getByRole("heading", { name: longTitle, exact: true }),
    });
    await expect(updated).toContainText(
      "Updated Home introduction from MongoDB.",
    );
    await expect(updated).toContainText("Updated category");
    expect(
      new URL((await updated.locator("img").getAttribute("src"))!, page.url())
        .pathname,
    ).toBe(records[1].logo);
    check(
      true,
      "Home title, logo, category and short description update without redeploy",
    );
    for (const width of [375, 412, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await updated.scrollIntoViewIfNeeded();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }

    // A fourth selection cannot overflow the three-card layout.
    const extra = await Project.create({
      title: "Fourth selected project",
      slug: "fourth-home-selection",
      logo: records[0].logo,
      description:
        "A temporary fourth selected project for Home capacity checks.",
      status: "published",
      showOnHome: true,
      order: 1000,
    });
    try {
      await page.goto("/");
      await expect(cards).toHaveCount(3);
      expect(await titles()).not.toContain(extra.title);
      await page.goto("/admin/portfolio");
      await expect(record(extra.title)).toContainText(
        "Home Page: Hidden · After first three selections",
      );
      await page.goto("/portfolio");
      await expect(
        page.getByRole("heading", { name: extra.title, exact: true }),
      ).toHaveCount(1);
      check(
        true,
        "Only first three selected projects appear; Admin identifies overflow and Portfolio includes all four",
      );
      expect(
        (
          await page.request.patch(`/api/admin/projects/${extra._id}`, {
            headers: { Origin: new URL(page.url()).origin },
            data: { order: 0 },
          })
        ).status(),
      ).toBe(200);
      await page.goto("/");
      await expect(cards).toHaveCount(3);
      await expect(
        cards
          .getByRole("heading", { name: extra.title, exact: true })
          .getByRole("link"),
      ).toHaveAttribute("href", `/portfolio/${extra.slug}`);
      check(
        true,
        "A newly created selection enters Home through Admin ordering with its own dynamic slug",
      );
      expect(
        (
          await page.request.patch(`/api/admin/projects/${extra._id}`, {
            headers: { Origin: new URL(page.url()).origin },
            data: { status: "draft" },
          })
        ).status(),
      ).toBe(200);
      await page.goto("/");
      await expect(
        cards.getByRole("heading", { name: extra.title, exact: true }),
      ).toHaveCount(0);
      check(
        true,
        "Unpublishing a selected project immediately removes it from Home",
      );
    } finally {
      await Project.deleteOne({ _id: extra._id });
    }

    await Project.updateMany({}, { $set: { showOnHome: false } });
    await page.goto("/");
    await expect(page.locator(".home-projects")).toHaveCount(0);
    check(
      true,
      "Home hides its entire projects section when no projects are selected",
    );
  } finally {
    for (const project of records)
      await Project.updateOne(
        { _id: project._id },
        {
          $set: {
            title: project.title,
            logo: project.logo,
            category: project.category,
            shortDescription: project.shortDescription,
            order: project.order,
            status: project.status,
            showOnHome: project.showOnHome,
          },
        },
      );
  }
  await page.goto("/admin/portfolio");
  await expect(page.locator(".admin-project-record")).toHaveCount(3);
  await expect(page.locator(".admin-list")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.screenshot({
    path: "qa/home-projects/admin-controls.png",
    fullPage: true,
  });
  const context = await page
    .context()
    .browser()!
    .newContext({
      ...devices["Pixel 7"],
      baseURL: new URL(page.url()).origin,
      reducedMotion: "no-preference",
      colorScheme: "dark",
    });
  try {
    await context.addInitScript(() =>
      localStorage.setItem("quietlogic-theme", "day"),
    );
    const mobile = await context.newPage();
    await mobile.goto("/");
    await mobile.locator(".home-projects .section-heading").evaluate((node) =>
      window.scrollTo({
        top: node.getBoundingClientRect().top + scrollY - 140,
        behavior: "instant",
      }),
    );
    await mobile.evaluate(() => document.fonts.ready);
    // Let the actual reveal finish; do not freeze or hide it for QA captures.
    await mobile.locator(".home-projects").evaluate(async (section) => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      await Promise.all(
        section
          .getAnimations({ subtree: true })
          .filter(
            (animation) =>
              animation.playState === "running" &&
              animation.effect?.getTiming().iterations !== Infinity,
          )
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    await mobile.screenshot({ path: "qa/home-projects/pixel-day.png" });
    expect(
      await mobile
        .locator("body")
        .evaluate((node) => getComputedStyle(node).backgroundImage),
    ).toBe("none");
    const pixel = await mobile
      .locator(".graph-background canvas")
      .evaluate((canvas: HTMLCanvasElement) => [
        ...canvas.getContext("2d")!.getImageData(1, 1, 1, 1).data,
      ]);
    expect(pixel).toEqual([232, 236, 241, 255]);
    check(
      true,
      "Pixel touch profile: opaque light canvas and clay cards over flat Day background",
    );
  } finally {
    await context.close();
  }
  await page.goto("/admin");
}
