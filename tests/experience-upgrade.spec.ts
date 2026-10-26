import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { chooseTheme } from "./fixtures/theme";
test("one compact theme popover works with keyboard, dismissal and persistent preference at desktop and phone sizes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/contact");
    const trigger = page.getByRole("button", { name: /Display settings/ });
    await expect(trigger).toHaveCount(1);
    const box = (await trigger.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(48);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await trigger.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu", { name: "Display mode" });
    await expect(menu).toBeVisible();
    const bounds = (await menu.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(menu).toBeVisible();
    await page.mouse.click(2, 2);
    await expect(menu).toHaveCount(0);
    await chooseTheme(page, "day");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
    await chooseTheme(page, "night");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
  }
  expect(errors).toEqual([]);
});
test("cube controls remain within their wrapper with tap targets and no hint overlap at every requested mobile width", async ({
  page,
}) => {
  await page.goto("/");
  for (const width of [320, 360, 375, 390, 412, 425]) {
    await page.setViewportSize({ width, height: 900 });
    const visual = page.locator(".signature-explorer .explorer-visual");
    await visual.scrollIntoViewIfNeeded();
    const parent = (await visual.boundingBox())!,
      prev = (await visual
        .getByRole("button", { name: "Previous service" })
        .boundingBox())!,
      next = (await visual
        .getByRole("button", { name: "Next service" })
        .boundingBox())!,
      hint = (await visual.locator(".explorer-hint").boundingBox())!;
    for (const bounds of [prev, next]) {
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.x).toBeGreaterThanOrEqual(parent.x);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(
        parent.x + parent.width,
      );
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(
        parent.y + parent.height,
      );
    }
    expect(prev.x + prev.width).toBeLessThanOrEqual(hint.x);
    expect(hint.x + hint.width).toBeLessThanOrEqual(next.x);
    expect(
      Math.abs(
        (prev.x + prev.width / 2 + next.x + next.width / 2) / 2 -
          parent.x -
          parent.width / 2,
      ),
    ).toBeLessThan(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test("review DP preview can be changed and removed without persisting until submission", async ({
  page,
}) => {
  await page.goto("/reviews");
  const form = page.locator(".review-form");
  const png = await sharp({
    create: { width: 24, height: 24, channels: 3, background: "#2f80fe" },
  })
    .png()
    .toBuffer();
  await form
    .locator("input[type=file]")
    .setInputFiles({ name: "profile.png", mimeType: "image/png", buffer: png });
  await expect(form.locator(".ql-avatar img")).toHaveAttribute("src", /^blob:/);
  await form.getByRole("button", { name: "Remove Image" }).click();
  await expect(form.locator(".ql-avatar img")).toHaveCount(0);
  await expect(form.locator(".ql-avatar")).toContainText("YP");
  await form.locator("input[type=file]").setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(form.getByRole("alert")).toContainText("JPEG");
});
