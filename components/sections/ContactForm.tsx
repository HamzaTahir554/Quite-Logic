"use client";
import { useState, useRef, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Alert, Button, MenuItem, TextField } from "@mui/material";
import BrandText from "@/components/ui/BrandText";
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
  const [message, setMessage] = useState("");
  const [formVersion, setFormVersion] = useState(0);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const parsed = contactSchema.safeParse(values);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        nextErrors[String(i.path[0])] = i.message;
      });
      setErrors(nextErrors);
      const first = form.elements.namedItem(
        String(parsed.error.issues[0].path[0]),
      );
      if (first instanceof HTMLElement) first.focus();
      return;
    }
    setErrors({});
    setStatus("loading");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data: { message: string } = await response.json();
      if (!response.ok) throw new Error(data.message);
      setStatus("success");
      setMessage(data.message);
      form.reset();
      setFormVersion((value) => value + 1);
    } catch (e) {
      setStatus("error");
      setMessage(
        e instanceof Error
          ? e.message
          : "Unable to send your message. Please try again.",
      );
    }
  }
  function field(name: keyof ContactInput) {
    return {
      name,
      error: !!errors[name],
      helperText: errors[name],
      onChange: () => {
        if (errors[name]) setErrors((old) => ({ ...old, [name]: "" }));
      },
    };
  }
  return (
    <motion.form
      id="message-form"
      key={formVersion}
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
      aria-busy={status === "loading"}
      data-status={status}
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
          required
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
          required
          defaultValue=""
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
          required
          defaultValue=""
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
        Your details are used to respond to this inquiry. Please avoid including
        passwords or confidential data.
      </p>
      <Button
        variant="contained"
        type="submit"
        disabled={!ready || status === "loading"}
        className="submit-button"
      >
        {status === "loading"
          ? "Sending your inquiry..."
          : "Send Project Inquiry"}
      </Button>
      <div className="contact-feedback" aria-live="polite" aria-atomic="true">
        {status === "success" && (
          <motion.div
            className="completion-animation"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.35 }}
          >
            <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <motion.circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: reduced ? 0 : 0.35 }}
              />
              <motion.path
                d="m15 24 6 6 13-14"
                stroke="currentColor"
                strokeWidth="1.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: reduced ? 0 : 0.4,
                  delay: reduced ? 0 : 0.06,
                }}
              />
            </svg>
            <span>A good conversation starts here.</span>
          </motion.div>
        )}
        {(status === "success" || status === "error") && (
          <Alert severity={status === "success" ? "success" : "error"}>
            <BrandText>{message}</BrandText>
          </Alert>
        )}
      </div>
    </motion.form>
  );
}
