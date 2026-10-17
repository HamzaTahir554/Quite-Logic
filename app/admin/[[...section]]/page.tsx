import { redirect, notFound } from "next/navigation";
import { adminSession } from "@/lib/admin-security";
import AdminPanel from "@/components/admin/AdminPanel";
export const dynamic = "force-dynamic";
export default async function AdminPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  let session;
  try {
    session = await adminSession();
  } catch {
    redirect("/admin/login?unavailable=1");
  }
  if (!session) redirect("/admin/login");
  const { section } = await params;
  const active = section?.[0] || "dashboard";
  if (active === "inbox" && section?.length === 1) redirect("/admin/messages");
  if (
    (section?.length || 0) > 1 ||
    ![
      "dashboard",
      "reviews",
      "portfolio",
      "clients",
      "messages",
      "account",
    ].includes(active)
  )
    notFound();
  return <AdminPanel key={active} section={active} email={session.email} />;
}
