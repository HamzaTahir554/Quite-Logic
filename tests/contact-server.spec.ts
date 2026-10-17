import { test, expect } from "@playwright/test";
import { contactSchema } from "../lib/contact";
import { escapeHtml, messageTemplate } from "../lib/email/templates";
test("contact validation supports the existing form and minimal API without accepting unexpected fields", () => {
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
test("email templates escape all user-supplied HTML", () => {
  expect(escapeHtml('<img src=x onerror="alert(1)"> & test')).toBe(
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; test",
  );
  const html = messageTemplate(
    "<script>bad</script>",
    '<img src=x onerror="alert(1)">\nSecond line',
  );
  expect(html).not.toContain("<script>");
  expect(html).not.toContain("<img");
  expect(html).toContain("<br>Second line");
});
