import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { database } from "@/lib/database";
import {
  apiError,
  HttpError,
  rateLimit,
  readJson,
  requireAdmin,
} from "@/lib/admin-security";
import { projectFields } from "@/lib/portfolio";
import { projectColumns } from "@/lib/portfolio-store";
import { projectImage } from "@/lib/project-image";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireAdmin();
    const { rows } = await database().query(
      `SELECT ${projectColumns} FROM portfolio_projects ORDER BY position,id`,
    );
    return Response.json(
      { items: rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const input = await readJson(request, 2_850_000);
    const parsed = z
      .discriminatedUnion("action", [
        z.object({
          action: z.literal("Save"),
          id: z.uuid().optional(),
          project: projectFields,
          image: z.string().max(2_800_000).optional(),
        }),
        z.object({ action: z.literal("Delete"), id: z.uuid() }),
        z.object({
          action: z.literal("Publish"),
          id: z.uuid(),
          published: z.boolean(),
        }),
        z.object({
          action: z.literal("Reorder"),
          ids: z.array(z.uuid()).max(1000),
        }),
      ])
      .safeParse(input);
    if (!parsed.success)
      throw new HttpError(
        400,
        "Check the project title, description, URL and image.",
      );
    await rateLimit("portfolio:" + admin.id, 120);
    const data = parsed.data;
    if (data.action === "Save") {
      const image = data.image ? await projectImage(data.image) : null;
      const p = data.project;
      if (data.id) {
        const result = await database().query(
          "UPDATE portfolio_projects SET title=$2,description=$3,category=$4,project_url=$5,published=$6,image=COALESCE($7,image),updated_at=now() WHERE id=$1",
          [
            data.id,
            p.title,
            p.description,
            p.category,
            p.project_url,
            p.published,
            image,
          ],
        );
        if (!result.rowCount)
          throw new HttpError(404, "Project no longer exists.");
      } else {
        if (!image) throw new HttpError(400, "Add a project logo or image.");
        await database().query(
          "INSERT INTO portfolio_projects(id,title,description,category,project_url,published,image,position) VALUES($1,$2,$3,$4,$5,$6,$7,(SELECT COALESCE(max(position),-1)+1 FROM portfolio_projects))",
          [
            randomUUID(),
            p.title,
            p.description,
            p.category,
            p.project_url,
            p.published,
            image,
          ],
        );
      }
    } else if (data.action === "Delete") {
      const result = await database().query(
        "DELETE FROM portfolio_projects WHERE id=$1",
        [data.id],
      );
      if (!result.rowCount)
        throw new HttpError(404, "Project no longer exists.");
    } else if (data.action === "Publish") {
      const result = await database().query(
        "UPDATE portfolio_projects SET published=$2,updated_at=now() WHERE id=$1",
        [data.id, data.published],
      );
      if (!result.rowCount)
        throw new HttpError(404, "Project no longer exists.");
    } else {
      if (new Set(data.ids).size !== data.ids.length)
        throw new HttpError(400, "Each project must appear once.");
      const connection = await database().connect();
      try {
        await connection.query("BEGIN");
        await connection.query(
          "LOCK TABLE portfolio_projects IN SHARE ROW EXCLUSIVE MODE",
        );
        const current = await connection.query(
          "SELECT id FROM portfolio_projects",
        );
        if (
          current.rows.length !== data.ids.length ||
          current.rows.some((row) => !data.ids.includes(row.id))
        )
          throw new HttpError(
            409,
            "The project list changed. Reload and try again.",
          );
        await connection.query(
          "UPDATE portfolio_projects p SET position=ordered.ordinality-1 FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id,ordinality) WHERE p.id=ordered.id",
          [data.ids],
        );
        await connection.query("COMMIT");
      } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
      } finally {
        connection.release();
      }
    }
    revalidatePath("/portfolio");
    return Response.json(
      {
        message:
          data.action === "Delete" ? "Project deleted." : "Portfolio updated.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
