import { RateLimit } from "../lib/models";

export async function testContactApi({
  origin,
  inbox,
  check,
  setSmtpFailure,
}: {
  origin: string;
  inbox: string[];
  check: (value: unknown, label: string) => void;
  setSmtpFailure: (failure: "recipient" | "data" | null) => void;
}) {
  const input = {
    name: "Contact Visitor",
    email: "visitor@example.test",
    company: "Example Studio",
    phone: "+92 300 1234567",
    projectType: "Website",
    budget: "Under $5,000",
    subject: "Website inquiry",
    description:
      "We need a website with an accessible contact form. <b>Plain text only.</b>",
    website: "",
  };
  const send = (data: unknown = input) =>
    fetch(origin + "/api/contact", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  const before = inbox.length;
  const response = await send();
  check(
    response.status === 200,
    "Public contact submission succeeds without an admin session",
  );
  check(
    response.headers.get("cache-control") === "no-store",
    "Contact responses are not cached",
  );
  check(
    (await response.json()).message.includes("submitted"),
    "SMTP acceptance returns confirmation",
  );
  check(
    inbox.length === before + 1,
    "One contact message accepted by local SMTP",
  );
  const mail = inbox.at(-1)!;
  check(
    /^From: Quite Logic <test@example.test>$/m.test(mail),
    "Trusted sender used as From",
  );
  check(
    /^To: inbox@example.test$/m.test(mail),
    "Recipient comes only from server configuration",
  );
  check(
    /^Reply-To: visitor@example.test$/m.test(mail),
    "Reply-To reaches the visitor",
  );
  check(
    mail.includes("Subject: Quite Logic inquiry: Website inquiry"),
    "Inquiry subject identifies the website",
  );
  for (const value of [
    input.name,
    input.email,
    input.company,
    input.phone,
    input.projectType,
    input.budget,
    input.description,
  ])
    check(
      mail.includes(value),
      "SMTP text includes inquiry field: " + value.split(":")[0],
    );
  check(
    mail.includes("Content-Type: text/plain") &&
      !mail.includes("Content-Type: text/html"),
    "Visitor content remains plain text",
  );

  const accepted = inbox.length;
  for (const invalid of [
    { ...input, name: " " },
    { ...input, email: "invalid" },
    { ...input, description: "short" },
    { ...input, description: "x".repeat(5001) },
    { ...input, subject: "Injected\r\nBcc: attacker@example.test" },
    { ...input, website: "https://spam.test" },
    { ...input, to: "attacker@example.test" },
    { ...input, from: "attacker@example.test", bcc: "victim@example.test" },
  ])
    check(
      (await send(invalid)).status === 400,
      "Invalid/spam/header/recipient override input rejected",
    );
  for (const requestOrigin of [undefined, "https://untrusted.example"]) {
    const rejected = await fetch(origin + "/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(requestOrigin ? { Origin: requestOrigin } : {}),
      },
      body: JSON.stringify(input),
    });
    check(
      rejected.status === 403,
      "Missing or foreign request origin rejected",
    );
  }
  check(
    (await fetch(origin + "/api/contact")).status === 405,
    "GET cannot send a contact message",
  );
  for (const [contentType, body, expected] of [
    ["text/plain", JSON.stringify(input), 415],
    ["application/json", "{", 400],
    [
      "application/json",
      JSON.stringify({ ...input, description: "x".repeat(65536) }),
      413,
    ],
  ] as const) {
    check(
      (
        await fetch(origin + "/api/contact", {
          method: "POST",
          headers: { Origin: origin, "Content-Type": contentType },
          body,
        })
      ).status === expected,
      "Content type, malformed JSON and body limits enforced",
    );
  }
  check(inbox.length === accepted, "Rejected requests never send mail");

  await RateLimit.deleteMany({});
  try {
    for (const failure of ["recipient", "data"] as const) {
      setSmtpFailure(failure);
      const failed = await send();
      check(
        failed.status === 503,
        "SMTP " + failure + " rejection cannot report success",
      );
      const error = (await failed.json()).error;
      check(
        !error.includes(input.email) && !error.includes("SMTP"),
        "Mail failure response does not expose internal details",
      );
    }
  } finally {
    setSmtpFailure(null);
  }
  check(
    inbox.length === accepted,
    "SMTP refusal does not count as accepted delivery",
  );
  check(
    (await send()).status === 200 && inbox.length === accepted + 1,
    "Submission can be retried after SMTP recovers",
  );

  await RateLimit.deleteMany({});
  for (let attempt = 0; attempt < 5; attempt++)
    check((await send()).status === 200, "Within-limit sender can submit");
  const limitedInbox = inbox.length;
  check(
    (await send({ ...input, email: input.email.toUpperCase() })).status === 429,
    "Per-email limit is case insensitive",
  );
  check(
    inbox.length === limitedInbox,
    "Rate-limited sender does not send mail",
  );

  await RateLimit.deleteMany({});
  for (let attempt = 0; attempt < 20; attempt++)
    check(
      (await send({ ...input, website: "bot" })).status === 400,
      "Spam attempts consume address rate limit",
    );
  check(
    (await send({ ...input, email: "another@example.test" })).status === 429,
    "Address limit also blocks rotating sender addresses",
  );
  await RateLimit.deleteMany({});
}
