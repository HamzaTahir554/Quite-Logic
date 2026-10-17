// Isolated provider HTTP fixture. The real Resend SDK and webhook verification run unchanged.
import { appendFileSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { registerHooks } from "node:module";
const smtpFixture = new URL("./test-smtp-transport.cjs", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^nodemailer(?:$|[-/])/.test(specifier))
      return { url: smtpFixture, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const originalFetch = globalThis.fetch;
const sent = new Map();
globalThis.fetch = async (input, options) => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
  );
  if (url.hostname !== "api.resend.com") return originalFetch(input, options);
  if (!process.env.QUIET_TEST_MAILBOX)
    throw new Error("No isolated provider fixture configured.");
  if (url.pathname === "/emails" && options?.method === "POST") {
    const mail = JSON.parse(options.body);
    const key = new Headers(options.headers).get("idempotency-key");
    if (
      String(mail.subject).includes("[FAIL]") ||
      String(mail.text).includes("[FAIL]")
    )
      return Response.json(
        { name: "validation_error", message: "Simulated provider failure" },
        { status: 422 },
      );
    if (key && sent.has(key)) return Response.json({ id: sent.get(key) });
    const id = randomUUID();
    if (key) sent.set(key, id);
    appendFileSync(
      process.env.QUIET_TEST_MAILBOX,
      JSON.stringify({
        ...mail,
        to: mail.to[0],
        replyTo: mail.reply_to,
        id,
        idempotencyKey: key,
      }) + "\n",
      "utf8",
    );
    return Response.json({ id });
  }
  if (url.pathname.startsWith("/emails/receiving/")) {
    const id = url.pathname.split("/").at(-1);
    let emails = {};
    try {
      emails = JSON.parse(readFileSync("qa/.test-inbound.json", "utf8"));
    } catch {}
    if (!emails[id])
      return Response.json(
        { name: "not_found", message: "Fixture unavailable" },
        { status: 404 },
      );
    return Response.json({
      object: "email",
      id,
      created_at: new Date().toISOString(),
      to: ["contact@quitelogic.com"],
      received_for: ["contact@quitelogic.com"],
      from: "Inbound Client <inbound@example.test>",
      subject: "Inbound inquiry",
      text: "A direct inbound email with useful information.",
      html: null,
      headers: {},
      message_id: "<" + id + "@example.test>",
      attachments: [],
      ...emails[id],
    });
  }
  return Response.json(
    { name: "not_found", message: "Unsupported fixture operation" },
    { status: 404 },
  );
};
