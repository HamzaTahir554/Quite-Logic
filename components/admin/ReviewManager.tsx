"use client";
import Arrow from "@/components/ui/Arrow";
import { useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { apiCall, useAdminList } from "./useAdminList";
import { ListControls, Pagination } from "./ListControls";
import {
  EmptyState,
  ListError,
  ListSkeleton,
  StatusBadge,
} from "./AdminElements";
import { useAdminAction, useAdminFeedback } from "./AdminFeedback";
import { adminDate } from "./project-types";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import Avatar from "@/components/ui/Avatar";
import AvatarEditor from "@/components/ui/AvatarEditor";
type Review = {
  _id: string;
  avatarUrl?: string;
  clientName: string;
  company: string;
  role: string;
  email: string;
  service: string;
  rating: number;
  review: string;
  status: string;
  createdAt: string;
};
export default function ReviewManager() {
  const reduced = useMotionPreference();
  const list = useAdminList<Review>("reviews"),
    action = useAdminAction(),
    { confirm } = useAdminFeedback();
  const [selected, setSelected] = useState<Review | null>(null);
  async function mutate(
    review: Review,
    status: "approved" | "rejected" | "delete",
  ) {
    if (action.busy || list.loading) return;
    if (
      status !== "approved" &&
      !(await confirm({
        title:
          status === "delete" ? "Delete this review?" : "Reject this review?",
        description:
          status === "delete"
            ? `The review by ${review.clientName} will be permanently deleted. This can’t be undone.`
            : `The review by ${review.clientName} will stay private. You can approve it later if you change your mind.`,
        action: status === "delete" ? "Delete review" : "Reject review",
        danger: true,
      }))
    )
      return;
    if (
      await action.run(
        () =>
          apiCall(
            `/api/admin/reviews/${review._id}`,
            status === "delete" ? "DELETE" : "PATCH",
            status === "delete" ? undefined : { status },
          ),
        status === "approved"
          ? "Review approved. It’s now visible on your website."
          : status === "rejected"
            ? "Review rejected. It won’t appear publicly."
            : "Review deleted.",
      )
    ) {
      list.refresh();
      setSelected((current) =>
        current?._id === review._id
          ? status === "delete"
            ? null
            : { ...current, status }
          : current,
      );
    }
  }
  const disabled = action.busy || list.loading;
  function actions(review: Review) {
    return (
      <>
        <button
          className="admin-button is-primary"
          disabled={disabled || review.status === "approved"}
          onClick={() => mutate(review, "approved")}
        >
          Approve
        </button>
        <button
          className="admin-button"
          disabled={disabled || review.status === "rejected"}
          onClick={() => mutate(review, "rejected")}
        >
          Reject
        </button>
        <button
          className="admin-button is-danger-subtle"
          disabled={disabled}
          onClick={() => mutate(review, "delete")}
        >
          Delete
        </button>
      </>
    );
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">CLIENT PERSPECTIVES</span>
          <h1>Reviews</h1>
          <p className="muted">
            Read every experience. Choose which reviews appear on your website.
          </p>
        </div>
        <span className="admin-heading-note">
          Only approved reviews are public.
        </span>
      </div>
      <div className="admin-panel admin-list-panel">
        <ListControls
          {...list}
          noun="reviews"
          statuses={["pending", "approved", "rejected"]}
          disabled={action.busy}
        />
        <div className="admin-list-summary">
          <span>
            {list.total} {list.total === 1 ? "review" : "reviews"}
          </span>
          {list.loading && list.items.length > 0 && (
            <span className="small muted">Updating reviews…</span>
          )}
        </div>
        {list.error && <ListError message={list.error} retry={list.refresh} />}
        {action.error && (
          <p role="alert" className="admin-error-panel">
            {action.error}
          </p>
        )}
        {list.loading && !list.items.length ? (
          <ListSkeleton />
        ) : (
          <div className="admin-list" aria-busy={list.loading}>
            {list.items.map((review) => (
              <article
                key={review._id}
                className="admin-record admin-review-record"
              >
                <div className="admin-record-heading">
                  <div className="admin-review-identity">
                    <Avatar name={review.clientName} src={review.avatarUrl} />
                    <div>
                      <h2>{review.clientName}</h2>
                      <p>{review.company || "Independent client"}</p>
                    </div>
                  </div>
                  <StatusBadge status={review.status} />
                </div>
                <div className="admin-review-meta">
                  <span
                    className="admin-review-stars"
                    aria-label={`${review.rating} out of 5 stars`}
                  >
                    {"★".repeat(review.rating)}
                    <span aria-hidden="true">
                      {"☆".repeat(5 - review.rating)}
                    </span>
                  </span>
                  <time dateTime={review.createdAt}>
                    {adminDate(review.createdAt)}
                  </time>
                </div>
                <blockquote>
                  {review.review.length > 230
                    ? `${review.review.slice(0, 230)}…`
                    : review.review}
                </blockquote>
                <div className="admin-review-bottom">
                  <button
                    className="admin-text-link"
                    disabled={disabled}
                    onClick={() => setSelected(review)}
                  >
                    View Full Review <Arrow />
                  </button>
                  <div className="admin-actions">{actions(review)}</div>
                </div>
              </article>
            ))}
            {!list.loading && !list.items.length && !list.error && (
              <EmptyState
                title={
                  list.search || list.status
                    ? "No reviews match your filters."
                    : "No reviews yet."
                }
                description={
                  list.search || list.status
                    ? "Try another search or view all statuses."
                    : "When a client shares their experience, it will appear here for your approval."
                }
              >
                {(list.search || list.status) && (
                  <button
                    className="admin-button"
                    onClick={() => {
                      list.setSearch("");
                      list.setStatus("");
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </EmptyState>
            )}
          </div>
        )}
        <Pagination {...list} loading={list.loading || action.busy} />
      </div>
      <Dialog
        open={!!selected}
        onClose={() => {
          if (!action.busy) setSelected(null);
        }}
        fullWidth
        maxWidth="sm"
        transitionDuration={reduced ? 0 : 180}
        aria-labelledby="review-detail-title"
        slotProps={{ paper: { className: "admin-dialog" } }}
      >
        <DialogTitle id="review-detail-title">Full review</DialogTitle>
        <DialogContent>
          {selected && (
            <>
              <div className="admin-record-heading">
                <h2>{selected.clientName}</h2>
                <AvatarEditor
                  key={selected._id}
                  name={selected.clientName}
                  initialUrl={selected.avatarUrl}
                  endpoint={`/api/admin/reviews/${selected._id}/avatar`}
                />
                <StatusBadge status={selected.status} />
              </div>
              <dl className="admin-detail-list">
                <div>
                  <dt>Company</dt>
                  <dd>{selected.company || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>{selected.role || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Email · private</dt>
                  <dd>{selected.email}</dd>
                </div>
                <div>
                  <dt>Service</dt>
                  <dd>{selected.service || "Not specified"}</dd>
                </div>
                <div>
                  <dt>Rating</dt>
                  <dd>{selected.rating} out of 5</dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>{adminDate(selected.createdAt)}</dd>
                </div>
              </dl>
              <blockquote className="admin-full-review">
                {selected.review}
              </blockquote>
              {action.error && (
                <p role="alert" className="admin-error">
                  {action.error}
                </p>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <button
            className="admin-button"
            disabled={action.busy}
            autoFocus
            onClick={() => setSelected(null)}
          >
            Close review
          </button>
          {selected && actions(selected)}
        </DialogActions>
      </Dialog>
    </>
  );
}
