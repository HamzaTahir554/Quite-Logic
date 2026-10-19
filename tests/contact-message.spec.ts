import { test, expect } from "@playwright/test";
import { contactSchema } from "../lib/contact";
import { contactMessage } from "../lib/contact-message";
test("contact validation rejects invalid or unexpected fields", () => {
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
    { ...input, to: "recipient@example.test" },
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
test("contact messages include sender context as plain text", () => {
  const input = contactSchema.parse({
    name: "Contact Client",
    email: "client@example.test",
    subject: "Website & app",
    message:
      "A clear message with ? and & characters and <b>literal markup</b>.",
  });
  const mail = contactMessage(input);
  expect(mail.subject).toBe("Quite Logic inquiry: Website & app");
  expect(mail.text).toContain(input.message);
  expect(mail.text).toContain(input.email);
  expect(mail.text).toContain("Company: Not provided");
  expect(contactMessage({ ...input, subject: "" }).subject).toBe(
    "Quite Logic inquiry: Other",
  );
});
