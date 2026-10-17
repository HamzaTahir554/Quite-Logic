"use client";
import { useState } from "react";
export default function ReviewForm() {
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
      const data = Object.fromEntries(new FormData(form));
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, rating: Number(data.rating) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Please try again.");
      setMessage(result.message);
      setSuccess(true);
      form.reset();
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
        <button className="ql-button" disabled={busy}>
          {busy ? "Submitting…" : "Submit for approval"}
        </button>
      </form>
    </section>
  );
}
