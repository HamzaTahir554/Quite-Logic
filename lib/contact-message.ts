import type { ContactInput } from "./contact";

export function contactMessage(input: ContactInput) {
  return {
    subject: "Quite Logic inquiry: " + (input.subject || input.projectType),
    text: [
      "New inquiry from the Quite Logic website",
      "",
      "Name: " + input.name,
      "Email: " + input.email,
      "Company: " + (input.company || "Not provided"),
      "Phone: " + (input.phone || "Not provided"),
      "Service: " + input.projectType,
      "Budget: " + input.budget,
      "",
      input.message || input.description,
    ].join("\n"),
  };
}
