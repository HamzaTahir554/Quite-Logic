import "server-only";
import { database } from "./database";
import type { ManagedProject } from "./portfolio";
export const projectColumns =
  "id,title,description,category,project_url,published,position,source_slug,updated_at,CASE WHEN image IS NOT NULL THEN '/api/portfolio-images/'||id::text ELSE image_path END AS image_url";
export async function publicProjects(): Promise<ManagedProject[]> {
  const { rows } = await database().query(
    `SELECT ${projectColumns} FROM portfolio_projects WHERE published=true ORDER BY position,id`,
  );
  return rows.map((row) => ({
    ...row,
    updated_at: new Date(row.updated_at).toISOString(),
  }));
}
