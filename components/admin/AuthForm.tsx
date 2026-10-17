"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AuthForm({
  mode,
  token = "",
}: {
  mode: "login" | "forgot-password" | "reset-password" | "change-password";
  token?: string;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [success, setSuccess] = useState(false);
  const router = useRouter();
  const login = mode === "login",
    forgot = mode === "forgot-password",
    change = mode === "change-password";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setMessage("");
    setSuccess(false);
    try {
      const data = Object.fromEntries(new FormData(form));
      const response = await fetch(`/api/admin/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          ...(mode === "reset-password" ? { token } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Please try again.");
      setMessage(result.message);
      setSuccess(true);
      form.reset();
      if (login) {
        router.replace("/admin");
        router.refresh();
      }
      if (change) router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="admin-form"
      aria-label={change ? "Change password" : mode.replaceAll("-", " ")}
    >
      {(login || forgot) && (
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="username"
            maxLength={254}
            required
          />
        </label>
      )}
      {change && (
        <label>
          Current password
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            required
          />
        </label>
      )}
      {!forgot && (
        <label>
          {login ? "Password" : "New password"}
          <input
            name="password"
            type="password"
            autoComplete={login ? "current-password" : "new-password"}
            minLength={login ? 1 : 12}
            maxLength={128}
            required
          />
        </label>
      )}
      {!login && !forgot && (
        <>
          <label>
            Confirm new password
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          <p className="small muted">
            Use 12–128 characters, including uppercase and lowercase letters, a
            number, and a symbol.
          </p>
        </>
      )}
      {message && (
        <p
          role={success ? "status" : "alert"}
          className={success ? "admin-success" : "admin-error"}
        >
          {message}
        </p>
      )}
      <button
        className="button primary"
        disabled={busy || (mode === "reset-password" && !token)}
      >
        {busy
          ? "Please wait…"
          : login
            ? "Sign in"
            : forgot
              ? "Send reset link"
              : change
                ? "Change password"
                : "Reset password"}
      </button>
      {login ? (
        <Link href="/admin/forgot-password">Forgot password?</Link>
      ) : (
        <Link href="/admin/login">Back to sign in</Link>
      )}
    </form>
  );
}
