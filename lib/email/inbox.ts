import "server-only";
import { z } from "zod";
import { database } from "../database";
import { HttpError } from "../admin-security";

export const inboxJson = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export function messageId(id: string) {
  if (!z.uuid().safeParse(id).success)
    throw new HttpError(404, "Message not found.");
  return id;
}
export async function inboxMessage(id: string) {
  const { rows } = await database().query(
    `SELECT id,client_id,from_name,from_email,to_email,subject,body,source,inbox_status,is_read,received_at,delivery_status,rfc_message_id,details->>'projectType' AS service
    FROM messages WHERE id=$1 AND deleted_at IS NULL`,
    [messageId(id)],
  );
  if (!rows[0]) throw new HttpError(404, "Message not found.");
  return rows[0];
}
