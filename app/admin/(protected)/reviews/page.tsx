import { requireAdminPage } from "@/lib/admin-auth";
import ReviewManager from "@/components/admin/ReviewManager";
export default async function ReviewsPage() {
  await requireAdminPage();
  return (
    <section>
      <h1>Reviews</h1>
      <p className="muted">
        Only approved reviews appear on the public website.
      </p>
      <ReviewManager />
    </section>
  );
}
