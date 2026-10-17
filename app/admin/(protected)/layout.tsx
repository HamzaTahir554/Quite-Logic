import { requireAdminPage } from "@/lib/admin-auth";
import AdminNav from "@/components/admin/AdminNav";
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();
  return (
    <>
      <AdminNav />
      {children}
    </>
  );
}
