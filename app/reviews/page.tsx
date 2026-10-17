import ReviewsSection from "@/components/reviews/PublicReviews";
import { pageMetadata } from "@/lib/seo";
export const dynamic = "force-dynamic";
export const metadata = pageMetadata(
  "Client Reviews",
  "Client experiences and perspectives on working with Quite Logic.",
  "/reviews",
);
export default function ReviewsPage() {
  return (
    <div className="reviews-page">
      <ReviewsSection full />
    </div>
  );
}
