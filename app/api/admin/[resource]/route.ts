import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { database } from "@/lib/database";
import {
  apiError,
  digest,
  HttpError,
  rateLimit,
  readJson,
  requireAdmin,
  sessionCookie,
} from "@/lib/admin-security";
import { reviewFields } from "@/lib/reviews";
import { gmailReady, sendGmail } from "@/lib/gmail";
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
        "SELECT (SELECT count(*) FROM reviews) AS reviews,(SELECT count(*) FROM reviews WHERE status='Pending') AS pending,(SELECT count(*) FROM clients) AS clients,(SELECT count(*) FROM messages) AS messages",
      );
      return json({ ...rows[0], gmailReady: gmailReady() });
    }
    if (resource === "reviews") {
      const status = params.get("status") || "";
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
      (SELECT coalesce(json_agg(x),'[]') FROM (SELECT id,subject,body,details,delivery_status,created_at FROM messages WHERE client_id=c.id ORDER BY created_at DESC LIMIT 10) x) AS messages
      FROM clients c WHERE c.name ILIKE $1 OR c.email ILIKE $1 OR c.company ILIKE $1 OR c.id::text=$3 ORDER BY (c.id::text=$3) DESC,c.created_at DESC,c.id LIMIT 25 OFFSET $2`,
        [search, offset, (params.get("selected") || "").slice(0, 36)],
      );
      return json({ items: rows });
    }
    if (resource === "messages") {
      const { rows } = await database().query(
        "SELECT m.*,c.name,c.email,c.company FROM messages m JOIN clients c ON c.id=m.client_id WHERE c.email ILIKE $1 OR m.body ILIKE $1 OR c.name ILIKE $1 ORDER BY m.created_at DESC,m.id LIMIT 25 OFFSET $2",
        [search, offset],
      );
      const history = await database().query(
        "SELECT id,recipient,subject,status,created_at FROM email_history ORDER BY created_at DESC,id LIMIT 25 OFFSET $1",
        [offset],
      );
      return json({
        items: rows,
        history: history.rows,
        gmailReady: gmailReady(),
      });
    }
    throw new HttpError(404, "Not found.");
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const admin = await requireAdmin();
    const input = await readJson(request);
    const { resource } = await context.params;
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
    if (resource === "email") {
      const parsed = z
        .object({
          clientId: z.uuid(),
          subject: z
            .string()
            .trim()
            .min(1)
            .max(180)
            .regex(/^[^\r\n]+$/),
          body: z.string().trim().min(1).max(5000),
        })
        .safeParse(input);
      if (!parsed.success)
        throw new HttpError(
          400,
          "Choose a client and enter a subject and message.",
        );
      if (!gmailReady())
        throw new HttpError(503, "Gmail sending is not configured yet.");
      await rateLimit("admin:email:" + admin.id, 30, 3600);
      const { rows } = await database().query(
        "SELECT email FROM clients WHERE id=$1",
        [parsed.data.clientId],
      );
      if (!rows[0]) throw new HttpError(404, "Client not found.");
      const id = randomUUID();
      await database().query(
        "INSERT INTO email_history(id,client_id,admin_id,recipient,subject,body) VALUES($1,$2,$3,$4,$5,$6)",
        [
          id,
          parsed.data.clientId,
          admin.id,
          rows[0].email,
          parsed.data.subject,
          parsed.data.body,
        ],
      );
      try {
        await sendGmail(rows[0].email, parsed.data.subject, parsed.data.body);
      } catch {
        await database().query(
          "UPDATE email_history SET status='Failed' WHERE id=$1",
          [id],
        );
        throw new HttpError(
          502,
          "Email could not be confirmed as sent. Check Gmail settings and history before retrying.",
        );
      }
      await database().query(
        "UPDATE email_history SET status='Sent' WHERE id=$1",
        [id],
      );
      return json({ message: "Email sent." });
    }
    throw new HttpError(404, "Not found.");
  } catch (error) {
    return apiError(error);
  }
}
