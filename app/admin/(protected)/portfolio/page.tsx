import { requireAdminPage } from "@/lib/admin-auth";
import ProjectManager from "@/components/admin/ProjectManager";
export default async function PortfolioPage() {
  await requireAdminPage();
  return (
    <section>
      <ProjectManager />
    </section>
  );
}
