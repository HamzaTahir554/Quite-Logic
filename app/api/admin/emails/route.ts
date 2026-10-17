import { database } from "@/lib/database";
import {
  apiError,
  HttpError,
  readJson,
  requireAdmin,
} from "@/lib/admin-security";
import { emailReady } from "@/lib/email/config";
import { inboxJson } from "@/lib/email/inbox";
import { composeSchema } from "@/lib/email/validation";
import { sendRecordedEmail } from "@/lib/email/outbound";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const page = Math.min(
      10000,
      Math.max(0, Math.floor(Number(params.get("page")) || 0)),
    );
    const status = params.get("status") || "";
    const read = params.get("read") || "";
    if (
      !["", "inbox", "replied", "archived"].includes(status) ||
      !["", "read", "unread"].includes(read)
    )
      throw new HttpError(400, "Choose a valid inbox filter.");
    const q = "%" + (params.get("q") || "").slice(0, 150) + "%";
    const values = [status, read, q];
    const where = `deleted_at IS NULL AND ($1='' OR inbox_status=$1) AND ($2='' OR is_read=($2='read')) AND (from_name ILIKE $3 OR from_email ILIKE $3 OR subject ILIKE $3)`;
    const result = await database().query(
      `SELECT id,from_name,from_email,subject,left(body,180) AS preview,received_at,inbox_status,is_read,source,delivery_status FROM messages WHERE ${where} ORDER BY received_at DESC,id LIMIT 25 OFFSET $4`,
      [...values, page * 25],
    );
    const count = await database().query(
      `SELECT count(*) AS total FROM messages WHERE ${where}`,
      values,
    );
    const history = await database().query(
      "SELECT id,recipient,subject,status,created_at,sent_at FROM email_history ORDER BY created_at DESC,id LIMIT 25 OFFSET $1",
      [page * 25],
    );
    return inboxJson({
      items: result.rows,
      total: Number(count.rows[0].total),
      page,
      emailReady: emailReady(),
      history: history.rows,
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const input = composeSchema.safeParse(await readJson(request, 48000));
    if (!input.success)
      throw new HttpError(400, "Enter a valid recipient, subject and message.");
    let to = input.data.to?.toLowerCase();
    if (input.data.clientId) {
      const { rows } = await database().query(
        "SELECT email FROM clients WHERE id=$1",
        [input.data.clientId],
      );
      if (!rows[0]) throw new HttpError(404, "Client not found.");
      to = rows[0].email;
    }
    await sendRecordedEmail({
      adminId: admin.id,
      to: to!,
      clientId: input.data.clientId,
      subject: input.data.subject,
      body: input.data.body,
      requestKey: request.headers.get("idempotency-key")?.slice(0, 100),
    });
    return inboxJson({ message: "Email sent." });
  } catch (error) {
    return apiError(error);
  }
}
