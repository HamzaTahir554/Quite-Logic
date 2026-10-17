import { requireAdminPage } from "@/lib/admin-auth";
import AdminNav from "@/components/admin/AdminNav";
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdminPage();
  return <AdminNav email={admin.email}>{children}</AdminNav>;
}
