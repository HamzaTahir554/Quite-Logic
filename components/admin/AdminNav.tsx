"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Drawer } from "@mui/material";
import AdminIcon from "./AdminIcon";
import { useAdminAction, useAdminFeedback } from "./AdminFeedback";
import { apiCall } from "./useAdminList";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { motion } from "framer-motion";

const sections = [
  ["Dashboard", "/admin"],
  ["Reviews", "/admin/reviews"],
  ["Portfolio", "/admin/portfolio"],
  ["Social Links", "/admin/settings"],
  ["Account", "/admin/account"],
];
export default function AdminNav({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const path = usePathname(),
    router = useRouter();
  const reduced = useMotionPreference();
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const action = useAdminAction(),
    { confirm, hasUnsavedChanges } = useAdminFeedback();
  const current =
    sections.find(([, href]) =>
      href === "/admin" ? path === href : path.startsWith(href),
    )?.[0] || "Dashboard";
  async function logout() {
    if (
      action.busy ||
      !(await confirm({
        title: "Sign out?",
        description: hasUnsavedChanges()
          ? "You have unsaved changes. Signing out will discard them."
          : "Make sure your work is saved before signing out.",
        action: "Sign out",
      }))
    )
      return;
    if (
      await action.run(
        () => apiCall("/api/admin/logout", "POST"),
        "You’ve been signed out.",
      )
    ) {
      router.replace("/admin/login");
      router.refresh();
    }
  }
  function sidebar(mobile = false) {
    return (
      <>
        <div className="admin-sidebar-brand">
          <Link href="/admin" onClick={() => setDrawerPath(null)}>
            <Image src="/logo/icon.png" alt="" width={34} height={34} />
            <span>
              Quite Logic<small>TEAM WORKSPACE</small>
            </span>
          </Link>
          {mobile && (
            <button
              className="admin-icon-button"
              aria-label="Close navigation"
              onClick={() => setDrawerPath(null)}
            >
              <AdminIcon name="Close" />
            </button>
          )}
        </div>
        <p className="admin-nav-label">Manage your website</p>
        <nav className="admin-nav" aria-label="Admin navigation">
          {sections.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={current === label ? "page" : undefined}
              onClick={() => setDrawerPath(null)}
            >
              {current === label && (
                <motion.span
                  className="admin-active-background"
                  layoutId={
                    mobile ? "admin-mobile-active" : "admin-desktop-active"
                  }
                  transition={{ duration: reduced ? 0 : 0.2 }}
                />
              )}
              <AdminIcon name={label} />
              <span>{label}</span>
              {current === label && (
                <span className="admin-active-dot" aria-hidden="true" />
              )}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <p>
            Thoughtful work.
            <br />A clear place to manage it.
          </p>
          <button
            className="admin-logout"
            disabled={action.busy}
            onClick={logout}
          >
            <AdminIcon name="Logout" />
            {action.busy ? "Signing out…" : "Logout"}
          </button>
        </div>
      </>
    );
  }
  return (
    <div className="admin-workspace">
      <a className="admin-skip" href="#admin-content">
        Skip to workspace content
      </a>
      <aside className="admin-sidebar">{sidebar()}</aside>
      <Drawer
        open={drawerPath === path}
        onClose={() => setDrawerPath(null)}
        transitionDuration={reduced ? 0 : 200}
        slotProps={{
          paper: { className: "admin-sidebar admin-mobile-sidebar" },
        }}
      >
        <div className="admin-drawer-content">{sidebar(true)}</div>
      </Drawer>
      <div className="admin-main-column">
        <header className="admin-topbar">
          <div className="admin-topbar-title">
            <button
              className="admin-icon-button admin-menu-button"
              aria-label="Open admin navigation"
              aria-expanded={drawerPath === path}
              onClick={() => setDrawerPath(path)}
            >
              <AdminIcon name="Menu" />
            </button>
            <span className="admin-breadcrumb">
              Workspace <span aria-hidden="true">/</span>{" "}
              <strong>{current}</strong>
            </span>
          </div>
          <div className="admin-topbar-account">
            <span className="admin-account-avatar" aria-hidden="true">
              {email.slice(0, 1).toUpperCase()}
            </span>
            <span>
              {email}
              <small>Administrator</small>
            </span>
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="admin-view-site"
            >
              View website ↗
            </Link>
          </div>
        </header>
        <div className="admin-content" id="admin-content" tabIndex={-1}>
          {action.error && (
            <p role="alert" className="admin-error">
              {action.error}
            </p>
          )}
          <div key={path} className="admin-page-transition">
            {children}
          </div>
        </div>
        <footer className="admin-workspace-footer">
          <span>Quite Logic · Your website, thoughtfully managed.</span>
          <Link href="/" target="_blank" rel="noopener noreferrer">
            Open website ↗
          </Link>
        </footer>
      </div>
    </div>
  );
}
