"use client";
import { useState } from "react";
import { apiCall, useAdminList } from "./useAdminList";
import { ListControls, Pagination } from "./ListControls";
type Review = {
  _id: string;
  clientName: string;
  company: string;
  role: string;
  email: string;
  rating: number;
  review: string;
  status: string;
  createdAt: string;
};
export default function ReviewManager() {
  const list = useAdminList<Review>("reviews");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function mutate(review: Review, action: string) {
    if (
      action === "delete" &&
      !window.confirm(
        `Delete the review by ${review.clientName}? This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    list.setError("");
    setMessage("");
    try {
      await apiCall(
        `/api/admin/reviews/${review._id}`,
        action === "delete" ? "DELETE" : "PATCH",
        action === "delete" ? undefined : { status: action },
      );
      list.refresh();
      setMessage(action === "delete" ? "Review deleted." : "Review updated.");
    } catch (error) {
      list.setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <ListControls {...list} statuses={["pending", "approved", "rejected"]} />
      {list.error && (
        <p role="alert" className="admin-error">
          {list.error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {list.loading ? (
        <p role="status">Loading reviews…</p>
      ) : (
        <div className="admin-list">
          {list.items.map((review) => (
            <article key={review._id} className="glass-panel admin-record">
              <div className="admin-record-heading">
                <h2>{review.clientName}</h2>
                <span className="admin-badge" data-status={review.status}>
                  {review.status}
                </span>
              </div>
              <p>
                {[review.role, review.company].filter(Boolean).join(" · ")} ·{" "}
                {review.rating}/5
              </p>
              <p className="small">
                {review.email} ·{" "}
                {new Date(review.createdAt).toLocaleDateString("en-US", {
                  timeZone: "UTC",
                })}
              </p>
              <blockquote>{review.review}</blockquote>
              <div className="admin-actions">
                <button
                  disabled={busy || review.status === "approved"}
                  onClick={() => mutate(review, "approved")}
                >
                  Approve
                </button>
                <button
                  disabled={busy || review.status === "rejected"}
                  onClick={() => mutate(review, "rejected")}
                >
                  Reject
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => mutate(review, "delete")}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
          {!list.items.length && <p>No reviews match your filters.</p>}
        </div>
      )}
      <Pagination {...list} />
    </>
  );
}
