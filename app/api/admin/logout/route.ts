import { endpoint, checkOrigin, json } from "@/lib/api";
import { deleteSession } from "@/lib/admin-auth";
export const POST = endpoint(async (request) => {
  checkOrigin(request);
  await deleteSession();
  return json({ message: "Signed out." });
});
