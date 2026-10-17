import { test, expect } from "@playwright/test";

test("public routes preserve responsive layouts, images and the subtle admin footer link", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/portfolio", "/reviews", "/contact"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(
        page.locator("footer").getByRole("link", { name: "Admin Login" }),
      ).toHaveAttribute("href", "/admin/login");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        await page
          .locator("img")
          .evaluateAll((images) =>
            images
              .filter(
                (image) =>
                  image instanceof HTMLImageElement &&
                  image.complete &&
                  image.naturalWidth === 0,
              )
              .map((image) => image.getAttribute("src")),
          ),
      ).toEqual([]);
      if (route === "/reviews")
        await expect(
          page.getByRole("button", { name: "Submit for approval" }),
        ).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
});
