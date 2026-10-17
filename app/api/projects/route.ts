import { endpoint, json, pagination } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { Project } from "@/lib/models";
import { publicProject } from "@/lib/public-data";
import { publishedProjectFilter } from "@/lib/project-filters";
import { z } from "zod";
export const GET = endpoint(async (request) => {
  const { skip, limit, page } = pagination(request);
  await connectDB();
  const category = z
    .string()
    .trim()
    .max(100)
    .parse(new URL(request.url).searchParams.get("category") || "");
  const filter = publishedProjectFilter(category);
  const [records, total] = await Promise.all([
    Project.find(filter)
      .sort({ order: 1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Project.countDocuments(filter),
  ]);
  return json({ projects: records.map(publicProject), total, page, limit });
});
