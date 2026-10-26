"use client";
import { useImagePreview } from "@/hooks/useImagePreview";
import FabricButton from "@/components/ui/FabricButton";
import { useState } from "react";
import Avatar from "@/components/ui/Avatar";
export default function ReviewForm() {
  const { file, preview, setFile, ready } = useImagePreview();

  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [success, setSuccess] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setMessage("");
    setSuccess(false);
    try {
      const data = new FormData(form);
      if (file) data.set("profileImage", file);
      const response = await fetch("/api/reviews", {
        method: "POST",
        body: data,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Please try again.");
      setMessage(result.message);
      setSuccess(true);
      form.reset();
      setFile(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section id="share-review" className="glass-panel review-submission">
      <h2>Share your experience.</h2>
      <p>Your email stays private. Reviews appear after approval.</p>
      <form className="review-form" onSubmit={submit}>
        <div className="avatar-editor">
          <Avatar name="Your profile" src={preview} />
          <label>
            Profile image (optional)
            <input
              type="file"
              disabled={!ready || busy}
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const candidate = event.target.files?.[0];
                if (
                  candidate &&
                  (!["image/jpeg", "image/png", "image/webp"].includes(
                    candidate.type,
                  ) ||
                    candidate.size > 2 * 1024 * 1024)
                ) {
                  setMessage("Choose JPEG, PNG or WebP up to 2 MB.");
                  return;
                }
                setFile(candidate || null);
              }}
            />
          </label>
          {file && (
            <button type="button" onClick={() => setFile(null)}>
              Remove Image
            </button>
          )}
        </div>
        <label>
          <input type="checkbox" name="useGravatar" /> Use my public Gravatar
          photo if available. This shares an email hash with Gravatar; your
          email stays private.
        </label>
        <div className="review-form-grid">
          <label>
            Your name
            <input
              name="clientName"
              autoComplete="name"
              minLength={2}
              maxLength={100}
              required
            />
          </label>
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>
          <label>
            Company
            <input name="company" autoComplete="organization" maxLength={150} />
          </label>
          <label>
            Role
            <input
              name="role"
              autoComplete="organization-title"
              maxLength={100}
            />
          </label>
          <label>
            Service
            <input name="service" maxLength={100} />
          </label>
          <label>
            Rating
            <select name="rating" defaultValue="5">
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>
                  {rating} out of 5
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Your review
          <textarea
            name="review"
            minLength={20}
            maxLength={5000}
            rows={5}
            required
          />
        </label>
        <div className="honeypot" aria-hidden="true">
          <label>
            Leave this empty
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        {message && <p role={success ? "status" : "alert"}>{message}</p>}
        <FabricButton type="submit" className="ql-button" disabled={busy}>
          {busy ? "Submitting…" : "Submit for approval"}
        </FabricButton>
      </form>
    </section>
  );
}
