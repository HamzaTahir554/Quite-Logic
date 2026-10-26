import { expect, type Page } from "@playwright/test";
export async function chooseTheme(page: Page, theme: "day" | "night") {
  await page.getByRole("button", { name: /Display settings/ }).click();
  await page
    .getByRole("menuitemradio", {
      name: theme === "day" ? /Day Claymorphism/ : /Night Glassmorphism/,
    })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}
