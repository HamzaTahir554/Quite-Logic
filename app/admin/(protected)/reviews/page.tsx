import { requireAdminPage } from "@/lib/admin-auth";
import ReviewManager from "@/components/admin/ReviewManager";
export default async function ReviewsPage() {
  await requireAdminPage();
  return (
    <section>
      <ReviewManager />
    </section>
  );
}
