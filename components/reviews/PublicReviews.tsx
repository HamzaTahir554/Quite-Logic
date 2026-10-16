import { database } from "@/lib/database";
import ReviewsSection from "./ReviewsSection";
import type { PublicReview } from "@/lib/reviews";
export default async function PublicReviews({
  full = false,
}: {
  full?: boolean;
}) {
  let initialReviews: PublicReview[] | null = null;
  try {
    const { rows } = await database().query(
      "SELECT id,name,company,role,service,rating,body,created_at,(image IS NOT NULL) AS has_image FROM reviews WHERE status='Approved' ORDER BY created_at DESC,id LIMIT 12",
    );
    initialReviews = rows.map((row) => ({
      ...row,
      created_at: new Date(row.created_at).toISOString(),
    }));
  } catch {
    /* Keep the public website available during database maintenance. */
  }
  return <ReviewsSection full={full} initialReviews={initialReviews} />;
}
