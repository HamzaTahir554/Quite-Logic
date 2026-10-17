"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function AdminLogin() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      router.replace("/admin");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Sign-in failed. Please try again.",
      );
      setBusy(false);
    }
  }
  return (
    <div className="admin-login">
      <Link href="/" className="admin-brand">
        Quite Logic <span>↗</span>
      </Link>
      <form className="ql-form glass-panel" onSubmit={submit}>
        <span className="eyebrow">PRIVATE WORKSPACE</span>
        <h1>Welcome back.</h1>
        <p>Sign in to manage your client relationships.</p>
        <label>
          Admin email
          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            maxLength={254}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            maxLength={200}
          />
        </label>
        <button className="ql-button primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p role="alert" className="ql-error">
          {error}
        </p>
        <Link href="/admin/forgot-password">Forgot password?</Link>
      </form>
    </div>
  );
}
