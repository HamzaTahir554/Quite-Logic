import { test, expect } from "@playwright/test";
import sharp from "sharp";
test.describe("Persistent review and admin workflows", () => {
  test.skip(
    process.env.E2E_DATABASE_TESTS !== "1",
    "Run against npm run test:server (isolated local PostgreSQL fixture).",
  );
  const origin = "http://localhost:3100";
  const review = {
    name: "Review Test Client",
    email: "review-client@example.test",
    company: "Test Company",
    role: "Founder",
    service: "Web Development",
    rating: 5,
    body: "The project was delivered with clear communication and thoughtful attention to detail.",
    website: "",
    consent: true,
  };
  test("server enforces moderation, authentication, private data and session revocation", async ({
    page,
    request,
  }) => {
    const headers = { Origin: origin };
    expect((await request.get("/api/admin/reviews")).status()).toBe(401);
    expect(
      (
        await request.post("/api/admin/reviews", {
          headers,
          data: {
            action: "Approve",
            id: "00000000-0000-4000-8000-000000000000",
          },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await request.post("/api/reviews", {
          headers: { Origin: "https://attacker.example" },
          data: review,
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.post("/api/reviews", {
          headers,
          data: { ...review, website: "spam" },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await request.post("/api/reviews", {
          headers,
          data: { ...review, rating: 6 },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await request.post("/api/reviews", {
          headers,
          data: { ...review, image: "data:image/svg+xml;base64,PHN2Zz4=" },
        })
      ).status(),
    ).toBe(400);
    const image =
      "data:image/png;base64," +
      (
        await sharp({
          create: { width: 8, height: 8, channels: 3, background: "#2F80FE" },
        })
          .png()
          .toBuffer()
      ).toString("base64");
    const submitted = await request.post("/api/reviews", {
      headers,
      data: { ...review, status: "Approved", image },
    });
    expect(submitted.status(), await submitted.text()).toBe(201);
    expect(
      JSON.stringify(await (await request.get("/api/reviews")).json()),
    ).not.toContain(review.name);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.getByLabel("Admin email").fill("admin@example.test");
    await page.getByLabel("Password").fill("Local-Test-Only-123456!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Dashboard", exact: true }),
    ).toBeVisible();
    const cookie = (await page.context().cookies()).find(
      (cookie) => cookie.name === "quite_admin",
    )!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.secure).toBe(true);
    expect(cookie.sameSite).toBe("Strict");
    await page.getByRole("link", { name: "Reviews", exact: true }).click();
    await expect(page.getByText(review.name, { exact: true })).toBeVisible();
    await expect(page.locator(".status-chip").first()).toHaveText("Pending");
    const adminReviews = await (
      await page.request.get("/api/admin/reviews?q=review-client")
    ).json();
    const id = adminReviews.items[0].id;
    expect((await request.get(`/api/review-images/${id}`)).status()).toBe(404);
    expect((await page.request.get(`/api/review-images/${id}`)).status()).toBe(
      200,
    );
    expect(
      (
        await page.request.post("/api/admin/reviews", {
          headers: { Origin: "https://attacker.example" },
          data: { id, action: "Approve" },
        })
      ).status(),
    ).toBe(403);
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(page.locator(".status-chip").first()).toHaveText("Approved");
    const approved = await (await request.get("/api/reviews")).json();
    expect(
      approved.reviews.find((item: { id: string }) => item.id === id)?.name,
    ).toBe(review.name);
    expect(JSON.stringify(approved)).not.toContain(review.email);
    expect(
      (await request.get(`/api/review-images/${id}`)).headers()["content-type"],
    ).toBe("image/webp");
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page
      .getByRole("region", { name: "Edit review" })
      .getByRole("textbox", { name: "Review", exact: true })
      .fill(
        "Updated review content with plenty of detail for a useful client perspective.",
      );
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByText("Updated review content", { exact: false }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Reject", exact: true }).click();
    await expect(page.locator(".status-chip").first()).toHaveText("Rejected");
    expect(
      JSON.stringify(await (await request.get("/api/reviews")).json()),
    ).not.toContain(id);
    expect((await request.get(`/api/review-images/${id}`)).status()).toBe(404);
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Confirm delete" }).click();
    await expect(page.getByText("No matching reviews yet.")).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    expect(
      (
        await request.get("/api/admin/clients", {
          headers: { Cookie: `quite_admin=${cookie.value}` },
        })
      ).status(),
    ).toBe(401);
  });
  test("contact is retained, clients are searchable, email errors are honest, mobile UI is usable", async ({
    page,
    request,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await request.post("/api/contact", {
      headers: { Origin: origin },
      data: {
        name: "Contact Test Client",
        email: "contact-client@example.test",
        company: "Contact Company",
        phone: "",
        projectType: "Website",
        budget: "Let’s discuss",
        description:
          "A clear project inquiry to verify that messages remain stored when email is not configured.",
        website: "",
      },
    });
    expect(response.status(), await response.text()).toBe(200);
    const login = await page.request.post("/api/admin/login", {
      headers: { Origin: origin },
      data: {
        email: "admin@example.test",
        password: "Local-Test-Only-123456!",
      },
    });
    expect(login.status()).toBe(200);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/clients");
    await expect(
      page.getByText("Contact Test Client", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Search", { exact: true }).fill("contact-client");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(
      page.getByText("Contact Test Client", { exact: true }),
    ).toBeVisible();
    await page.getByText("0 recent reviews · 1 recent messages").click();
    await expect(
      page.getByText("A clear project inquiry", { exact: false }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Write email" }).click();
    await expect(
      page.getByRole("heading", { name: "Write an email" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send email", exact: true }),
    ).toBeDisabled();
    const clients = await (
      await page.request.get("/api/admin/clients?q=contact-client")
    ).json();
    expect(
      (
        await page.request.post("/api/admin/email", {
          headers: { Origin: origin },
          data: {
            clientId: clients.items[0].id,
            subject: "Test",
            body: "Message",
          },
        })
      ).status(),
    ).toBe(503);
    expect(
      (
        await page.request.post("/api/admin/email", {
          headers: { Origin: origin },
          data: {
            clientId: clients.items[0].id,
            subject: "Bad\r\nBcc: x@example.test",
            body: "Message",
          },
        })
      ).status(),
    ).toBe(400);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".studio-cursor")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
  test("public form submits for approval, hides private data and respects touch/reduced motion", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/reviews");
    await page
      .getByLabel("Your name", { exact: true })
      .fill("Form Test Client");
    await page.getByLabel("Email (private)").fill("form-client@example.test");
    await page.getByLabel("Company", { exact: true }).fill("Form Company");
    await page.getByLabel("Role / title").fill("Director");
    await page
      .getByLabel("Service", { exact: true })
      .selectOption("AI Automation");
    await page.getByLabel("Your review", { exact: true }).fill(review.body);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Submit for approval" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "pending approval" }),
    ).toBeVisible();
    await expect(
      page.locator(".review-card").filter({ hasText: "Form Test Client" }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".studio-cursor")).toHaveCount(0);
  });
  test("login throttles repeated invalid credentials", async ({ request }) => {
    for (let attempt = 0; attempt < 8; attempt++)
      expect(
        (
          await request.post("/api/admin/login", {
            headers: { Origin: origin },
            data: { email: "unknown@example.test", password: "bad-password" },
          })
        ).status(),
      ).toBe(401);
    expect(
      (
        await request.post("/api/admin/login", {
          headers: { Origin: origin },
          data: { email: "unknown@example.test", password: "bad-password" },
        })
      ).status(),
    ).toBe(429);
  });
});

test("cursor dot tracks immediately at edges and stops for reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/services");
  await expect(page.locator("html")).toHaveAttribute(
    "data-studio-ready",
    "true",
  );
  for (const [x, y] of [
    [2, 500],
    [1438, 500],
    [720, 950],
    [8, 20],
  ]) {
    await page.mouse.move(x, y);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const point = await page.locator(".studio-cursor").evaluate((node) => {
      const matrix = new DOMMatrix(getComputedStyle(node).transform);
      return { x: matrix.m41, y: matrix.m42 };
    });
    expect(Math.abs(point.x - x)).toBeLessThan(1);
    expect(Math.abs(point.y - y)).toBeLessThan(1);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".studio-cursor")).toHaveCount(0);
});
