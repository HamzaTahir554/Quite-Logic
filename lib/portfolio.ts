import { z } from "zod";
export const projectFields = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(600),
  category: z.string().trim().max(60),
  project_url: z
    .string()
    .trim()
    .max(2000)
    .refine((value) => {
      if (!value) return true;
      if (
        [
          "/portfolio/nexa-ops",
          "/portfolio/pulse-crm",
          "/portfolio/atlas-cloud",
        ].includes(value)
      )
        return true;
      try {
        const url = new URL(value);
        return (
          ["https:", "http:"].includes(url.protocol) &&
          !url.username &&
          !url.password
        );
      } catch {
        return false;
      }
    }, "Use an http(s) URL or an existing portfolio route."),
  published: z.boolean(),
});
export type ManagedProject = z.infer<typeof projectFields> & {
  id: string;
  position: number;
  image_url: string | null;
  source_slug: string | null;
  updated_at: string;
};
