import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { randomBytes, randomUUID, scryptSync, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { isAllowedOrigin } from "../lib/request-origin";
const origin = "http://localhost:3100";
const headers = { Origin: origin };
const password = "Local-Test-Only-123456!";
const nextPassword = "Changed-Private-Password-56789!";
const fixture = () =>
  new Pool({
    connectionString: "postgresql://postgres:postgres@127.0.0.1:5434/postgres",
    max: 1,
  });
async function seed(email: string) {
  const db = fixture();
  const salt = randomBytes(16).toString("hex");
  try {
    const id = randomUUID();
    await db.query(
      "INSERT INTO admins(id,email,password_hash) VALUES($1,$2,$3)",
      [id, email, `${salt}:${scryptSync(password, salt, 64).toString("hex")}`],
    );
    return id;
  } finally {
    await db.end();
  }
}
async function mails() {
  try {
    return (await readFile("qa/.test-mailbox.jsonl", "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}
test("origin rules allow local aliases and explicit deployments without trusting forwarded hosts", () => {
  expect(
    isAllowedOrigin(
      new Request("http://localhost:3000/api/contact", {
        headers: { Origin: "http://127.0.0.1:3000" },
      }),
      {},
    ),
  ).toBe(true);
  expect(
    isAllowedOrigin(
      new Request("http://localhost:3000/api/contact", {
        headers: { Origin: "http://localhost:9999" },
      }),
      {},
    ),
  ).toBe(false);
  expect(
    isAllowedOrigin(
      new Request("http://internal:3000/api/contact", {
        headers: { Origin: "https://quite.example" },
      }),
      { NEXT_PUBLIC_SITE_URL: "https://quite.example/" },
    ),
  ).toBe(true);
  expect(
    isAllowedOrigin(
      new Request("http://internal:3000/api/contact", {
        headers: {
          Origin: "https://evil.example",
          "x-forwarded-host": "evil.example",
        },
      }),
      {},
    ),
  ).toBe(false);
  expect(
    isAllowedOrigin(
      new Request("https://quite.example/api/contact", {
        headers: { Origin: "https://quite.example.evil.test" },
      }),
      {},
    ),
  ).toBe(false);
});
test.describe("Account, managed portfolio and contact", () => {
  test.skip(
    process.env.E2E_MAIL_CAPTURE !== "1",
    "Requires the isolated test server with E2E_MAIL_CAPTURE=1.",
  );
  test("forgot/reset is private, delivered, expiring and single-use; change password revokes sessions", async ({
    page,
    request,
  }) => {
    const email = "recovery@example.test";
    const id = await seed(email);
    const known = await request.post("/api/admin/forgot-password", {
      headers,
      data: { email },
    });
    const unknown = await request.post("/api/admin/forgot-password", {
      headers,
      data: { email: "no-account@example.test" },
    });
    expect(await known.json()).toEqual(await unknown.json());
    expect(known.status()).toBe(200);
    await expect
      .poll(
        async () => (await mails()).filter((mail) => mail.to === email).length,
      )
      .toBe(1);
    const mail = (await mails()).find((mail) => mail.to === email);
    expect(mail.from.address).toBe("company.quitelogic@gmail.com");
    const link = new URL(mail.text.match(/http[^\s]+/)[0]);
    expect(link.pathname).toBe("/admin/reset-password");
    expect(link.search).toBe("");
    const token = new URLSearchParams(link.hash.slice(1)).get("token")!;
    const db = fixture();
    try {
      const result = await db.query(
        "SELECT token_hash FROM password_resets WHERE admin_id=$1",
        [id],
      );
      expect(result.rows[0].token_hash).toBe(
        createHash("sha256").update(token).digest("hex"),
      );
    } finally {
      await db.end();
    }
    await page.request.post("/api/admin/login", {
      headers,
      data: { email, password },
    });
    const oldCookie = (await page.context().cookies()).find(
      (cookie) => cookie.name === "quite_admin",
    )!.value;
    await page.goto(`/admin/reset-password${link.hash}`);
    await expect(page).toHaveURL(/\/admin\/reset-password$/);
    await page.getByLabel("New password", { exact: true }).fill(nextPassword);
    await page
      .getByLabel("Confirm new password", { exact: true })
      .fill(nextPassword);
    await page
      .getByRole("button", { name: "Reset password", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("has been reset");
    expect(
      (
        await request.post("/api/admin/reset-password", {
          headers,
          data: {
            token,
            password: nextPassword,
            confirmPassword: nextPassword,
          },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await request.get("/api/admin/dashboard", {
          headers: { Cookie: `quite_admin=${oldCookie}` },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await request.post("/api/admin/login", {
          headers,
          data: { email, password },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await page.request.post("/api/admin/login", {
          headers,
          data: { email, password: nextPassword },
        })
      ).status(),
    ).toBe(200);
    await page.goto("/admin/change-password");
    await expect(
      page.getByRole("heading", { name: "Change Password", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Current password").fill("incorrect");
    await page.getByLabel("New password", { exact: true }).fill(password);
    await page.getByLabel("Confirm new password").fill(password);
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "incorrect" }),
    ).toBeVisible();
    await page.getByLabel("Current password").fill(nextPassword);
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Password changed" }),
    ).toBeVisible();
    expect((await page.request.get("/api/admin/dashboard")).status()).toBe(401);
    const expired = randomBytes(32).toString("hex");
    const sql = fixture();
    try {
      await sql.query(
        "INSERT INTO password_resets(token_hash,admin_id,expires_at) VALUES($1,$2,now()-interval '1 minute')",
        [createHash("sha256").update(expired).digest("hex"), id],
      );
    } finally {
      await sql.end();
    }
    expect(
      (
        await request.post("/api/admin/reset-password", {
          headers,
          data: {
            token: expired,
            password: nextPassword,
            confirmPassword: nextPassword,
          },
        })
      ).status(),
    ).toBe(400);
  });
  test("portfolio CRUD, upload validation, publishing, ordering, keyboard and touch", async ({
    page,
    request,
    browser,
  }) => {
    const email = "portfolio-admin@example.test";
    await seed(email);
    await page.request.post("/api/admin/login", {
      headers,
      data: { email, password },
    });
    expect((await request.get("/api/admin/portfolio")).status()).toBe(401);
    await page.goto("/admin/portfolio");
    await page
      .getByRole("button", { name: "Add project", exact: true })
      .click();
    await page
      .getByLabel("Project Title", { exact: true })
      .fill("Managed test project");
    await page
      .getByLabel("Short Description", { exact: true })
      .fill(
        "A carefully built project with a clear description and useful features.",
      );
    await page.getByLabel("Category (optional)").fill("Web");
    await page.getByLabel("Project URL (optional)").fill("/portfolio/nexa-ops");
    const logo = await sharp({
      create: { width: 100, height: 60, channels: 4, background: "#2F80FE" },
    })
      .png()
      .toBuffer();
    await page
      .locator('input[name="image"]')
      .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: logo });
    await page
      .getByRole("button", { name: "Save project", exact: true })
      .click();
    await expect(
      page.getByRole("cell").filter({ hasText: "Managed test project" }),
    ).toBeVisible();
    const items = (
      await (await page.request.get("/api/admin/portfolio")).json()
    ).items;
    const item = items.find(
      (value: { title: string }) => value.title === "Managed test project",
    );
    expect(
      (await request.get(`/api/portfolio-images/${item.id}`)).status(),
    ).toBe(404);
    expect(
      (await page.request.get(`/api/portfolio-images/${item.id}`)).headers()[
        "content-type"
      ],
    ).toBe("image/webp");
    expect(
      (
        await page.request.post("/api/admin/portfolio", {
          headers,
          data: {
            action: "Save",
            project: {
              title: "Bad upload",
              description: "A useful description of this project",
              category: "",
              project_url: "javascript:alert(1)",
              published: true,
            },
            image: "data:image/svg+xml;base64,PHN2Zz4=",
          },
        })
      ).status(),
    ).toBe(400);
    const row = page
      .getByRole("row")
      .filter({ hasText: "Managed test project" });
    await row.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(row.getByText("Published", { exact: true })).toBeVisible();
    expect(
      (await request.get(`/api/portfolio-images/${item.id}`)).status(),
    ).toBe(200);
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    await page
      .getByLabel("Project Title", { exact: true })
      .fill("Updated managed project");
    await page
      .getByRole("button", { name: "Save project", exact: true })
      .click();
    await expect(
      page.getByRole("cell").filter({ hasText: "Updated managed project" }),
    ).toBeVisible();
    expect(
      (
        await page.request.post("/api/admin/portfolio", {
          headers,
          data: {
            action: "Reorder",
            ids: [
              item.id,
              ...items
                .filter((value: { id: string }) => value.id !== item.id)
                .map((value: { id: string }) => value.id),
            ],
          },
        })
      ).status(),
    ).toBe(200);
    const publicPage = await browser.newPage({
      baseURL: origin,
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "no-preference",
    });
    await publicPage.goto("/portfolio");
    const card = publicPage.locator(".managed-project-card").first();
    await expect(card).toContainText("Updated managed project");
    await expect(card).toHaveAttribute("data-open", "false");
    await card.hover();
    await expect(card).toHaveAttribute("data-open", "true");
    await expect(card.locator(".managed-project-description")).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(card).toHaveCSS("filter", "none");
    await publicPage.mouse.move(2, 2);
    await card.getByRole("button").focus();
    await expect(card).toHaveAttribute("data-open", "true");
    await publicPage.close();
    const mobile = await browser.newPage({
      baseURL: origin,
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
    });
    await mobile.goto("/portfolio");
    const mobileCard = mobile.locator(".managed-project-card").first();
    await mobileCard.getByRole("button").tap();
    await expect(mobile).toHaveURL(/\/portfolio$/);
    await expect(mobileCard).toHaveAttribute("data-open", "true");
    await mobileCard.getByRole("link", { name: "Open project" }).tap();
    await expect(mobile).toHaveURL(/\/portfolio\/nexa-ops$/);
    await mobile.close();
    await page.request.post("/api/admin/portfolio", {
      headers,
      data: { action: "Publish", id: item.id, published: false },
    });
    expect(
      (await request.get(`/api/portfolio-images/${item.id}`)).status(),
    ).toBe(404);
    await page.reload();
    const updated = page
      .getByRole("row")
      .filter({ hasText: "Updated managed project" });
    await updated.getByRole("button", { name: "Delete", exact: true }).click();
    await updated.getByRole("button", { name: "Confirm delete" }).click();
    await expect(
      page.getByText("Updated managed project", { exact: true }),
    ).toHaveCount(0);
  });
  test("contact accepts loopback alias, delivers safely, handles failure honestly and footer links to login", async ({
    page,
    request,
  }) => {
    const input = {
      name: "Contact QA",
      email: "contact-qa@example.test",
      company: "Test",
      phone: "",
      projectType: "Website",
      budget: "Let’s discuss",
      description: "A clearly marked integration test contact message.",
      website: "",
    };
    const response = await request.post("/api/contact", {
      headers: { Origin: "http://127.0.0.1:3100" },
      data: input,
    });
    expect(response.status()).toBe(200);
    expect((await response.json()).notified).toBe(true);
    await expect
      .poll(async () =>
        (await mails()).some(
          (mail) =>
            mail.replyTo === input.email &&
            mail.to === "company.quitelogic@gmail.com",
        ),
      )
      .toBe(true);
    const failed = await request.post("/api/contact", {
      headers,
      data: { ...input, description: input.description + " [FAIL]" },
    });
    expect((await failed.json()).message).toContain("saved for our team");
    const denied = await request.post("/api/contact", {
      headers: { Origin: "https://evil.example" },
      data: input,
    });
    expect(denied.status()).toBe(403);
    expect((await denied.json()).message).toContain("We couldn't send");
    await page.goto("/contact");
    await expect(
      page.locator("footer").getByRole("link", { name: "Admin Login" }),
    ).toHaveAttribute("href", "/admin/login");
  });
});
