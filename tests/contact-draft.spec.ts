import { test, expect } from "@playwright/test";
import { contactSchema } from "../lib/contact";
import { contactDraft } from "../lib/contact-draft";
test("contact draft validation rejects invalid or unexpected fields", () => {
  const input = {
    name: "  Test Person  ",
    email: "  visitor@example.com  ",
    message: "A test inquiry with enough meaningful detail.",
  };
  const parsed = contactSchema.parse(input);
  expect(parsed.name).toBe("Test Person");
  expect(parsed.email).toBe("visitor@example.com");
  expect(parsed.subject).toBe("");
  for (const payload of [
    { ...input, name: " " },
    { ...input, email: "invalid" },
    { ...input, message: " " },
    { ...input, message: "x".repeat(5001) },
    { ...input, subject: "bad\r\nBcc: attack@test.com" },
    { ...input, unexpected: {} },
    { ...input, website: "spam" },
  ])
    expect(contactSchema.safeParse(payload).success).toBe(false);
  expect(
    contactSchema.safeParse({
      ...input,
      message: undefined,
      description: input.message,
    }).success,
  ).toBe(true);
});
test("contact drafts are local mailto links with encoded content and no delivery claim", () => {
  const input = contactSchema.parse({
    name: "Draft Client",
    email: "client@example.test",
    subject: "Website & app",
    message: "A clear message with ? and & characters for the draft.",
  });
  const draft = contactDraft(input);
  const url = new URL(draft.url);
  expect(url.protocol).toBe("mailto:");
  expect(url.pathname).toBe("company.quitelogic@gmail.com");
  expect(url.searchParams.get("subject")).toBe(input.subject);
  expect(url.searchParams.get("body")).toContain(input.message);
  expect(url.searchParams.get("body")).toContain(input.email);
});
