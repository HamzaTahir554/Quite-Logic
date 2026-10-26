import { expect, type Page } from "@playwright/test";
export async function chooseTheme(page: Page, theme: "day" | "night") {
  if ((await page.locator("html").getAttribute("data-theme")) !== theme)
    await page
      .getByRole("button", { name: /Switch to (Day|Night) mode/ })
      .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}
