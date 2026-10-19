import type { Metadata } from "next";
import Link from "next/link";
import "./admin.css";
import AdminFeedbackProvider from "@/components/admin/AdminFeedback";
import ThemeToggle from "@/components/ui/ThemeToggle";
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminFeedbackProvider>
      <div className="admin-shell">
        <header className="admin-brand">
          <Link href="/">Quite Logic</Link>
          <span className="admin-brand-actions">
            <span>Administration</span>
            <ThemeToggle />
          </span>
        </header>
        {children}
      </div>
    </AdminFeedbackProvider>
  );
}
