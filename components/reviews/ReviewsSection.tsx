"use client";
import FabricButton from "@/components/ui/FabricButton";
import type { PublicReview } from "@/lib/reviews";
import Reveal from "@/components/ui/Reveal";
import ReviewForm from "./ReviewForm";
import { useState } from "react";
import Avatar from "@/components/ui/Avatar";
import GlassReflection from "@/components/ui/GlassReflection";

export default function ReviewsSection({
  full = false,
  reviews,
  total = reviews.length,
  unavailable = false,
}: {
  full?: boolean;
  reviews: PublicReview[];
  total?: number;
  unavailable?: boolean;
}) {
  const Heading = full ? "h1" : "h2";
  const [additional, setAdditional] = useState<PublicReview[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const allReviews = [...reviews, ...additional];
  async function loadMore() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/reviews?page=${Math.floor(allReviews.length / 24) + 1}&limit=24`,
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error("Reviews could not be loaded. Please try again.");
      setAdditional((previous) => [...previous, ...data.reviews]);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }
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
            <FabricButton
              variant="secondary"
              className="ql-button"
              href="/reviews#share-review"
            >
              Share your experience
            </FabricButton>
          </div>
        </Reveal>
        <div className="reviews-grid" aria-live="polite">
          {(full ? allReviews : reviews.slice(0, 3)).map((review) => (
            <Reveal key={review.id}>
              <article
                className="review-card glass-card glass-hover"
                data-glass-light
              >
                <GlassReflection />
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
                  <Avatar name={review.name} src={review.image_url} />
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
                {unavailable
                  ? "Reviews are temporarily unavailable."
                  : "Our next chapter starts with your perspective."}
              </p>
              <span>
                Worked with Quite Logic? We&apos;d love to hear about your
                experience.
              </span>
            </div>
          )}
        </div>
        {!full && total > 3 && (
          <FabricButton
            variant="secondary"
            className="ql-button"
            href="/reviews"
          >
            Read all reviews
          </FabricButton>
        )}
        {full && allReviews.length < total && (
          <p>
            <FabricButton
              variant="secondary"
              className="ql-button"
              disabled={loading}
              onClick={loadMore}
            >
              {loading ? "Loading…" : "Load more reviews"}
            </FabricButton>
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        {full && <ReviewForm />}
      </div>
    </section>
  );
}
