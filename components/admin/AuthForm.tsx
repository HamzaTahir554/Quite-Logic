"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { emailSchema, newPasswordSchema } from "@/lib/admin-validation";
import { useAdminFeedback } from "./AdminFeedback";
import { AdminRequestError, apiCall } from "./useAdminList";

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inFlight = useRef(false),
    { notify } = useAdminFeedback();
  const login = mode === "login",
    forgot = mode === "forgot-password",
    change = mode === "change-password";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (inFlight.current) return;
    const data = Object.fromEntries(new FormData(form));
    const schema = login
      ? z.object({
          email: emailSchema,
          password: z.string().min(1, "Enter your password.").max(128),
        })
      : forgot
        ? z.object({ email: emailSchema })
        : change
          ? newPasswordSchema.and(
              z.object({
                currentPassword: z
                  .string()
                  .min(1, "Enter your current password.")
                  .max(128),
              }),
            )
          : newPasswordSchema;
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      const first = form.elements.namedItem(
        String(parsed.error.issues[0].path[0]),
      );
      if (first instanceof HTMLElement) first.focus();
      return;
    }
    inFlight.current = true;
    setErrors({});
    setBusy(true);
    setMessage("");
    setSuccess(false);
    try {
      const result = await apiCall(`/api/admin/${mode}`, "POST", {
        ...parsed.data,
        ...(mode === "reset-password" ? { token } : {}),
      });
      setMessage(result.message);
      setSuccess(true);
      notify(result.message);
      form.reset();
      if (login) {
        router.replace("/admin");
        router.refresh();
      }
      if (change) router.refresh();
    } catch (error) {
      if (error instanceof AdminRequestError) setErrors(error.fields);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect. Please try again.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  function field(name: string) {
    return {
      "aria-invalid": !!errors[name],
      "aria-describedby": errors[name] ? `auth-${name}-error` : undefined,
      onChange: () => setErrors((current) => ({ ...current, [name]: "" })),
    };
  }
  function fieldError(name: string) {
    return (
      errors[name] && (
        <span id={`auth-${name}-error`} className="admin-field-error">
          {errors[name]}
        </span>
      )
    );
  }
  return (
    <form
      onSubmit={submit}
      className="admin-form"
      noValidate
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
            disabled={busy}
            {...field("email")}
          />
          {fieldError("email")}
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
            disabled={busy}
            {...field("currentPassword")}
          />
          {fieldError("currentPassword")}
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
            disabled={busy}
            {...field("password")}
          />
          {fieldError("password")}
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
              disabled={busy}
              {...field("confirmPassword")}
            />
            {fieldError("confirmPassword")}
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
        className="admin-button is-primary"
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
