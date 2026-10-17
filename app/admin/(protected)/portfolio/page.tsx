import { requireAdminPage } from "@/lib/admin-auth";
import ProjectManager from "@/components/admin/ProjectManager";
export default async function PortfolioPage() {
  await requireAdminPage();
  return (
    <section>
      <h1>Portfolio</h1>
      <p className="muted">
        Create drafts, set their display order, and publish when ready.
      </p>
      <ProjectManager />
    </section>
  );
}
