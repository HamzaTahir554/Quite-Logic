/** End-to-end validation against disposable MongoDB + local SMTP, never production. */
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { readFile, mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import sharp from "sharp";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { chromium, expect } from "@playwright/test";
import { connectDB } from "../lib/mongodb";
import {
  Admin,
  Project,
  Review,
  Session,
  ProjectImage,
  RateLimit,
} from "../lib/models";
import { hashPassword, randomToken, tokenHash } from "../lib/passwords";
import { windowsTestMongoBinary } from "./test-mongo-binary.mjs";

const port = Number(process.env.ADMIN_TEST_PORT || 3217),
  smtpPort = port + 1;
const origin = `http://localhost:${port}`;
const email = "admin@example.test";
let password = `Aa1!${randomBytes(18).toString("hex")}`;
let cookie = "",
  server: ChildProcess | undefined,
  database: MongoMemoryReplSet | undefined;
const inbox: string[] = [];
let assertions = 0;
function check(value: unknown, label: string) {
  assert.ok(value, label);
  assertions++;
}
const smtp = createServer((socket) => {
  socket.setEncoding("utf8");
  socket.write("220 localhost test SMTP\r\n");
  let buffer = "",
    message = "",
    inData = false;
  socket.on("data", (chunk) => {
    buffer += chunk;
    let boundary: number;
    while ((boundary = buffer.indexOf("\r\n")) >= 0) {
      const line = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      if (inData) {
        if (line === ".") {
          inbox.push(message);
          message = "";
          inData = false;
          socket.write("250 accepted\r\n");
        } else message += line + "\n";
      } else if (/^EHLO|^HELO/i.test(line)) socket.write("250 localhost\r\n");
      else if (/^DATA/i.test(line)) {
        inData = true;
        socket.write("354 end with dot\r\n");
      } else if (/^QUIT/i.test(line)) socket.end("221 bye\r\n");
      else socket.write("250 ok\r\n");
    }
  });
});
async function startServer() {
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", String(port)],
    {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        APP_URL: origin,
        SMTP_HOST: "127.0.0.1",
        SMTP_PORT: String(smtpPort),
        SMTP_FROM: "Quite Logic <test@example.test>",
        SMTP_USER: "",
        SMTP_PASSWORD: "",
        SMTP_REQUIRE_TLS: "false",
      },
    },
  );
  server.stdout?.resume();
  server.stderr?.on("data", () => {});
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      if ((await fetch(origin + "/admin/login")).ok) return;
    } catch {
      /* starting */
    }
    if (server.exitCode !== null)
      throw new Error("Test server exited before becoming ready.");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Test server did not become ready.");
}
async function stopServer() {
  if (server && server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill();
    await exited;
  }
}
async function call(
  path: string,
  method = "GET",
  data?: unknown,
  authenticated = true,
  customOrigin = origin,
) {
  return fetch(origin + path, {
    method,
    redirect: "manual",
    headers: {
      Origin: customOrigin,
      ...(authenticated && cookie ? { Cookie: cookie } : {}),
      ...(data === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}
async function login() {
  const response = await call(
    "/api/admin/login",
    "POST",
    { email, password },
    false,
  );
  check(response.status === 200, "Login succeeds");
  cookie =
    response.headers
      .getSetCookie()
      .find((value) => value.startsWith("ql_admin_session="))
      ?.split(";")[0] || "";
  check(
    !!cookie &&
      /HttpOnly/i.test(response.headers.get("set-cookie") || "") &&
      /SameSite=strict/i.test(response.headers.get("set-cookie") || ""),
    "Session cookie is secure and present",
  );
}

try {
  console.log("Starting disposable MongoDB replica set and local SMTP…");
  const systemBinary = await windowsTestMongoBinary();
  database = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    ...(systemBinary ? { binary: { systemBinary } } : {}),
  });
  process.env.MONGODB_URI = database.getUri("quietlogic_test");
  await connectDB();
  await Promise.all(
    [Admin, Project, Review, Session, ProjectImage, RateLimit].map((model) =>
      model.init(),
    ),
  );
  await mongoose.disconnect();
  await connectDB();
  check(
    mongoose.connection.readyState === 1,
    "MongoDB reconnects after disconnect",
  );
  const admin = await Admin.create({
    email,
    passwordHash: await hashPassword(password),
  });
  const concepts = JSON.parse(
    await readFile(new URL("../data/portfolio.json", import.meta.url), "utf8"),
  ) as {
    title: string;
    source_slug: string;
    image_url: string;
    description: string;
    category: string;
    project_url: string;
  }[];
  for (const [order, concept] of concepts.entries())
    await Project.create({
      title: concept.title,
      slug: concept.source_slug,
      sourceSlug: concept.source_slug,
      logo: concept.image_url,
      description: concept.description,
      category: concept.category,
      projectUrl: concept.project_url,
      order,
      status: "published",
    });
  smtp.listen(smtpPort, "127.0.0.1");
  await once(smtp, "listening");
  await startServer();

  for (const path of [
    "/admin",
    "/admin/reviews",
    "/admin/portfolio",
    "/admin/account",
  ]) {
    const response = await call(path, "GET", undefined, false);
    check(
      response.status === 307 &&
        response.headers.get("location") === "/admin/login",
      "Protected page redirects",
    );
  }
  for (const path of ["/api/admin/reviews", "/api/admin/projects"])
    check(
      (await call(path, "GET", undefined, false)).status === 401,
      "Admin reads require authentication",
    );
  for (const [path, method] of [
    ["/api/admin/reviews/000000000000000000000000", "PATCH"],
    ["/api/admin/reviews/000000000000000000000000", "DELETE"],
    ["/api/admin/projects", "POST"],
    ["/api/admin/projects/000000000000000000000000", "PATCH"],
    ["/api/admin/projects/000000000000000000000000", "DELETE"],
    ["/api/admin/projects/reorder", "POST"],
    ["/api/admin/uploads", "POST"],
    ["/api/admin/change-password", "POST"],
  ])
    check(
      (await call(path, method, {}, false)).status === 401,
      "Admin mutations require authentication",
    );
  check(
    (
      await call(
        "/api/admin/login",
        "POST",
        { email, password: "wrong" },
        false,
      )
    ).status === 401,
    "Wrong credentials rejected",
  );
  cookie = `ql_admin_session=${randomToken()}`;
  check(
    (await call("/api/admin/projects")).status === 401,
    "Forged session cookie rejected",
  );
  cookie = "";
  await login();
  check(
    (
      await call(
        "/api/admin/projects",
        "POST",
        {},
        true,
        "https://evil.example",
      )
    ).status === 403,
    "Cross-origin mutations rejected",
  );
  check(
    (await call("/api/admin/projects/invalid", "PATCH", { title: "test" }))
      .status === 400,
    "Invalid project ID rejected",
  );
  check(
    (await call("/api/admin/reviews/invalid", "DELETE")).status === 400,
    "Invalid review ID rejected",
  );
  check(
    (await call("/api/admin/projects?search=%5B")).status === 200,
    "Search escapes regex input",
  );
  check(
    (await call("/api/projects?limit=1000")).status === 400,
    "Pagination is bounded",
  );

  console.log("Testing review submission, moderation, pagination and privacy…");
  const reviewInput = {
    clientName: "Test Client",
    email: "private@example.test",
    rating: 5,
    company: "Example",
    role: "Owner",
    review:
      "A thoughtful and precise delivery experience from start to finish.",
  };
  check(
    (
      await call(
        "/api/reviews",
        "POST",
        { ...reviewInput, status: "approved" },
        false,
      )
    ).status === 400,
    "Public cannot set approval",
  );
  check(
    (await call("/api/reviews", "POST", reviewInput, false)).status === 201,
    "Review submission succeeds",
  );
  const review = await Review.findOne({
    clientName: reviewInput.clientName,
  }).lean();
  check(review?.status === "pending", "Review starts pending");
  check(
    (await (await call("/api/reviews")).json()).reviews.length === 0,
    "Pending review is private",
  );
  check(
    (
      await call(`/api/admin/reviews/${review!._id}`, "PATCH", {
        status: "approved",
      })
    ).status === 200,
    "Approve review",
  );
  const publicReviews = await (await call("/api/reviews")).json();
  check(
    publicReviews.reviews.length === 1 &&
      !JSON.stringify(publicReviews).includes(reviewInput.email),
    "Approved review public, email private",
  );
  check(
    !JSON.stringify(publicReviews).includes("status") &&
      !JSON.stringify(publicReviews).includes("passwordHash"),
    "Public review projection is restricted",
  );
  check(
    (
      await call(`/api/admin/reviews/${review!._id}`, "PATCH", {
        status: "rejected",
      })
    ).status === 200,
    "Reject review",
  );
  check(
    (await (await call("/api/reviews")).json()).reviews.length === 0,
    "Rejected review stays private",
  );
  check(
    (
      await (
        await call("/api/admin/reviews?search=Test&status=rejected&limit=1")
      ).json()
    ).total === 1,
    "Admin search and status filters work",
  );
  check(
    (await call(`/api/admin/reviews/${review!._id}`, "DELETE")).status === 200,
    "Delete review",
  );

  console.log(
    "Testing durable uploads and project create/edit/publish/reorder/delete…",
  );
  async function upload(bytes: Buffer, mime: string) {
    const data = new FormData();
    data.set("file", new File([new Uint8Array(bytes)], "logo", { type: mime }));
    return fetch(origin + "/api/admin/uploads", {
      method: "POST",
      headers: { Origin: origin, Cookie: cookie },
      body: data,
    });
  }
  check(
    (await upload(Buffer.from("not an image"), "image/png")).status === 400,
    "Corrupt image rejected",
  );
  check(
    (await upload(Buffer.from("<svg></svg>"), "image/svg+xml")).status === 400,
    "SVG upload rejected",
  );
  check(
    (await upload(Buffer.alloc(2 * 1024 * 1024 + 1), "image/png")).status ===
      413,
    "Oversized image rejected",
  );
  const png = await sharp({
    create: { width: 100, height: 100, channels: 4, background: "#a9caff" },
  })
    .png()
    .toBuffer();
  check(
    (await upload(png, "image/jpeg")).status === 400,
    "MIME mismatch rejected",
  );
  const uploaded = await upload(png, "image/png");
  check(uploaded.status === 201, "Valid logo uploaded");
  const { logo } = await uploaded.json();
  check(
    (await call(logo, "GET", undefined, false)).status === 404,
    "Unpublished logo private",
  );
  check((await call(logo)).status === 200, "Admin can preview logo");
  const input = {
    title: "Integration Project",
    slug: "integration-project",
    logo,
    description:
      "A database managed project used to validate the complete publishing workflow.",
    category: "Web",
    technologies: ["Next.js"],
    status: "draft",
    order: 10,
  };
  const created = await call("/api/admin/projects", "POST", input);
  check(created.status === 201, "Draft project created");
  const { id } = await created.json();
  check(
    (await call("/api/admin/projects", "POST", input)).status === 409,
    "Duplicate slug rejected",
  );
  const draftResponse = await call(
    `/portfolio/${input.slug}`,
    "GET",
    undefined,
    false,
  );
  const draftHtml = await draftResponse.text();
  // Next returns 200 for streamed notFound responses, with noindex metadata.
  check(
    (draftResponse.status === 404 || draftHtml.includes("noindex")) &&
      !draftHtml.includes(input.title) &&
      !draftHtml.includes(input.description),
    "Draft details private",
  );
  check(
    !(await (await call("/api/projects")).text()).includes(input.title),
    "Draft excluded from public projects",
  );
  check(
    (
      await call(`/api/admin/projects/${id}`, "PATCH", {
        projectUrl: "javascript:alert(1)",
      })
    ).status === 400,
    "Unsafe project URL rejected",
  );
  check(
    (
      await call(`/api/admin/projects/${id}`, "PATCH", {
        title: "Updated Project",
        status: "published",
      })
    ).status === 200,
    "Edit and publish project",
  );
  const published = await (await call("/api/projects")).json();
  const editedProject = await Project.findById(id).lean();
  check(
    editedProject?.order === 10 &&
      editedProject.category === "Web" &&
      editedProject.technologies[0] === "Next.js",
    "Partial project updates preserve omitted fields",
  );
  check(
    published.projects.some(
      (p: { title: string }) => p.title === "Updated Project",
    ),
    "Published project appears automatically",
  );
  check(
    (await call(logo, "GET", undefined, false)).status === 200,
    "Published logo public",
  );
  check(
    (await call(`/portfolio/${input.slug}`, "GET", undefined, false)).status ===
      200,
    "New project details work without code changes",
  );
  check(
    (
      await call("/api/admin/projects/reorder", "POST", {
        id,
        direction: "earlier",
      })
    ).status === 200,
    "Reorder project",
  );
  const ordered = (await (await call("/api/projects")).json()).projects as {
    id: string;
  }[];
  check(
    ordered[ordered.length - 2]?.id === id,
    "Project moves before its neighbor",
  );
  check(
    (await call(`/api/admin/projects/${id}`, "PATCH", { status: "draft" }))
      .status === 200,
    "Unpublish project",
  );
  check(
    (await call(logo, "GET", undefined, false)).status === 404,
    "Unpublished logo no longer public",
  );
  check(
    (await call(`/api/admin/projects/${id}`, "DELETE")).status === 200,
    "Delete project",
  );
  check(
    (await (await call("/api/projects?limit=1&page=2")).json()).projects
      .length === 1,
    "Public pagination works",
  );

  console.log(
    "Testing reset email delivery, token expiration/consumption, and session revocation…",
  );
  check(
    (
      await call(
        "/api/admin/forgot-password",
        "POST",
        { email: "invalid" },
        false,
      )
    ).status === 400,
    "Invalid reset email rejected",
  );
  const unknown = await (
    await call(
      "/api/admin/forgot-password",
      "POST",
      { email: "missing@example.test" },
      false,
    )
  ).json();
  const known = await (
    await call("/api/admin/forgot-password", "POST", { email }, false)
  ).json();
  check(
    known.message === unknown.message,
    "Password recovery response does not disclose account existence",
  );
  check(inbox.length === 1, "Reset email delivered through SMTP");
  // Nodemailer uses quoted-printable for long text lines.
  const mail = inbox[0].replace(/=\n/g, "").replace(/=3D/g, "=");
  const resetToken = mail.match(/token=([a-f0-9]{64})/)?.[1];
  check(!!resetToken, "Email contains a reset link");
  const account = await Admin.findById(admin._id)
    .select("+resetTokenHash")
    .lean();
  check(
    account?.resetTokenHash === tokenHash(resetToken!) &&
      account.resetTokenHash !== resetToken,
    "Only token hash stored",
  );
  const nextPassword = `Bb2!${randomBytes(18).toString("hex")}`;
  const reset = {
    token: resetToken,
    password: nextPassword,
    confirmPassword: nextPassword,
  };
  check(
    (
      await call(
        "/api/admin/reset-password",
        "POST",
        { ...reset, token: randomToken() },
        false,
      )
    ).status === 400,
    "Unknown reset token rejected",
  );
  await Admin.updateOne(
    { _id: admin._id },
    { $set: { resetExpires: new Date(Date.now() - 1000) } },
  );
  check(
    (await call("/api/admin/reset-password", "POST", reset, false)).status ===
      400,
    "Expired token rejected",
  );
  await Admin.updateOne(
    { _id: admin._id },
    { $set: { resetExpires: new Date(Date.now() + 60000) } },
  );
  check(
    (
      await call(
        "/api/admin/reset-password",
        "POST",
        { ...reset, password: "weak", confirmPassword: "weak" },
        false,
      )
    ).status === 400,
    "Weak reset password rejected",
  );
  check(
    (
      await call(
        "/api/admin/reset-password",
        "POST",
        { ...reset, confirmPassword: "mismatch" },
        false,
      )
    ).status === 400,
    "Reset confirmation mismatch rejected",
  );
  const concurrent = await Promise.all([
    call("/api/admin/reset-password", "POST", reset, false),
    call("/api/admin/reset-password", "POST", reset, false),
  ]);
  check(
    concurrent.filter((response) => response.status === 200).length === 1 &&
      concurrent.filter((response) => response.status === 400).length === 1,
    "Reset token consumed exactly once under concurrency",
  );
  check(
    (await call("/api/admin/projects")).status === 401,
    "Reset revokes old sessions",
  );
  password = nextPassword;
  await login();
  const changedPassword = `Cc3!${randomBytes(18).toString("hex")}`;
  const change = {
    currentPassword: password,
    password: changedPassword,
    confirmPassword: changedPassword,
  };
  check(
    (
      await call("/api/admin/change-password", "POST", {
        ...change,
        currentPassword: "wrong",
      })
    ).status === 400,
    "Incorrect current password rejected",
  );
  check(
    (
      await call("/api/admin/change-password", "POST", {
        ...change,
        password: "weak",
        confirmPassword: "weak",
      })
    ).status === 400,
    "Weak change password rejected",
  );
  check(
    (
      await call("/api/admin/change-password", "POST", {
        ...change,
        confirmPassword: "mismatch",
      })
    ).status === 400,
    "Change confirmation mismatch rejected",
  );
  check(
    (await call("/api/admin/change-password", "POST", change)).status === 200,
    "Password changes successfully",
  );
  check(
    (await call("/api/admin/projects")).status === 401,
    "Password change revokes sessions",
  );
  password = changedPassword;
  await login();
  await stopServer();
  await startServer();
  check(
    (await call("/api/admin/projects")).status === 200,
    "Session and database persist across application restart",
  );
  check(
    (await call("/api/admin/logout", "POST")).status === 200,
    "Logout succeeds",
  );
  check(
    (await call("/api/admin/projects")).status === 401,
    "Logout invalidates session",
  );
  // Limits are shared across requests/processes and persist in MongoDB.
  const window = Math.floor(Date.now() / (900 * 1000));
  await RateLimit.updateOne(
    { key: tokenHash(`login-email:${email}:${window}`) },
    { $set: { count: 10 } },
  );
  check(
    (await call("/api/admin/login", "POST", { email, password }, false))
      .status === 429,
    "Exhausted login rate limit enforced",
  );
  await RateLimit.deleteMany({});

  console.log("Testing authenticated browser screens and responsive editor…");
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      baseURL: origin,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/admin/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(origin + "/admin");
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      for (const path of [
        "/admin",
        "/admin/reviews",
        "/admin/portfolio",
        "/admin/account",
      ]) {
        await page.goto(path);
        await expect(page.locator("h1")).toBeVisible();
        check(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          "Admin has no horizontal overflow",
        );
        if (path === "/admin/portfolio") {
          await page
            .getByRole("button", { name: "Add project", exact: true })
            .click();
          await expect(page.getByLabel("Project title")).toBeVisible();
          check(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            "Editor is responsive",
          );
        }
      }
    }
    await mkdir("qa/admin", { recursive: true });
    await page.goto("/admin/portfolio");
    await page
      .getByRole("button", { name: "Add project", exact: true })
      .click();
    await page.getByLabel("Project title").fill("Browser Project");
    await page
      .getByLabel("Project description", { exact: true })
      .fill(
        "A project created through the real browser editor to verify the end-to-end upload and publish workflow.",
      );
    await page
      .getByLabel("Project logo", { exact: true })
      .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
    await expect(page.getByAltText("Project logo preview")).toBeVisible();
    await page
      .getByRole("button", { name: "Save project", exact: true })
      .click();
    const browserProject = page.locator(".admin-record").filter({
      has: page.getByRole("heading", {
        name: "Browser Project",
        exact: true,
      }),
    });
    await expect(browserProject).toBeVisible();
    await browserProject
      .getByRole("button", { name: "Publish", exact: true })
      .click();
    await expect(browserProject.locator(".admin-badge")).toHaveText(
      "published",
    );
    await page.goto("/portfolio");
    await expect(
      page.getByRole("heading", { name: "Browser Project", exact: true }),
    ).toBeVisible();
    await page.goto("/admin/portfolio");
    page.once("dialog", (dialog) => dialog.accept());
    await browserProject
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(browserProject).toHaveCount(0);
    await page.goto("/reviews");
    await page.getByLabel("Your name", { exact: true }).fill("Browser Client");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("browser@example.test");
    await page
      .getByLabel("Your review", { exact: true })
      .fill(
        "An excellent experience with a careful, thoughtful delivery process from the team.",
      );
    await page
      .getByRole("button", { name: "Submit for approval", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "pending approval" }),
    ).toBeVisible();
    await page.goto("/admin/reviews");
    const browserReview = page
      .locator(".admin-record")
      .filter({ hasText: "Browser Client" });
    await browserReview
      .getByRole("button", { name: "Approve", exact: true })
      .click();
    await expect(browserReview.locator(".admin-badge")).toHaveText("approved");
    await page.goto("/reviews");
    await expect(
      page.locator(".review-card").filter({ hasText: "Browser Client" }),
    ).toBeVisible();
    await page.goto("/admin/reviews");
    page.once("dialog", (dialog) => dialog.accept());
    await browserReview
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(browserReview).toHaveCount(0);
    check(
      (await Project.countDocuments()) === 3 &&
        (await Review.countDocuments()) === 0,
      "Browser project and review workflows succeed and clean up",
    );
    await page.goto("/admin");
    await page.screenshot({ path: "qa/admin/dashboard.png", fullPage: true });
    check(errors.length === 0, "No admin browser errors");
    await context.close();
  } finally {
    await browser.close();
  }

  console.log(
    `Passed ${assertions} integration assertions. Running browser regression suite…`,
  );
  const runner = spawn(
    process.execPath,
    [
      "node_modules/@playwright/test/cli.js",
      "test",
      "--grep-invert",
      "capture required design snaps",
    ],
    {
      stdio: "inherit",
      windowsHide: true,
      env: { ...process.env, E2E_BASE_URL: origin },
    },
  );
  const [code] = await once(runner, "exit");
  check(code === 0, "Browser regression suite passes");
  console.log(
    `PASS: ${assertions} integration assertions plus browser regression suite.`,
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.stack : "Integration test failed.",
  );
  process.exitCode = 1;
} finally {
  await stopServer();
  smtp.close();
  await mongoose.disconnect();
  await database?.stop();
}
