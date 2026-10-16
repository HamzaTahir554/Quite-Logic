import type { ContactInput } from "./contact";
type DeliveryConfig = { apiKey: string; from: string; to: string };
// Imported only by the server route. Secrets never become client props or responses.
export async function deliverInquiry(
  input: ContactInput,
  config: DeliveryConfig,
  send: typeof fetch = fetch,
) {
  const { name, email, company, phone, projectType, budget, description } =
    input;
  const response = await send("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [config.to],
      reply_to: email,
      subject: `Quite Logic inquiry: ${projectType}`,
      text: `Name: ${name}\nEmail: ${email}\nCompany: ${company}\nPhone: ${phone || "Not provided"}\nType: ${projectType}\nBudget: ${budget}\n\n${description}`,
    }),
  });
  if (!response.ok) throw new Error("Delivery failed");
}
