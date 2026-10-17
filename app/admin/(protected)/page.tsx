import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import { Project, Review } from "@/lib/models";
import AdminIcon from "@/components/admin/AdminIcon";
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
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">YOUR WORKSPACE</span>
          <h1>Dashboard</h1>
          <p className="muted">A clear view of your website. Welcome back.</p>
        </div>
        <Link
          className="admin-button is-primary"
          href="/admin/portfolio?action=new"
        >
          <AdminIcon name="Plus" />
          Add Project
        </Link>
      </div>
      <div className="admin-stats">
        {[
          [published + drafts, "Total projects", "/admin/portfolio"],
          [
            published,
            "Published projects",
            "/admin/portfolio?status=published",
          ],
          [drafts, "Draft projects", "/admin/portfolio?status=draft"],
          [pending, "Pending reviews", "/admin/reviews?status=pending"],
          [approved, "Approved reviews", "/admin/reviews?status=approved"],
        ].map(([count, label, href]) => (
          <Link key={label} href={String(href)} className="glass-panel">
            <span className="admin-stat-label">
              {label}
              <AdminIcon
                name={
                  String(label).includes("review") ? "Reviews" : "Portfolio"
                }
              />
            </span>
            <strong>{count}</strong>
            <span className="admin-stat-link">
              {String(label).startsWith("Pending")
                ? "Ready for your review"
                : "View and manage"}
              <AdminIcon name="Arrow" />
            </span>
          </Link>
        ))}
      </div>
      <div className="admin-dashboard-grid">
        <div className="admin-panel">
          <span className="admin-eyebrow">A GOOD PLACE TO START</span>
          <h2>What would you like to do?</h2>
          <div className="admin-quick-actions">
            <Link href="/admin/portfolio?action=new">
              <span className="admin-quick-icon">
                <AdminIcon name="Plus" />
              </span>
              <span>
                <strong>Add a project</strong>
                <small>Upload a logo and share your latest work.</small>
              </span>
              <AdminIcon name="Arrow" />
            </Link>
            <Link href="/admin/reviews?status=pending">
              <span className="admin-quick-icon">
                <AdminIcon name="Reviews" />
              </span>
              <span>
                <strong>Review pending reviews</strong>
                <small>
                  {pending
                    ? `${pending} ${pending === 1 ? "review is" : "reviews are"} waiting for your decision.`
                    : "You’re all caught up. New reviews will appear here."}
                </small>
              </span>
              <AdminIcon name="Arrow" />
            </Link>
          </div>
        </div>
        <div className="admin-panel admin-publishing-note">
          <span className="admin-eyebrow">YOU’RE IN CONTROL</span>
          <h2>Publish when you’re ready.</h2>
          <p>
            Save projects as drafts and preview them before sharing. Client
            reviews appear on your website only after you approve them.
          </p>
          <Link className="admin-text-link" href="/admin/account">
            Manage your account →
          </Link>
        </div>
      </div>
      <p className="small muted">Signed in as {admin.email}</p>
    </section>
  );
}
