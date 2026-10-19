"use client";
import { useState, useRef, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Alert, Button, MenuItem, TextField } from "@mui/material";
import BrandText from "@/components/ui/BrandText";
import { contactEmail } from "@/lib/company";
import {
  budgets,
  contactSchema,
  projectTypes,
  type ContactInput,
} from "@/lib/contact";
export default function ContactForm() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const reduced = useReducedMotion();
  const revealed = useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const inFlight = useRef(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || status === "success") return;
    const form = event.currentTarget;
    const parsed = contactSchema.safeParse(
      Object.fromEntries(new FormData(form)),
    );
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        nextErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(nextErrors);
      const first = form.elements.namedItem(
        String(parsed.error.issues[0].path[0]),
      );
      if (first instanceof HTMLElement) first.focus();
      return;
    }
    setErrors({});
    inFlight.current = true;
    const controller = new AbortController();
    pending.current = controller;
    setStatus("loading");
    setMessage("Sending your message…");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
        signal: controller.signal,
      });
      const result = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        if (result.fields) setErrors(result.fields);
        setStatus("error");
        setMessage(
          result.error || "We couldn’t send your message. Please try again.",
        );
        return;
      }
      setStatus("success");
      setMessage("Your message has been submitted. We’ll reply to your email.");
    } catch {
      if (controller.signal.aborted) return;
      setStatus("error");
      setMessage(
        "We couldn’t confirm your submission. Please try again, or email us directly.",
      );
    } finally {
      inFlight.current = false;
      if (pending.current === controller) pending.current = null;
    }
  }
  function field(name: keyof ContactInput) {
    return {
      name,
      disabled: status === "loading",
      error: !!errors[name],
      helperText: errors[name],
      onChange: () => {
        setStatus("idle");
        setMessage("");
        if (errors[name]) setErrors((old) => ({ ...old, [name]: "" }));
      },
    };
  }
  return (
    <motion.form
      id="message-form"
      initial={false}
      onViewportEnter={(entry) => {
        if (!entry || reduced || revealed.current) return;
        revealed.current = true;
        entry.target
          .querySelectorAll(".MuiFormControl-root")
          .forEach((field, i) =>
            field.animate(
              [
                {
                  opacity: 0.2,
                  transform: "translateY(20px)",
                  clipPath: "inset(0 0 40% 0)",
                },
                {
                  opacity: 1,
                  transform: "translateY(0)",
                  clipPath: "inset(0 0 0% 0)",
                },
              ],
              {
                duration: 380,
                delay: Math.min(i * 15, 80),
                easing: "ease-out",
              },
            ),
          );
      }}
      onInputCapture={(event) => {
        if (inFlight.current) return;
        setStatus("idle");
        setMessage("");
        const target = event.target;
        if (!(
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement
        ))
          return;
        target.dataset.filled = String(!!target.value);
        const control = target.closest<HTMLElement>(".MuiFormControl-root");
        const name = target.name as keyof ContactInput;
        const validator = contactSchema.shape[name];
        if (control && validator)
          control.dataset.state = target.value
            ? validator.safeParse(target.value).success
              ? "valid"
              : "editing"
            : "empty";
      }}
      onSubmit={submit}
      noValidate
      className="contact-form"
      aria-label="Project inquiry"
      data-status={status}
      aria-busy={status === "loading"}
    >
      <div className="form-grid">
        <TextField
          label="Your name"
          required
          autoComplete="name"
          {...field("name")}
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />
        <TextField
          label="Email address"
          type="email"
          required
          autoComplete="email"
          {...field("email")}
        />
        <TextField
          label="Company"
          autoComplete="organization"
          {...field("company")}
        />
        <TextField
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          {...field("phone")}
        />
        <TextField
          label="Project type"
          select
          defaultValue="Other"
          {...field("projectType")}
        >
          {projectTypes.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Budget range"
          select
          defaultValue="Let’s discuss"
          {...field("budget")}
        >
          {budgets.map((b) => (
            <MenuItem key={b} value={b}>
              {b}
            </MenuItem>
          ))}
        </TextField>
      </div>
      <TextField
        label="Subject (optional)"
        {...field("subject")}
        slotProps={{ htmlInput: { maxLength: 180 } }}
      />
      <TextField
        label="Tell us about your project"
        required
        multiline
        minRows={5}
        {...field("description")}
        slotProps={{ htmlInput: { maxLength: 5000 } }}
      />
      <div className="honeypot" aria-hidden="true">
        <label>
          Leave this empty
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="small muted">
        Send your inquiry directly to our inbox. Please avoid passwords or
        confidential data.
      </p>
      <p className="small">
        Prefer email? <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
      </p>
      <Button
        variant="contained"
        type="submit"
        disabled={!ready || status === "loading" || status === "success"}
        className="submit-button"
      >
        {status === "loading"
          ? "Sending…"
          : status === "success"
            ? "Message submitted"
            : "Send Message"}
      </Button>
      <div className="contact-feedback" aria-live="polite" aria-atomic="true">
        {message && (
          <Alert
            severity={
              status === "error"
                ? "error"
                : status === "success"
                  ? "success"
                  : "info"
            }
          >
            <BrandText>{message}</BrandText>
          </Alert>
        )}
      </div>
    </motion.form>
  );
}
