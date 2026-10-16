import { test, expect } from "@playwright/test";
import { deliverInquiry } from "../lib/contact-delivery";
import { contactSchema } from "../lib/contact";
import { contactEmail } from "../lib/company";

test("server email targets official inbox, uses reply-to and propagates delivery failure", async () => {
  const input = contactSchema.parse({
    name: "Test Person",
    email: "visitor@example.com",
    company: "Independent",
    phone: "",
    projectType: "Website",
    budget: "Let’s discuss",
    description: "A test inquiry with enough detail.",
    website: "",
  });
  let payload: Record<string, unknown> = {};
  const send: typeof fetch = async (url, options) => {
    expect(url).toBe("https://api.resend.com/emails");
    expect(options?.headers).toMatchObject({
      Authorization: "Bearer test-credential",
    });
    payload = JSON.parse(String(options?.body));
    return Response.json({ id: "test-id" });
  };
  const config = {
    apiKey: "test-credential",
    from: "studio@verified.example",
    to: contactEmail,
  };
  await deliverInquiry(input, config, send);
  expect(payload.to).toEqual(["company.quitelogic@gmail.com"]);
  expect(payload.from).toBe(config.from);
  expect(payload.reply_to).toBe(input.email);
  expect(payload.text).toContain(input.description);
  await expect(
    deliverInquiry(
      input,
      config,
      async () => new Response(null, { status: 403 }),
    ),
  ).rejects.toThrow("Delivery failed");
  expect(contactSchema.safeParse({ ...input, website: "spam" }).success).toBe(
    false,
  );
});
