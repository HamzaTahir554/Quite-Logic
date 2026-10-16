import ReviewsSection from "@/components/reviews/PublicReviews";
import ReviewForm from "@/components/reviews/ReviewForm";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Client Reviews",
  "Client experiences with Quite Logic. Read approved reviews or share your project experience.",
  "/reviews",
);
export const dynamic = "force-dynamic";
export default function ReviewsPage() {
  return (
    <div className="reviews-page">
      <ReviewsSection full />
      <ReviewForm />
    </div>
  );
}
