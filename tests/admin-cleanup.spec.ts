import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { randomBytes, randomUUID, scryptSync, createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:5434/postgres";
const headers = { Origin: "http://localhost:3100" };
const password = "Local-Test-Only-123456!";

test.describe("Admin without email tools", () => {
  test.skip(
    process.env.E2E_DATABASE_TESTS !== "1",
    "Uses the isolated database only.",
  );

  test("email routes cannot send; messages are protected, read-only and contact-only", async ({
    page,
    request,
  }) => {
    expect((await request.get("/api/admin/messages")).status()).toBe(401);
    const login = await page.request.post("/api/admin/login", {
      headers,
      data: { email: "  ADMIN@example.test  ", password },
    });
    expect(login.status()).toBe(200);
    const pool = new Pool({ connectionString: databaseUrl, max: 1 });
    const id = randomUUID(),
      inboundId = randomUUID(),
      clientId = randomUUID();
    try {
      await pool.query(
        "INSERT INTO clients(id,name,email) VALUES($1,'Cleanup client',$2)",
        [clientId, `cleanup-${clientId}@example.test`],
      );
      await pool.query(
        `INSERT INTO messages(id,client_id,subject,body,from_name,from_email,source)
        VALUES($1,$3,'Cleanup contact','Line one\nLine two <script>unsafe()</script>','Cleanup client','cleanup@example.test','contact_form'),
        ($2,$3,'Hidden inbound','Inbound email body','Inbound client','inbound@example.test','inbound_email')`,
        [id, inboundId, clientId],
      );
      const data = await (
        await page.request.get("/api/admin/messages?q=Cleanup")
      ).json();
      expect(data.items.some((item: { id: string }) => item.id === id)).toBe(
        true,
      );
      const hidden = await (
        await page.request.get("/api/admin/messages?q=Hidden%20inbound")
      ).json();
      expect(hidden.items).toEqual([]);
      const dashboard = await (
        await page.request.get("/api/admin/dashboard")
      ).json();
      expect(dashboard).not.toHaveProperty("emailReady");
      for (const path of [
        "/api/admin/email",
        "/api/admin/emails",
        `/api/admin/emails/${id}/reply`,
      ]) {
        expect(
          (
            await page.request.post(path, {
              headers,
              data: {
                to: "nobody@example.test",
                subject: "Removed",
                body: "Never send",
              },
            })
          ).status(),
        ).toBe(404);
      }
      expect(
        (await page.request.get("/api/admin/reviews?status=invalid")).status(),
      ).toBe(400);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/admin/inbox");
      await expect(page).toHaveURL(/\/admin\/messages$/);
      await expect(
        page.getByRole("heading", { name: "Contact Messages", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Cleanup contact", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /send email|compose|reply/i }),
      ).toHaveCount(0);
      await expect(
        page.getByText("SMTP (Resend):", { exact: false }),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
      await page.request.post("/api/admin/logout", { headers, data: {} });
    } finally {
      await pool.end();
    }
  });

  test("malformed stored hashes return invalid credentials without crashing", async ({
    request,
  }) => {
    const pool = new Pool({ connectionString: databaseUrl, max: 1 });
    const email = `bad-hash-${randomUUID()}@example.test`;
    try {
      await pool.query(
        "INSERT INTO admins(id,email,password_hash) VALUES($1,$2,'malformed')",
        [randomUUID(), email],
      );
      expect(
        (
          await request.post("/api/admin/login", {
            headers,
            data: { email, password },
          })
        ).status(),
      ).toBe(401);
    } finally {
      await pool.end();
    }
  });

  test("bootstrap password reset enforces strength and revokes sessions and reset links", async () => {
    const pool = new Pool({ connectionString: databaseUrl, max: 1 });
    const id = randomUUID(),
      email = `bootstrap-${randomUUID()}@example.test`;
    const salt = randomBytes(16).toString("hex");
    const token = createHash("sha256").update(randomUUID()).digest("hex");
    const execute = promisify(execFile);
    try {
      await pool.query(
        "INSERT INTO admins(id,email,password_hash) VALUES($1,$2,$3)",
        [
          id,
          email,
          `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
        ],
      );
      await pool.query(
        "INSERT INTO password_resets(token_hash,admin_id,expires_at) VALUES($1,$2,now()+interval '30 minutes')",
        [token, id],
      );
      await pool.query(
        "INSERT INTO admin_sessions(token_hash,admin_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",
        [token, id],
      );
      const env = {
        ...process.env,
        DATABASE_URL: databaseUrl,
        ADMIN_SETUP_EMAIL: email,
        ADMIN_SETUP_PASSWORD: "New-Setup-Password-98765!",
      };
      await expect(
        execute(process.execPath, ["scripts/database.mjs", "--admin"], {
          env: { ...env, ADMIN_SETUP_PASSWORD: "a".repeat(20) },
        }),
      ).rejects.toThrow();
      await execute(process.execPath, ["scripts/database.mjs", "--admin"], {
        env,
      });
      expect(
        (
          await pool.query("SELECT * FROM password_resets WHERE admin_id=$1", [
            id,
          ])
        ).rowCount,
      ).toBe(0);
      expect(
        (
          await pool.query("SELECT * FROM admin_sessions WHERE admin_id=$1", [
            id,
          ])
        ).rowCount,
      ).toBe(0);
      const result = await pool.query(
        "SELECT password_hash FROM admins WHERE id=$1",
        [id],
      );
      const [newSalt, hash] = result.rows[0].password_hash.split(":");
      expect(
        scryptSync(env.ADMIN_SETUP_PASSWORD, newSalt, 64).toString("hex"),
      ).toBe(hash);
    } finally {
      await pool.end();
    }
  });
});
