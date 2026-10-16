"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicReview } from "@/lib/reviews";
import Reveal from "@/components/ui/Reveal";

export default function ReviewsSection({
  full = false,
  initialReviews,
}: {
  full?: boolean;
  initialReviews: PublicReview[] | null;
}) {
  const [reviews, setReviews] = useState<PublicReview[]>(initialReviews || []);
  const [state, setState] = useState(initialReviews ? "ready" : "error");
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(initialReviews?.length === 12);
  const Heading = full ? "h1" : "h2";
  useEffect(() => {
    if (page === 0) return;
    const controller = new AbortController();
    fetch(`/api/reviews?page=${page}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        setReviews((previous) =>
          page ? [...previous, ...data.reviews] : data.reviews,
        );
        setMore(data.reviews.length === 12);
        setState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("error");
      });
    return () => controller.abort();
  }, [page]);
  return (
    <section
      className="reviews-section section"
      aria-labelledby="reviews-title"
    >
      <div className="container">
        <Reveal>
          <div className="reviews-heading">
            <div>
              <span className="eyebrow">CLIENT PERSPECTIVES</span>
              <Heading id="reviews-title">
                Good work. <span>In their words.</span>
              </Heading>
              <p>Experiences shared by the people we build with.</p>
            </div>
            <Link className="ql-button" href="/reviews#submit-review">
              Submit a Review <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </Reveal>
        <div
          className="reviews-grid"
          aria-live="polite"
          aria-busy={state === "loading"}
        >
          {(full ? reviews : reviews.slice(0, 3)).map((review) => (
            <Reveal key={review.id}>
              <article className="review-card glass-panel">
                <div className="review-top">
                  <span className="review-service">{review.service}</span>
                  <span
                    className="review-rating"
                    aria-label={`${review.rating} out of 5 stars`}
                  >
                    {"★".repeat(review.rating)}
                    <span aria-hidden="true">
                      {"☆".repeat(5 - review.rating)}
                    </span>
                  </span>
                </div>
                <blockquote>{review.body}</blockquote>
                <div className="review-person">
                  {review.has_image ? (
                    <img
                      src={`/api/review-images/${review.id}`}
                      alt=""
                      width={48}
                      height={48}
                      loading="lazy"
                    />
                  ) : (
                    <span className="review-initial" aria-hidden="true">
                      {review.name.slice(0, 1)}
                    </span>
                  )}
                  <div>
                    <h3>{review.name}</h3>
                    <p>
                      {[review.role, review.company]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
                <time dateTime={review.created_at}>
                  {new Date(review.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </time>
              </article>
            </Reveal>
          ))}
          {reviews.length === 0 && (
            <div className="review-empty glass-panel">
              <p>
                {state === "loading"
                  ? "Loading client perspectives…"
                  : state === "error"
                    ? "Client reviews are temporarily unavailable. Please check back soon."
                    : "Our next chapter starts with your perspective."}
              </p>
              <span>
                {state === "ready"
                  ? "Worked with Quite Logic? Share your experience. Reviews appear after approval."
                  : "We publish client reviews only after approval."}
              </span>
            </div>
          )}
        </div>
        {full && more && (
          <button
            className="ql-button"
            disabled={state === "loading"}
            onClick={() => {
              setState("loading");
              setPage((value) => value + 1);
            }}
          >
            Load more reviews
          </button>
        )}
        {!full && reviews.length > 3 && (
          <Link className="ql-button" href="/reviews">
            Read all reviews ↗
          </Link>
        )}
      </div>
    </section>
  );
}
