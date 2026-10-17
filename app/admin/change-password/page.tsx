import { redirect } from "next/navigation";
import { adminSession } from "@/lib/admin-security";
import AdminPanel from "@/components/admin/AdminPanel";
export const dynamic = "force-dynamic";
export default async function ChangePasswordPage() {
  let admin;
  try {
    admin = await adminSession();
  } catch {
    redirect("/admin/login");
  }
  if (!admin) redirect("/admin/login");
  return <AdminPanel section="account" email={admin.email} changePassword />;
}
