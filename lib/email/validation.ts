import { z } from "zod";
export const emailSubject = z
  .string()
  .trim()
  .min(1)
  .max(180)
  .regex(/^[^\r\n\x00]+$/);
export const emailBody = z.string().trim().min(1).max(10000);
export const composeSchema = z
  .object({
    clientId: z.uuid().optional(),
    to: z.string().trim().pipe(z.email().max(254)).optional(),
    subject: emailSubject,
    body: emailBody,
  })
  .strict()
  .refine((input) => !!input.clientId || !!input.to);
export const replySchema = z.object({ message: emailBody }).strict();
