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
export const contactSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Please enter at least 2 characters.")
      .max(100),
    email: z
      .string()
      .trim()
      .pipe(z.email("Please enter a valid email address.").max(254)),
    subject: z
      .string()
      .trim()
      .max(180)
      .regex(/^[^\r\n\x00]*$/)
      .optional()
      .default(""),
    message: z.string().trim().min(20).max(5000).optional(),
    company: z.string().trim().max(150).optional().default(""),
    phone: z
      .string()
      .trim()
      .max(40)
      .refine(
        (v) => !v || /^[+\d\s().-]{5,40}$/.test(v),
        "Please enter a valid phone number.",
      )
      .optional()
      .default(""),
    projectType: z
      .enum(projectTypes, { error: "Please choose a project type." })
      .optional()
      .default("Other"),
    budget: z
      .enum(budgets, { error: "Please choose a budget range." })
      .optional()
      .default("Let’s discuss"),
    description: z.string().trim().max(5000).optional().default(""),
    website: z.string().max(0).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if ((input.message || input.description).length < 20)
      context.addIssue({
        code: "custom",
        path: ["description"],
        message: "Tell us a little more (at least 20 characters).",
      });
  });
export type ContactInput = z.infer<typeof contactSchema>;
