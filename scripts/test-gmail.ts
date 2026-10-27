/** Disposable Mongo + mocked Google transport. Never uses a real mailbox or SMTP. */
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { chromium, expect } from "@playwright/test";
import { windowsTestMongoBinary } from "./test-mongo-binary.mjs";
import { Admin, Session } from "../lib/models";
import { connectDB } from "../lib/mongodb";
import { hashPassword, tokenHash } from "../lib/passwords";
import { encryptToken, decryptToken } from "../lib/gmail/crypto";
import {
  GmailIntegration,
  GmailOAuthState,
  GmailSendReceipt,
} from "../lib/gmail/models";
import { sanitizeEmailHtml, normalizeMessage } from "../lib/gmail/mime";
import { validateAttachment } from "../lib/gmail/send";
import { gmailScopes, gmailConfigurationError } from "../lib/gmail/config";
import { gmailStatus } from "../lib/gmail/client";
import { message } from "./fixtures/gmail-google.mjs";
const origin = "http://localhost:3261",
  directory = resolve("node_modules/.cache/gmail-test");
let database: MongoMemoryServer | undefined,
  server: ChildProcess | undefined,
  browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let checks = 0;
const check = (value: unknown, label: string) => {
  assert.ok(value, label);
  checks++;
  console.log("PASS:", label);
};
let cookie = "";
let logs = "";
const mode = async (value: string) =>
  writeFile(
    resolve(directory, "control.json"),
    JSON.stringify({ mode: value }),
  );
const stats = async () =>
  JSON.parse(await readFile(resolve(directory, "stats.json"), "utf8"));
