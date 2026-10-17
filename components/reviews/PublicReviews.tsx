import { getApprovedReviews } from "@/lib/public-data";
import ReviewsSection from "./ReviewsSection";
export default async function PublicReviews({
  full = false,
}: {
  full?: boolean;
}) {
  const { reviews, total, unavailable } = await getApprovedReviews(full);
  return (
    <ReviewsSection
      full={full}
      reviews={reviews}
      total={total}
      unavailable={unavailable}
    />
  );
}
