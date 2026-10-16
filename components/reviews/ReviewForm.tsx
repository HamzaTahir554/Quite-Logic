"use client";
import { useRef, useState } from "react";
import { reviewServices } from "@/lib/reviews";
export default function ReviewForm() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [success, setSuccess] = useState(false);
  const lock = useRef(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    setSuccess(false);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const file = data.get("profile") as File;
      let image: string | undefined;
      if (file?.size) {
        if (
          file.size > 2_000_000 ||
          !["image/png", "image/jpeg", "image/webp"].includes(file.type)
        )
          throw new Error(
            "Choose a PNG, JPEG, or WebP image smaller than 2 MB.",
          );
        image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Image could not be read."));
          reader.readAsDataURL(file);
        });
      }
      const payload = {
        name: data.get("name"),
        email: data.get("email"),
        company: data.get("company"),
        role: data.get("role"),
        service: data.get("service"),
        rating: Number(data.get("rating")),
        body: data.get("body"),
        website: data.get("website"),
        consent: data.get("consent") === "on",
        image,
      };
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setMessage(result.message);
      setSuccess(true);
      form.reset();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not submit your review. Please try again.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="review-submit container" id="submit-review">
      <div>
        <span className="eyebrow">YOUR EXPERIENCE MATTERS</span>
        <h2>Tell us how it felt.</h2>
        <p>
          Share an honest review of your project. Your email stays private, and
          every submission is reviewed before publication.
        </p>
      </div>
      <form className="ql-form glass-panel" onSubmit={submit} aria-busy={busy}>
        <div className="ql-form-grid">
          <label>
            Your name
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
            />
          </label>
          <label>
            Email (private)
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <label>
            Company
            <input name="company" autoComplete="organization" maxLength={150} />
          </label>
          <label>
            Role / title
            <input
              name="role"
              autoComplete="organization-title"
              maxLength={100}
            />
          </label>
          <label>
            Service
            <select name="service" aria-label="Service" required>
              <option value="">Select a service</option>
              {reviewServices.map((service) => (
                <option key={service}>{service}</option>
              ))}
            </select>
          </label>
          <label>
            Rating
            <select name="rating" defaultValue="5" required>
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>
                  {rating} out of 5
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Profile image or logo (optional)
          <input
            name="profile"
            type="file"
            accept="image/png,image/jpeg,image/webp"
          />
          <small>PNG, JPEG or WebP. Up to 2 MB and 16 megapixels.</small>
        </label>
        <label>
          Your review
          <textarea
            name="body"
            aria-label="Your review"
            rows={5}
            required
            minLength={20}
            maxLength={3000}
          />
          <small>20–3,000 characters.</small>
        </label>
        <label className="ql-honeypot" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        <label className="ql-check">
          <input name="consent" type="checkbox" required />I agree to
          publication of this review, name, company and image after approval.
        </label>
        <button type="submit" className="ql-button primary" disabled={busy}>
          {busy ? "Submitting…" : "Submit for approval"}
          <span aria-hidden="true">↗</span>
        </button>
        <p
          role={success ? "status" : "alert"}
          className={success ? "ql-success" : "ql-error"}
        >
          {message}
        </p>
      </form>
    </section>
  );
}
