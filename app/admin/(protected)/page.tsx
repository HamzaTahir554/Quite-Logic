import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import { Project, Review } from "@/lib/models";
export default async function Dashboard() {
  const admin = await requireAdminPage();
  const [pending, approved, published, drafts] = await Promise.all([
    Review.countDocuments({ status: "pending" }),
    Review.countDocuments({ status: "approved" }),
    Project.countDocuments({ status: "published" }),
    Project.countDocuments({ status: "draft" }),
  ]);
  return (
    <section>
      <h1>Dashboard</h1>
      <p className="muted">Signed in as {admin.email}</p>
      <div className="admin-stats">
        {[
          [pending, "Pending reviews", "/admin/reviews"],
          [approved, "Approved reviews", "/admin/reviews"],
          [published, "Published projects", "/admin/portfolio"],
          [drafts, "Draft projects", "/admin/portfolio"],
        ].map(([count, label, href]) => (
          <Link key={label} href={String(href)} className="glass-panel">
            <strong>{count}</strong>
            <span>{label}</span>
          </Link>
        ))}
      </div>
      <p>
        Review client submissions, publish projects, and keep your account
        secure.
      </p>
    </section>
  );
}
