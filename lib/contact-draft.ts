import { contactEmail } from "./company";
import type { ContactInput } from "./contact";
export function contactDraft(input: ContactInput) {
  const subject = input.subject || "Project inquiry - " + input.projectType;
  const body = [
    "Name: " + input.name,
    "Email: " + input.email,
    "Company: " + (input.company || "Not provided"),
    "Phone: " + (input.phone || "Not provided"),
    "Service: " + input.projectType,
    "Budget: " + input.budget,
    "",
    input.message || input.description,
  ].join("\n");
  return {
    subject,
    body,
    url:
      "mailto:" +
      contactEmail +
      "?subject=" +
      encodeURIComponent(subject) +
      "&body=" +
      encodeURIComponent(body),
  };
}
