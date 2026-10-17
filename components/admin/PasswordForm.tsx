"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { passwordHelp, passwordPair } from "@/lib/passwords";
export default function PasswordForm({
  mode,
}: {
  mode: "forgot" | "reset" | "change";
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [token, setToken] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    if (mode === "reset") {
      const value = new URLSearchParams(location.hash.slice(1)).get("token");
      if (value) {
        setToken(value);
        history.replaceState(null, "", location.pathname);
      }
    }
  }, [mode]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    setError("");
    setMessage("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (mode !== "forgot") {
      const result = passwordPair.safeParse(values);
      if (!result.success) {
        setError(result.error.issues[0].message);
        return;
      }
      if (mode === "reset" && !token) {
        setError(
          "Open the complete reset link from your email, or request a new link.",
        );
        return;
      }
    }
    lock.current = true;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/admin/${mode === "forgot" ? "forgot-password" : mode === "reset" ? "reset-password" : "change-password"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, token }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage(data.message);
      form.reset();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "We couldn't complete that request. Please try again.",
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  const title =
    mode === "forgot"
      ? "Forgot your password?"
      : mode === "reset"
        ? "Set a new password"
        : "Change Password";
  return (
    <form
      className="ql-form glass-panel password-form"
      onSubmit={submit}
      aria-busy={busy}
    >
      <h1>{title}</h1>
      <p>
        {mode === "forgot"
          ? "Enter your admin email. We'll send a secure link if it belongs to an account."
          : passwordHelp}
      </p>
      {mode === "forgot" ? (
        <label>
          Admin email
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            maxLength={254}
          />
        </label>
      ) : (
        <>
          {mode === "change" && (
            <label>
              Current password
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                maxLength={200}
              />
            </label>
          )}
          <label>
            New password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={16}
              maxLength={200}
            />
          </label>
          <label>
            Confirm new password
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={16}
              maxLength={200}
            />
          </label>
        </>
      )}
      <button
        className="ql-button primary"
        disabled={busy || (!!message && mode !== "forgot")}
      >
        {busy
          ? "Please wait…"
          : mode === "forgot"
            ? "Send reset link"
            : mode === "reset"
              ? "Reset password"
              : "Update password"}
      </button>
      <p role="alert" className="ql-error">
        {error}
      </p>
      <p role="status" className="ql-success">
        {message}
      </p>
      <Link href="/admin/login">
        {message && mode !== "forgot"
          ? "Sign in with your new password →"
          : "Back to sign in"}
      </Link>
      {mode === "reset" && (
        <Link href="/admin/forgot-password">Request a new reset link</Link>
      )}
    </form>
  );
}
