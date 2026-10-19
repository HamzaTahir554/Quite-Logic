import { Project } from "./models";
import { projects as concepts } from "../data/content";

type SeedProject = {
  title: string;
  source_slug: string;
  image_url: string;
  description: string;
  category: string;
  project_url: string;
};

/** Explicit migration only: never write from a public page read. */
export async function seedPortfolio(projects: SeedProject[]) {
  for (const [order, project] of projects.entries()) {
    // sourceSlug also identifies an existing concept after Admin renames its URL.
    const identity = {
      $or: [{ slug: project.source_slug }, { sourceSlug: project.source_slug }],
    };
    // Only legacy records lacking the field are opted in. Explicit Admin OFF
    // selections, published status, order, and edited content are preserved.
    await Project.updateOne(
      { ...identity, showOnHome: { $exists: false } },
      { $set: { showOnHome: true } },
    );
    await Project.updateOne(
      identity,
      {
        $setOnInsert: {
          title: project.title,
          slug: project.source_slug,
          sourceSlug: project.source_slug,
          logo: project.image_url,
          description: project.description,
          category: project.category,
          technologies:
            concepts.find((item) => item.slug === project.source_slug)
              ?.technologies || [],
          projectUrl: project.project_url,
          status: "published",
          showOnHome: true,
          order,
        },
      },
      { upsert: true, runValidators: true },
    );
  }
}
