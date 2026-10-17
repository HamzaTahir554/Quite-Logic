import { z } from "zod";
export const passwordHelp =
  "Use 16–200 characters, including a letter and a number or symbol. Avoid repeated characters.";
export const newPasswordSchema = z
  .string()
  .min(16, passwordHelp)
  .max(200, passwordHelp)
  .refine(
    (value) =>
      /[A-Za-z]/.test(value) &&
      /[^A-Za-z\s]/.test(value) &&
      new Set(value).size >= 6,
    passwordHelp,
  );
export const passwordPair = z
  .object({ password: newPasswordSchema, confirmPassword: z.string().max(200) })
  .refine((value) => value.password === value.confirmPassword, {
    message: "The new passwords do not match.",
    path: ["confirmPassword"],
  });
