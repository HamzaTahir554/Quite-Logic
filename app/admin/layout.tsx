import type { Metadata } from "next";
import Link from "next/link";
import "./admin.css";
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
    <div className="admin-shell">
      <header className="admin-brand">
        <Link href="/">Quite Logic</Link>
        <span>Administration</span>
      </header>
      {children}
    </div>
  );
}
