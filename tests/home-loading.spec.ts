import { test, expect } from "@playwright/test";

test("homepage content streams independently of reviews and finishes loading", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Software",
    { timeout: 5000 },
  );
  await expect(
    page.getByRole("link", { name: /Start a Project/i }).first(),
  ).toBeVisible();
  await page.waitForLoadState("load", { timeout: 15000 });
  await expect(
    page.getByRole("status", { name: "Loading page" }),
  ).not.toBeVisible();
  await expect(page.locator(".reviews-section:visible")).toHaveCount(1);
  await expect(page.locator(".reviews-section:visible")).not.toHaveAttribute(
    "aria-busy",
    "true",
  );
  expect(errors).toEqual([]);
});
