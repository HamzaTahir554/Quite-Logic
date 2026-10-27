import { requireAdminPage } from "@/lib/admin-auth";
import AdminNav from "@/components/admin/AdminNav";
import GmailStatusProvider from "@/components/admin/gmail/GmailStatus";
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdminPage();
  return (
    <GmailStatusProvider>
      <AdminNav email={admin.email} avatarUrl={admin.avatarUrl}>
        {children}
      </AdminNav>
    </GmailStatusProvider>
  );
}
