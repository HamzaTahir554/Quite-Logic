import nextEnv from "@next/env";
import mongoose from "mongoose";
import { readFile } from "node:fs/promises";
import { connectDB } from "../lib/mongodb";
import { Project } from "../lib/models";
import { seedPortfolio } from "../lib/seed-portfolio";
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
  await seedPortfolio(projects);
  console.log(
    "Existing concepts imported. Existing MongoDB edits were preserved.",
  );
} catch {
  console.error("Import failed. Check MongoDB configuration.");
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
