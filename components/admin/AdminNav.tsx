"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
export default function AdminNav() {
  const path = usePathname(),
    router = useRouter();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <nav className="admin-nav" aria-label="Admin navigation">
        {[
          ["Dashboard", "/admin"],
          ["Reviews", "/admin/reviews"],
          ["Portfolio", "/admin/portfolio"],
          ["Account", "/admin/account"],
        ].map(([label, href]) => (
          <Link
            key={href}
            href={href}
            aria-current={path === href ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const response = await fetch("/api/admin/logout", {
                method: "POST",
              });
              if (!response.ok) throw new Error();
              router.replace("/admin/login");
              router.refresh();
            } catch {
              setError("Could not sign out. Please try again.");
              setBusy(false);
            }
          }}
        >
          {busy ? "Signing out…" : "Logout"}
        </button>
      </nav>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
