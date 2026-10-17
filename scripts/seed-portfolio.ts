import nextEnv from "@next/env";
import mongoose from "mongoose";
import { readFile } from "node:fs/promises";
import { connectDB } from "../lib/mongodb";
import { Project } from "../lib/models";
nextEnv.loadEnvConfig(process.cwd());
try {
  const projects = JSON.parse(
    await readFile(new URL("../data/portfolio.json", import.meta.url), "utf8"),
  ) as {
    title: string;
    source_slug: string;
    image_url: string;
    description: string;
    category: string;
    project_url: string;
  }[];
  await connectDB();
  await Project.init();
  for (const [order, project] of projects.entries()) {
    await Project.updateOne(
      { slug: project.source_slug },
      {
        $setOnInsert: {
          title: project.title,
          slug: project.source_slug,
          sourceSlug: project.source_slug,
          logo: project.image_url,
          description: project.description,
          category: project.category,
          projectUrl: project.project_url,
          status: "published",
          order,
        },
      },
      { upsert: true, runValidators: true },
    );
  }
  console.log(
    "Existing concepts imported. Existing MongoDB edits were preserved.",
  );
} catch {
  console.error("Import failed. Check MongoDB configuration.");
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
