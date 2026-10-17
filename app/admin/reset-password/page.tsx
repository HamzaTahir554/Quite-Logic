import Link from "next/link";
import PasswordForm from "@/components/admin/PasswordForm";
export default function ResetPage() {
  return (
    <div className="admin-login">
      <Link className="admin-brand" href="/">
        Quite Logic ↗
      </Link>
      <PasswordForm mode="reset" />
    </div>
  );
}
