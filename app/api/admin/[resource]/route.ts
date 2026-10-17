import { cookies } from "next/headers";
import { z } from "zod";
import { database } from "@/lib/database";
import {
  apiError,
  digest,
  HttpError,
  readJson,
  requireAdmin,
  sessionCookie,
} from "@/lib/admin-security";
import { reviewFields } from "@/lib/reviews";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ resource: string }> };
const json = (data: unknown) =>
  Response.json(data, { headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { resource } = await context.params;
    const params = new URL(request.url).searchParams;
    const search = "%" + (params.get("q") || "").slice(0, 150) + "%";
    const offset =
      Math.max(
        0,
        Math.min(10000, Math.floor(Number(params.get("page")) || 0)),
      ) * 25;
    if (resource === "dashboard") {
      const { rows } = await database().query(
        "SELECT (SELECT count(*) FROM reviews) AS reviews,(SELECT count(*) FROM reviews WHERE status='Pending') AS pending,(SELECT count(*) FROM clients) AS clients,(SELECT count(*) FROM messages WHERE deleted_at IS NULL AND source='contact_form') AS messages",
      );
      return json(rows[0]);
    }
    if (resource === "reviews") {
      const status = params.get("status") || "";
      if (!["", "Pending", "Approved", "Rejected"].includes(status))
        throw new HttpError(400, "Choose a valid review status.");
      const { rows } = await database().query(
        "SELECT r.id,r.name,r.company,r.role,r.service,r.rating,r.body,r.status,r.created_at,(r.image IS NOT NULL) AS has_image,c.email FROM reviews r JOIN clients c ON c.id=r.client_id WHERE ($1='' OR r.status=$1) AND (r.name ILIKE $2 OR r.company ILIKE $2 OR r.body ILIKE $2 OR c.email ILIKE $2) ORDER BY r.created_at DESC,r.id LIMIT 25 OFFSET $3",
        [status, search, offset],
      );
      return json({ items: rows });
    }
    if (resource === "clients") {
      const { rows } = await database().query(
        `SELECT c.*,
      (SELECT coalesce(json_agg(x),'[]') FROM (SELECT id,body,status,created_at FROM reviews WHERE client_id=c.id ORDER BY created_at DESC LIMIT 10) x) AS reviews,
      (SELECT coalesce(json_agg(x),'[]') FROM (SELECT id,subject,body,details,delivery_status,created_at FROM messages WHERE client_id=c.id AND deleted_at IS NULL AND source='contact_form' ORDER BY created_at DESC LIMIT 10) x) AS messages
      FROM clients c WHERE c.name ILIKE $1 OR c.email ILIKE $1 OR c.company ILIKE $1 OR c.id::text=$3 ORDER BY (c.id::text=$3) DESC,c.created_at DESC,c.id LIMIT 25 OFFSET $2`,
        [search, offset, (params.get("selected") || "").slice(0, 36)],
      );
      return json({ items: rows });
    }
    if (resource === "messages") {
      const { rows } = await database().query(
        `SELECT m.id,m.client_id,m.from_name AS name,m.from_email AS email,c.company,m.subject,m.body,m.details,m.created_at
         FROM messages m LEFT JOIN clients c ON c.id=m.client_id
         WHERE m.deleted_at IS NULL AND m.source='contact_form'
         AND (m.from_name ILIKE $1 OR m.from_email ILIKE $1 OR m.subject ILIKE $1 OR m.body ILIKE $1 OR c.company ILIKE $1)
         ORDER BY m.created_at DESC,m.id LIMIT 25 OFFSET $2`,
        [search, offset],
      );
      return json({ items: rows });
    }
    throw new HttpError(404, "Not found.");
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const { resource } = await context.params;
    await requireAdmin();
    const input = await readJson(request);
    if (resource === "logout") {
      const jar = await cookies();
      const token = jar.get(sessionCookie)?.value;
      if (token)
        await database().query(
          "DELETE FROM admin_sessions WHERE token_hash=$1",
          [digest(token)],
        );
      jar.delete(sessionCookie);
      return json({ message: "Signed out." });
    }
    if (resource === "reviews") {
      const parsed = z
        .object({
          id: z.uuid(),
          action: z.enum(["Approve", "Reject", "Edit", "Delete"]),
          review: reviewFields.optional(),
        })
        .safeParse(input);
      if (!parsed.success) throw new HttpError(400, "Check the review fields.");
      const { id, action, review } = parsed.data;
      let count = 0;
      if (action === "Delete")
        count =
          (await database().query("DELETE FROM reviews WHERE id=$1", [id]))
            .rowCount || 0;
      else if (action === "Edit") {
        if (!review) throw new HttpError(400, "Review details are required.");
        count =
          (
            await database().query(
              "UPDATE reviews SET name=$2,company=$3,role=$4,service=$5,rating=$6,body=$7,updated_at=now() WHERE id=$1",
              [
                id,
                review.name,
                review.company,
                review.role,
                review.service,
                review.rating,
                review.body,
              ],
            )
          ).rowCount || 0;
      } else
        count =
          (
            await database().query(
              "UPDATE reviews SET status=$2,updated_at=now() WHERE id=$1",
              [id, action === "Approve" ? "Approved" : "Rejected"],
            )
          ).rowCount || 0;
      if (!count) throw new HttpError(404, "Review not found.");
      return json({
        message: action === "Delete" ? "Review deleted." : "Review updated.",
      });
    }
    throw new HttpError(404, "Not found.");
  } catch (error) {
    return apiError(error);
  }
}
