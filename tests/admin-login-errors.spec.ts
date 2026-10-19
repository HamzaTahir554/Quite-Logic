import { test, expect } from "@playwright/test";

for (const scenario of [
  { status: 401, message: "Invalid email or password." },
  {
    status: 503,
    message: "Service temporarily unavailable. Please try again.",
  },
]) {
  test(`login distinguishes HTTP ${scenario.status} from a connection failure`, async ({
    page,
  }) => {
    await page.route("**/api/admin/login", (route) =>
      route.fulfill({
        status: scenario.status,
        contentType: "application/json",
        body: JSON.stringify({ error: scenario.message }),
      }),
    );
    await page.goto("/admin/login");
    await page.getByLabel("Email address").fill("admin@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Example password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(".admin-form").getByRole("alert")).toHaveText(
      scenario.message,
    );
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeEnabled();
  });
}

test("login distinguishes a server timeout from an offline browser", async ({
  page,
}) => {
  await page.goto("/admin/login");
  await page.evaluate(() => {
    const original = window.fetch;
    window.fetch = async (...args) => {
      if (args[0] === "/api/admin/login")
        throw new DOMException("Timed out", "TimeoutError");
      return original(...args);
    };
  });
  await page.getByLabel("Email address").fill("admin@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Example password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".admin-form").getByRole("alert")).toHaveText(
    "The server took too long to respond. Please try again.",
  );
});
