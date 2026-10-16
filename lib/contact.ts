import { z } from "zod";
export const projectTypes = [
  "Website",
  "Mobile Application",
  "AI Automation",
  "AI Vision",
  "Custom Software",
  "Other",
] as const;
export const budgets = [
  "Let’s discuss",
  "Under $5,000",
  "$5,000–$15,000",
  "$15,000–$50,000",
  "$50,000+",
] as const;
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter at least 2 characters.")
    .max(100),
  email: z.email("Please enter a valid email address.").max(254),
  company: z
    .string()
    .trim()
    .min(1, "Please enter your company or “Independent”.")
    .max(150),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine(
      (v) => !v || /^[+\d\s().-]{5,40}$/.test(v),
      "Please enter a valid phone number.",
    ),
  projectType: z.enum(projectTypes, { error: "Please choose a project type." }),
  budget: z.enum(budgets, { error: "Please choose a budget range." }),
  description: z
    .string()
    .trim()
    .min(20, "Tell us a little more (at least 20 characters).")
    .max(5000),
  website: z.string().max(0).optional(),
});
export type ContactInput = z.infer<typeof contactSchema>;
