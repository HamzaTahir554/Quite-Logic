import { endpoint, ApiError, json, rateLimit } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { maxUploadBytes, storeLogo } from "@/lib/project-storage";
export const POST = endpoint(async (request) => {
  const admin = await requireAdmin(request);
  await rateLimit(`upload:${admin._id}`, 60, 3600);
  // Bound the streamed request before invoking the multipart parser.
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Choose a logo.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxUploadBytes + 65536) {
      await reader.cancel();
      throw new ApiError(413, "Logo must be at most 2 MB.");
    }
    chunks.push(value);
  }
  let form: FormData;
  try {
    form = await new Request(request.url, {
      method: "POST",
      headers: { "content-type": request.headers.get("content-type") || "" },
      body: Buffer.concat(chunks),
    }).formData();
  } catch {
    throw new ApiError(400, "Invalid upload.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Choose a logo.");
  const logo = await storeLogo(
    Buffer.from(await file.arrayBuffer()),
    file.type,
    admin._id,
  );
  return json({ logo }, 201);
});
