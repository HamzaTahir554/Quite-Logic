import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("contact preserves details after network and rate-limit failures and allows retry on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  let attempt = 0;
  await page.route("**/api/contact", async (route) => {
    attempt++;
    if (attempt === 1) return route.abort("failed");
    await route.fulfill({
      status: attempt === 2 ? 429 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        attempt === 2
          ? { error: "Too many attempts. Please try again later." }
          : { message: "Your message has been submitted." },
      ),
    });
  });
  await page.goto("/contact");
  await expect(page.locator("html")).toHaveAttribute(
    "data-studio-ready",
    "true",
  );
  const name = page.getByRole("textbox", { name: "Your name" });
  const email = page.getByRole("textbox", { name: "Email address" });
  const description = page.getByRole("textbox", {
    name: "Tell us about your project",
  });
  await name.fill("Mobile Visitor");
  await email.fill("mobile@example.test");
  await description.fill(
    "A mobile inquiry with enough detail to discuss the project.",
  );
  const form = page.getByRole("form", { name: "Project inquiry" });
  const submit = page.getByRole("button", {
    name: "Send Message",
    exact: true,
  });
  await submit.click();
  await expect(form.getByRole("alert")).toContainText(
    "We couldn’t confirm your submission",
  );
  await expect(name).toHaveValue("Mobile Visitor");
  await expect(email).toHaveValue("mobile@example.test");
  await expect(description).toHaveValue(
    "A mobile inquiry with enough detail to discuss the project.",
  );
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(form.getByRole("alert")).toContainText("Too many attempts");
  await expect(form).toHaveAttribute("data-status", "error");
  await expect(description).toHaveValue(
    "A mobile inquiry with enough detail to discuss the project.",
  );
  await mkdir("qa/contact-email", { recursive: true });
  await form.screenshot({ path: "qa/contact-email/mobile-error.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await submit.click();
  await expect(form.getByRole("alert")).toContainText(
    "Your message has been submitted",
  );
  await form.screenshot({ path: "qa/contact-email/mobile-submitted.png" });
  expect(attempt).toBe(3);
});

test("contact displays server field errors without losing the inquiry", async ({
  page,
}) => {
  await page.route("**/api/contact", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Please check your email address.",
        fields: { email: "Please check your email address." },
      }),
    }),
  );
  await page.goto("/contact");
  await expect(page.locator("html")).toHaveAttribute(
    "data-studio-ready",
    "true",
  );
  await page
    .getByRole("textbox", { name: "Your name" })
    .fill("Contact Visitor");
  const email = page.getByRole("textbox", { name: "Email address" });
  await email.fill("visitor@example.test");
  await page
    .getByRole("textbox", { name: "Tell us about your project" })
    .fill("A detailed inquiry kept after a server validation failure.");
  await page.getByRole("button", { name: "Send Message", exact: true }).click();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveValue("visitor@example.test");
  await expect(
    page.getByRole("form", { name: "Project inquiry" }),
  ).toHaveAttribute("data-status", "error");
  await email.fill("corrected@example.test");
  await expect(email).toHaveAttribute("aria-invalid", "false");
  await expect(
    page.getByRole("form", { name: "Project inquiry" }).getByRole("alert"),
  ).toHaveCount(0);
});
