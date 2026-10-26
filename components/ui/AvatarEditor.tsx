"use client";
import { useImagePreview } from "@/hooks/useImagePreview";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
export default function AvatarEditor({
  name,
  initialUrl = "",
  endpoint,
}: {
  name: string;
  initialUrl?: string;
  endpoint: string;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { file, preview, setFile, ready } = useImagePreview();
  async function save(remove = false) {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      if (file) form.set("file", file);
      const response = await fetch(endpoint, {
        method: remove ? "DELETE" : "POST",
        body: remove ? undefined : form,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Image could not be saved.");
      setUrl(result.avatarUrl || "");
      setFile(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="avatar-editor">
      <Avatar name={name} src={preview || url} />
      <label>
        {url ? "Change Image" : "Upload Image"}
        <input
          aria-label="Profile image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy || !ready}
          onChange={(e) => {
            const candidate = e.target.files?.[0];
            setError("");
            if (
              candidate &&
              (!["image/jpeg", "image/png", "image/webp"].includes(
                candidate.type,
              ) ||
                candidate.size > 2 * 1024 * 1024)
            ) {
              setError("Choose JPEG, PNG or WebP up to 2 MB.");
              return;
            }
            setFile(candidate || null);
          }}
        />
      </label>
      {file && (
        <button disabled={busy} onClick={() => save()} type="button">
          {busy ? "Saving…" : "Save Image"}
        </button>
      )}
      {(file || url) && (
        <button
          disabled={busy}
          onClick={() => (file ? setFile(null) : save(true))}
          type="button"
        >
          Remove Image
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