async function api(
  path: string,
  method = "GET",
  data?: unknown,
  authorized = true,
  originHeader = origin,
) {
  return fetch(origin + "/api/admin/gmail/" + path, {
    method,
    headers: {
      ...(authorized ? { cookie } : {}),
      ...(method !== "GET" ? { Origin: originHeader } : {}),
      ...(data instanceof FormData
        ? {}
        : data !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
    },
    body:
      data instanceof FormData
        ? data
        : data === undefined
          ? undefined
          : JSON.stringify(data),
    redirect: "manual",
    signal: AbortSignal.timeout(40000),
  });
}
function outgoing(requestId = randomUUID(), reply = false) {
  const form = new FormData();
  form.set("requestId", requestId);
  form.set("body", "Hello from the mocked Gmail client.");
  if (reply) form.set("messageId", "m1");
  else {
    form.set("to", "client@example.test");
    form.set("cc", "copy@example.test");
    form.set("bcc", "private@example.test");
    form.set("subject", "A new conversation");
  }
  return form;
}
try {
  await mkdir(directory, { recursive: true });
  await mode("normal");
  process.env.GMAIL_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  Object.assign(process.env, {
    APP_URL: origin,
    GOOGLE_CLIENT_ID: "fixture-client",
    GOOGLE_CLIENT_SECRET: "fixture-secret",
    GOOGLE_REDIRECT_URI: origin + "/api/admin/gmail/callback",
  });
  check(
    !gmailConfigurationError(),
    "Valid server Gmail configuration accepted",
  );
  delete process.env.GOOGLE_CLIENT_SECRET;
  const missingConfiguration = await gmailStatus();
  check(
    !missingConfiguration.configured &&
      missingConfiguration.configurationError?.includes("GOOGLE_CLIENT_SECRET"),
    "Missing configuration names the specific server variable",
  );
  process.env.GOOGLE_CLIENT_SECRET = "fixture-secret";
  const properKey = process.env.GMAIL_TOKEN_ENCRYPTION_KEY;
  process.env.GMAIL_TOKEN_ENCRYPTION_KEY = "invalid-private-key-value";
  const invalidKey = gmailConfigurationError();
  check(
    invalidKey?.includes("base64-encoded 32-byte") &&
      !invalidKey.includes("invalid-private-key-value"),
    "Invalid key diagnostics explain the format without exposing its value",
  );
  process.env.GMAIL_TOKEN_ENCRYPTION_KEY = "  " + properKey + "  ";
  check(
    !gmailConfigurationError(),
    "Whitespace around valid server credentials does not disable Gmail",
  );
  process.env.GMAIL_TOKEN_ENCRYPTION_KEY = properKey;
  process.env.GOOGLE_REDIRECT_URI =
    "GOOGLE_REDIRECT_URI=" + origin + "/api/admin/gmail/callback";
  check(
    gmailConfigurationError()?.includes("repeats its variable name"),
    "Pasted KEY=value callback explains the duplicated prefix",
  );
  process.env.GOOGLE_REDIRECT_URI =
    "https://different.example.test/api/admin/gmail/callback";
  check(
    gmailConfigurationError()?.includes("same origin as APP_URL"),
    "Callback origin mismatch has an actionable diagnostic",
  );
  process.env.GOOGLE_REDIRECT_URI = origin + "/api/admin/gmail/callback";
  process.env.GOOGLE_CLIENT_SECRET = '"fixture-secret"';
  check(
    gmailConfigurationError()?.includes("surrounding quotes"),
    "Quoted Hostinger values have an actionable diagnostic",
  );
  process.env.GOOGLE_CLIENT_SECRET = "fixture-secret";
  const encrypted = encryptToken("fixture-refresh-only");
  check(
    !encrypted.includes("fixture-refresh-only") &&
      decryptToken(encrypted) === "fixture-refresh-only",
    "Refresh tokens encrypted with AES-GCM",
  );
  const split = encrypted.split(".");
  split[2] = Buffer.alloc(16).toString("base64url");
  assert.throws(() => decryptToken(split.join(".")));
  checks++;
  const html = sanitizeEmailHtml(
    '<script>alert(1)</script><iframe src="x"></iframe><img src="https://tracker.invalid"><p onclick="x()">Hi</p><a href="javascript:alert(1)">bad</a><a href="https://example.test" style="color:red">good</a>',
  );
  check(
    !/script|iframe|<img|onclick|javascript:|style=/.test(html) &&
      html.includes('rel="noopener noreferrer nofollow"'),
    "Email HTML strips active content and remote tracking",
  );
  check(
    normalizeMessage(message).attachments[0].filename === "brief.pdf",
    "Nested MIME attachment normalization",
  );
  assert.throws(() =>
    validateAttachment(
      "attack.pdf",
      "application/pdf",
      Buffer.from("<script>"),
    ),
  );
  checks++;
  assert.throws(() =>
    validateAttachment("archive.zip", "application/zip", Buffer.from("PK")),
  );
  checks++;
  check(
    gmailScopes.length === 1 && gmailScopes[0].endsWith("gmail.modify"),
    "Only the required Gmail scope requested",
  );
  database = await MongoMemoryServer.create({
    binary: { systemBinary: await windowsTestMongoBinary() },
  });
  process.env.MONGODB_URI = database.getUri("gmail_test");
  await connectDB();
  await Promise.all(
    [Admin, Session, GmailIntegration, GmailOAuthState, GmailSendReceipt].map(
      (model) => model.init(),
    ),
  );
  await Admin.create({
    email: "admin@example.test",
    passwordHash: await hashPassword("Fixture1!Password"),
  });
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "production",
    NODE_OPTIONS:
      "--import=" +
      pathToFileURL(resolve("scripts/fixtures/gmail-google.mjs")).href,
    APP_URL: origin,
    NEXT_PUBLIC_SITE_URL: origin,
    GOOGLE_CLIENT_ID: "fixture-client",
    GOOGLE_CLIENT_SECRET: "fixture-secret",
    GOOGLE_REDIRECT_URI: origin + "/api/admin/gmail/callback",
    GMAIL_ACCOUNT_EMAIL: "official@example.test",
    QL_GMAIL_MOCK: "1",
    GMAIL_TEST_CONTROL_FILE: resolve(directory, "control.json"),
    GMAIL_TEST_STATS_FILE: resolve(directory, "stats.json"),
    SMTP_HOST: "",
    SMTP_USER: "",
    SMTP_PASSWORD: "",
    SMTP_FROM: "",
    CALENDLY_ACCESS_TOKEN: "",
    CALENDLY_EVENT_TYPE_URI: "",
    CALENDLY_SCHEDULING_ENABLED: "false",
  };
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", "3261"],
    { env: childEnv, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  server.stdout?.on("data", (chunk) => {
    logs += String(chunk);
  });
  server.stderr?.on("data", (chunk) => {
    logs += String(chunk);
  });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(origin + "/admin/login");
      if (r.status === 200) {
        ready = true;
        break;
      }
    } catch {}
    if (server.exitCode !== null)
      throw new Error("Fixture server failed: " + logs.slice(-1500));
    await new Promise((r) => setTimeout(r, 300));
  }
  assert.ok(ready, "Test server ready");
  const login = await fetch(origin + "/api/admin/login", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@example.test",
      password: "Fixture1!Password",
    }),
  });
  check(login.status === 200, "Existing admin login works");
  cookie = (login.headers.get("set-cookie") || "").split(";")[0];
  for (const [path, method] of [
    ["status", "GET"],
    ["connect", "POST"],
    ["callback?state=bad", "GET"],
    ["messages", "GET"],
    ["messages/m1", "GET"],
    ["messages/m1", "PATCH"],
    ["threads/t1", "GET"],
    ["send", "POST"],
    ["reply", "POST"],
    ["disconnect", "POST"],
    ["attachments/m1/a1?part=1", "GET"],
  ]) {
    const response = await api(path, method, undefined, false);
    check(
      [401, 403].includes(response.status),
      "Unauthenticated " + method + " " + path + " denied",
    );
  }
  check(
    (await api("send", "POST", outgoing(), true, "https://evil.invalid"))
      .status === 403,
    "Cross-origin Gmail mutation denied",
  );
  check(
    (await (await api("status")).json()).connected === false,
    "Disconnected state reported",
  );
  const savedCookie = cookie;
  const temporary = randomBytes(32).toString("hex");
  const testAdmin = await Admin.findOne().lean();
  await Session.create({
    tokenHash: tokenHash(temporary),
    adminId: testAdmin!._id,
    version: 0,
    expiresAt: new Date(Date.now() + 60000),
  });
  cookie = "ql_admin_session=" + temporary;
  const staleConnect = await api("connect", "POST");
  const staleState = new URL((await staleConnect.json()).url).searchParams.get(
    "state",
  );
  const staleCookie = (staleConnect.headers.get("set-cookie") || "").split(
    ";",
  )[0];
  await Session.deleteOne({ tokenHash: tokenHash(temporary) });
  check(
    (
      await fetch(
        origin +
          "/api/admin/gmail/callback?state=" +
          staleState +
          "&code=fixture-code",
        { headers: { cookie: staleCookie } },
      )
    ).status === 401,
    "Callback rejects a revoked original admin session",
  );
  cookie = savedCookie;
  for (const deniedMode of ["noRefresh", "wrongAccount"]) {
    await mode(deniedMode);
    const response = await api("connect", "POST");
    const nonce = new URL((await response.json()).url).searchParams.get(
      "state",
    );
    const nonceCookie = (response.headers.get("set-cookie") || "").split(
      ";",
    )[0];
    const denied = await fetch(
      origin +
        "/api/admin/gmail/callback?state=" +
        nonce +
        "&code=fixture-code",
      { headers: { cookie: nonceCookie } },
    );
    check(
      denied.status === (deniedMode === "noRefresh" ? 400 : 403),
      "OAuth safely rejects " + deniedMode,
    );
    check(
      !(await GmailIntegration.exists({ key: "official" })),
      "Rejected OAuth never stores credentials",
    );
  }
  await mode("normal");
  const connect = await api("connect", "POST");
  assert.equal(connect.status, 200);
  const authorization = new URL((await connect.json()).url),
    state = authorization.searchParams.get("state")!;
  const stateCookie = (connect.headers.get("set-cookie") || "").split(";")[0];
  check(
    authorization.origin === "https://accounts.google.com" &&
      authorization.searchParams.get("access_type") === "offline" &&
      authorization.searchParams.get("code_challenge_method") === "S256" &&
      authorization.searchParams.get("scope") === gmailScopes[0],
    "Offline OAuth with state and PKCE",
  );
  const invalid = await fetch(
    origin +
      "/api/admin/gmail/callback?state=" +
      "a".repeat(64) +
      "&code=fixture-code",
    { headers: { cookie: stateCookie } },
  );
  check(invalid.status === 403, "Mismatched OAuth state denied");
  // Deliberately omit the Strict admin cookie: callback must use its live session binding.
  const callback = await fetch(
    origin + "/api/admin/gmail/callback?state=" + state + "&code=fixture-code",
    { headers: { cookie: stateCookie } },
  );
  const callbackBody = await callback.text();
  if (callback.status !== 200)
    console.log(
      "Fixture callback:",
      callback.status,
      callbackBody,
      (await stats()).paths,
    );
  check(
    callback.status === 200 && callbackBody.includes("Continue to Inbox"),
    "Browser-bound OAuth callback succeeds without weakening session cookies",
  );
  check(
    (
      await fetch(
        origin +
          "/api/admin/gmail/callback?state=" +
          state +
          "&code=fixture-code",
        { headers: { cookie: stateCookie } },
      )
    ).status === 403,
    "OAuth state cannot be replayed",
  );
  // The callback browser loads Inbox, which can prime the SDK access-token cache.
  await mode("shortExpiry");
  const browserConnect = await api("connect", "POST");
  const browserState = new URL(
    (await browserConnect.json()).url,
  ).searchParams.get("state")!;
  const browserNonce = (browserConnect.headers.get("set-cookie") || "")
    .split(";")[0]
    .split("=")[1];
  const oauthBrowser = await chromium.launch();
  try {
    const oauthContext = await oauthBrowser.newContext();
    await oauthContext.addCookies([
      {
        name: "ql_admin_session",
        value: cookie.split("=")[1],
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Strict",
      },
      {
        name: "ql_gmail_oauth",
        value: browserNonce,
        domain: "localhost",
        path: "/api/admin/gmail",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const oauthPage = await oauthContext.newPage();
    let callbackCookies = "";
    oauthPage.on("request", async (request) => {
      if (request.url().includes("/api/admin/gmail/callback"))
        callbackCookies = (await request.allHeaders()).cookie || "";
    });
    await oauthPage.goto("http://127.0.0.1:3261/about");
    await oauthPage.evaluate(
      (url) => window.location.assign(url),
      origin +
        "/api/admin/gmail/callback?state=" +
        browserState +
        "&code=fixture-code",
    );
    await oauthPage.waitForURL(origin + "/admin/inbox?gmail=connected");
    await expect(
      oauthPage.getByRole("heading", { name: "Inbox", exact: true }),
    ).toBeVisible();
    check(
      callbackCookies.includes("ql_gmail_oauth=") &&
        !callbackCookies.includes("ql_admin_session="),
      "Cross-site callback receives only Lax OAuth nonce, not Strict session cookie",
    );
    check(
      true,
      "Browser callback document restores authenticated Inbox navigation",
    );
  } finally {
    await oauthBrowser.close();
  }
  const record = await GmailIntegration.findOne()
    .select("+encryptedRefreshToken")
    .lean();
  check(
    record?.encryptedRefreshToken !== "fixture-refresh-only" &&
      decryptToken(record!.encryptedRefreshToken) === "fixture-refresh-only",
    "Only encrypted refresh token stored in MongoDB",
  );
  await mode("shortExpiry");
  const status = await (await api("status")).json();
  const beforeRefresh = (await stats()).tokenRequests;
  await mode("normal");
  check(
    (await api("status")).status === 200 &&
      (await stats()).tokenRequests > beforeRefresh,
    "Expiring access token automatically refreshes without Google login",
  );
  check(
    status.connected &&
      status.accountEmail === "official@example.test" &&
      status.unreadCount === 1,
    "Actual API profile and unread label count returned",
  );
  check(
    !JSON.stringify(status).includes("token"),
    "Status never exposes OAuth credentials",
  );
  const list = await (await api("messages")).json();
  check(
    list.items.length === 1 &&
      list.nextPageToken === "page2" &&
      list.items[0].hasAttachments,
    "Paginated mailbox list and attachment indicator",
  );
  check(
    !("html" in list.items[0]) && !("payload" in list.items[0]),
    "List excludes message bodies",
  );
  check(
    (await (await api("messages?pageToken=page2")).json()).nextPageToken ===
      undefined,
    "Gmail page token forwarded",
  );
  check(
    (await (await api("messages?q=nomatch")).json()).items.length === 0,
    "Search handled by Gmail",
  );
  const thread = await (await api("threads/t1")).json();
  check(
    thread.messages.length === 2 &&
      thread.messages[0].id === "m1" &&
      !thread.messages[0].html.includes("<script") &&
      thread.messages[0].replyTo === "reply@example.test",
    "Chronological sanitized full conversation",
  );
  for (const action of ["read", "unread", "star", "unstar", "archive"]) {
    check(
      (await api("messages/m1", "PATCH", { action })).status === 200,
      "Safe label action: " + action,
    );
  }
  check(
    (await api("messages/m1", "PATCH", { action: "delete" })).status === 400,
    "Destructive label/delete action rejected",
  );
  const attachment = await api("attachments/m1/a1?part=1");
  check(
    attachment.status === 200 &&
      attachment.headers
        .get("content-disposition")
        ?.startsWith("attachment;") &&
      (await attachment.text()).startsWith("%PDF"),
    "Authenticated attachment download uses safe disposition",
  );
  check(
    (await api("attachments/m1/stolen?part=1")).status === 404,
    "Attachment must belong to the requested message",
  );
  const id = randomUUID(),
    form = outgoing(id);
  form.append(
    "attachments",
    new File(["%PDF-1.7 fixture"], "brief.pdf", { type: "application/pdf" }),
  );
  const first = await api("send", "POST", form);
  check(
    first.status === 200,
    "New mail with attachment sent through Gmail API fixture",
  );
  let info = await stats();
  const raw = Buffer.from(info.sends[0].raw, "base64url").toString();
  check(
    raw.includes("From: official@example.test") &&
      raw.includes("Bcc: private@example.test") &&
      raw.includes("filename=brief.pdf"),
    "MIME uses connected From, BCC and encoded attachment",
  );
  const repeat = outgoing(id);
  repeat.append(
    "attachments",
    new File(["%PDF-1.7 fixture"], "brief.pdf", { type: "application/pdf" }),
  );
  check(
    (await api("send", "POST", repeat)).status === 200 &&
      (await stats()).sends.length === 1,
    "Same send request is idempotent",
  );
  const concurrentId = randomUUID();
  const concurrent = await Promise.all([
    api("send", "POST", outgoing(concurrentId)),
    api("send", "POST", outgoing(concurrentId)),
  ]);
  check(
    concurrent.some((r) => r.status === 200) &&
      (await stats()).sends.length === 2,
    "Concurrent duplicate sends protected by unique Mongo receipt",
  );
  check(
    (await api("reply", "POST", outgoing(randomUUID(), true))).status === 200,
    "Reply sent",
  );
  info = await stats();
  const reply = info.sends.at(-1),
    replyMime = Buffer.from(reply.raw, "base64url").toString();
  check(
    reply.threadId === "t1" &&
      replyMime.includes("In-Reply-To: <original@example.test>") &&
      replyMime.includes("To: reply@example.test") &&
      replyMime.includes(
        "References: <earlier@example.test> <original@example.test>",
      ),
    "Reply recipient and RFC thread headers come from Gmail",
  );
  const bad = outgoing();
  bad.set("to", "bad\r\nBcc: attacker@example.test");
  check(
    (await api("send", "POST", bad)).status === 400,
    "Recipient header injection rejected",
  );
  const spoof = outgoing();
  spoof.set("from", "attacker@example.test");
  check(
    (await api("send", "POST", spoof)).status === 400,
    "Client cannot override From address",
  );
  const wrong = outgoing();
  wrong.append(
    "attachments",
    new File(["bad"], "fake.pdf", { type: "application/pdf" }),
  );
  check(
    (await api("send", "POST", wrong)).status === 400,
    "Attachment MIME signature validated server-side",
  );
  await mode("sendFailure");
  const uncertainId = randomUUID();
  const failure = await api("send", "POST", outgoing(uncertainId));
  check(
    failure.status === 502 &&
      (await failure.json()).code === "GMAIL_SEND_UNCERTAIN",
    "Ambiguous send gives honest unconfirmed state",
  );
  const count = (await stats()).sends.length;
  check(
    (await api("send", "POST", outgoing(uncertainId))).status === 409 &&
      (await stats()).sends.length === count,
    "Uncertain send never blindly retried",
  );
  await mode("normal");
  check(
    (await stats()).tokenRequests >= 2,
    "Stored refresh token automatically obtains an access token",
  );
  browser = await chromium.launch();
  await mode("groupedThreads");
  const context = await browser.newContext({
    reducedMotion: "reduce",
    colorScheme: "dark",
  });
  await context.addCookies([
    {
      name: "ql_admin_session",
      value: cookie.split("=")[1],
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
      secure: false,
    },
  ]);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin + "/admin/inbox");
  await expect(
    page.getByRole("heading", { name: "Inbox", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Project brief.*Client/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Project brief.*Client/ }),
  ).toHaveCount(1);
  check(true, "Messages sharing a Gmail thread use one conversation row");
  await page.getByRole("button", { name: /Project brief.*Client/ }).click();
  await expect(
    page.getByLabel("Email conversation").getByText("Hello Quiet Logic"),
  ).toBeVisible();
  check(
    !(await page.evaluate(() => "mailAttack" in window)),
    "Malicious email cannot execute in Admin DOM",
  );
  for (const width of [1440, 1024, 768, 425, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Inbox has no horizontal overflow at " + width + "px",
    );
  }
  await page.getByRole("button", { name: "Compose", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("To *", { exact: true }).fill("client@example.test");
  await dialog.getByLabel("Subject *", { exact: true }).fill("Browser compose");
  await dialog
    .getByLabel("Message *", { exact: true })
    .fill("A browser email fixture");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  check(true, "Mobile compose sends successfully");
  await page.goto(origin + "/admin/inbox");
  await page.getByRole("button", { name: /Project brief.*Client/ }).click();
  await page
    .getByRole("button", { name: "Reply", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText("reply@example.test");
  await page
    .getByRole("dialog")
    .getByLabel("Message *", { exact: true })
    .fill("Reply from browser");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Send", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  check(true, "Mobile conversation replies inside existing Gmail thread");
  await page
    .getByRole("button", { name: /Switch to (Day|Night) mode/ })
    .click();
  check(
    (await page.locator("html").getAttribute("data-theme")) === "day",
    "Inbox supports Day mode",
  );
  await mkdir("qa/gmail", { recursive: true });
  await page.screenshot({
    path: "qa/gmail/inbox-mobile-day.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: /Switch to (Day|Night) mode/ })
    .click();
  check(
    (await page.locator("html").getAttribute("data-theme")) === "night",
    "Inbox supports Night mode",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: /Project brief.*Client/ }).click();
  await page.screenshot({
    path: "qa/gmail/inbox-desktop-night.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page
    .getByRole("button", { name: /Switch to (Day|Night) mode/ })
    .click();
  await page.screenshot({
    path: "qa/gmail/inbox-tablet-day.png",
    fullPage: true,
  });
  check(errors.length === 0, "No browser or hydration errors");
  await mode("rate");
  check(
    (await api("messages")).status === 429,
    "Google rate limiting handled cleanly",
  );
  await mode("normal");
  const disconnect = await api("disconnect", "POST");
  check(
    disconnect.status === 200 &&
      !(await GmailIntegration.exists({ key: "official" })),
    "Disconnect removes encrypted credentials",
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Connect Gmail", exact: true }),
  ).toBeVisible();
  check(true, "Disconnected Gmail shows the setup screen");
  await GmailIntegration.create({
    key: "official",
    accountEmail: "official@example.test",
    encryptedRefreshToken: encryptToken("fixture-revoked"),
    scopes: gmailScopes,
    status: "connected",
    connectedAt: new Date(),
  });
  await mode("revoked");
  const revoked = await (await api("status")).json();
  check(
    revoked.reconnect && !revoked.connected,
    "Revoked authorization becomes reconnect state",
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Reconnect Gmail", exact: true }),
  ).toBeVisible();
  check(true, "Expired Gmail authorization shows a reconnect action");
  const diagnostic =
    "GOOGLE_REDIRECT_URI must use the same origin as APP_URL and the exact path /api/admin/gmail/callback.";
  await page.route("**/api/admin/gmail/status", (route) =>
    route.fulfill({
      json: {
        configured: false,
        connected: false,
        reconnect: false,
        unreadCount: 0,
        configurationError: diagnostic,
      },
    }),
  );
  await page.reload();
  await expect(
    page.getByRole("alert").filter({ hasText: diagnostic }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Connect Gmail", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", {
      name: "Check configuration again",
      exact: true,
    }),
  ).toBeVisible();
  check(
    true,
    "Admin sees the specific configuration error with a retry action, without bypassing validation",
  );
  check(
    !logs.includes("fixture-access-only") &&
      !logs.includes("fixture-refresh-only") &&
      !logs.includes("fixture-secret"),
    "Credentials never appear in server logs",
  );
  console.log(
    "PASS:",
    checks,
    "Gmail security, API, MIME, OAuth, concurrency and browser checks. No real email sent.",
  );
} finally {
  await browser?.close();
  if (server && server.exitCode === null) {
    server.kill();
    await Promise.race([
      once(server, "exit"),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
  }
  await mongoose.disconnect();
  await database?.stop();
}
