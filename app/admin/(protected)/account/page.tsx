import { requireAdminPage } from "@/lib/admin-auth";
import AuthForm from "@/components/admin/AuthForm";
import AvatarEditor from "@/components/ui/AvatarEditor";
export default async function AccountPage() {
  const admin = await requireAdminPage();
  return (
    <section>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">YOUR ACCOUNT</span>
          <h1>Account</h1>
          <p className="muted">
            Keep your sign-in details safe and up to date.
          </p>
        </div>
      </div>
      <div className="admin-account-grid">
        <div className="admin-panel">
          <span className="admin-eyebrow">PROFILE</span>
          <div className="admin-account-profile">
            <AvatarEditor
              name={admin.email}
              initialUrl={admin.avatarUrl}
              endpoint="/api/admin/profile"
            />
            <div>
              <h2>Administrator</h2>
              <p>{admin.email}</p>
            </div>
          </div>
          <p className="muted">
            You can manage projects, approve client reviews, and update this
            account’s password.
          </p>
        </div>
        <div className="admin-panel">
          <h2>Change password</h2>
          <p className="muted">
            Changing your password signs out every active session.
          </p>
          <AuthForm mode="change-password" />
        </div>
      </div>
    </section>
  );
}
