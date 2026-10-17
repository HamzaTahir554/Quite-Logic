import { requireAdminPage } from "@/lib/admin-auth";
import AuthForm from "@/components/admin/AuthForm";
export default async function AccountPage() {
  const admin = await requireAdminPage();
  return (
    <section>
      <h1>Account</h1>
      <p>{admin.email}</p>
      <div className="admin-auth glass-panel">
        <h2>Change password</h2>
        <p className="muted">
          Changing your password signs out every active session.
        </p>
        <AuthForm mode="change-password" />
      </div>
    </section>
  );
}
