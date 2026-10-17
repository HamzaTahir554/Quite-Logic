import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .pipe(z.email().max(254))
  .transform((value) => value.toLowerCase());
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128)
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/[A-Z]/, "Add an uppercase letter.")
  .regex(/[0-9]/, "Add a number.")
  .regex(/[^a-zA-Z0-9]/, "Add a symbol.");
const optionalText = (max: number) => z.string().trim().max(max).default("");
const safePath = (value: string) => /^\/(?![\/\\])[^\\\s]*$/.test(value);
export const projectSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    logo: z
      .string()
      .refine(
        (value) =>
          /^\/api\/project-images\/[a-f0-9]{24}$/.test(value) ||
          /^\/projects\/[a-zA-Z0-9_-]+\.(svg|png|webp|jpg)$/.test(value),
        "Upload a project logo.",
      ),
    description: z.string().trim().min(10).max(10000),
    // MongoDB supplies creation defaults. Keeping defaults out of this schema
    // prevents PATCH validation from overwriting omitted fields in Zod 4.
    shortDescription: z.string().trim().max(300).optional(),
    category: z.string().trim().max(100).optional(),
    technologies: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    projectUrl: z
      .string()
      .max(2000)
      .refine((value) => {
        if (!value || safePath(value)) return true;
        try {
          const url = new URL(value);
          return (
            ["http:", "https:"].includes(url.protocol) &&
            !url.username &&
            !url.password
          );
        } catch {
          return false;
        }
      }, "Use an HTTP(S) URL or a local path.")
      .optional(),
    featured: z.boolean().optional(),
    status: z.enum(["draft", "published"]).optional(),
    order: z.number().int().min(0).max(1000000).optional(),
  })
  .strict();
export const reviewSchema = z
  .object({
    clientName: z.string().trim().min(2).max(100),
    company: optionalText(150),
    role: optionalText(100),
    email: emailSchema,
    service: optionalText(100),
    rating: z.number().int().min(1).max(5),
    review: z.string().trim().min(20).max(5000),
    website: z.string().max(0).optional(),
  })
  .strict();
export const newPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
