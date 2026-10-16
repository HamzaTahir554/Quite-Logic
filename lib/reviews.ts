import { z } from "zod";
export const reviewServices = [
  "Web Development",
  "App Development",
  "AI Automation",
  "AI Vision",
  "Custom Software",
] as const;
export const reviewFields = z.object({
  name: z.string().trim().min(2).max(100),
  company: z.string().trim().max(150),
  role: z.string().trim().max(100),
  service: z.enum(reviewServices),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(20).max(3000),
});
export const reviewSchema = reviewFields.extend({
  email: z.email().max(254),
  image: z.string().max(2_800_000).optional(),
  website: z.string().max(0),
  consent: z.literal(true),
});
export type PublicReview = z.infer<typeof reviewFields> & {
  id: string;
  created_at: string;
  has_image: boolean;
};
