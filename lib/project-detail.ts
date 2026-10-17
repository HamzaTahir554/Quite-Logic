import "server-only";
import { cache } from "react";
import { connectDB } from "./mongodb";
import { Project } from "./models";
export const getProjectDetail = cache(async (slug: string) => {
  if (!process.env.MONGODB_URI) return null;
  await connectDB();
  return Project.findOne({ slug, status: "published" }).lean();
});
