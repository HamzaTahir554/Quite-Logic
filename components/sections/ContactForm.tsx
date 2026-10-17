"use client";
import { useState, useRef, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Alert, Button, MenuItem, TextField } from "@mui/material";
import BrandText from "@/components/ui/BrandText";
import { contactDraft } from "@/lib/contact-draft";
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
  const [draft, setDraft] = useState<ReturnType<typeof contactDraft> | null>(
    null,
  );
  const [message, setMessage] = useState("");
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    setDraft(contactDraft(parsed.data));
    setMessage(
      "Your draft is ready. Open your email app, review the message, and send it there. Nothing has been sent automatically.",
    );
  }
  async function copyDraft() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft.subject + "\n\n" + draft.body);
      setMessage(
        "Draft copied. Paste it into an email to " + contactEmail + ".",
      );
    } catch {
      setMessage(
        "Please use the email link or select and copy the draft below.",
      );
    }
  }
  function field(name: keyof ContactInput) {
    return {
      name,
      error: !!errors[name],
      helperText: errors[name],
      onChange: () => {
        setDraft(null);
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
        setDraft(null);
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
      data-status={draft ? "draft" : "idle"}
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
        Prepare a draft in your email app. Nothing is sent or stored by this
        website. Please avoid passwords or confidential data.
      </p>
      <p className="small">
        Prefer email? <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
      </p>
      <Button
        variant="contained"
        type="submit"
        disabled={!ready}
        className="submit-button"
      >
        Prepare Email Draft
      </Button>
      <div className="contact-feedback" aria-live="polite" aria-atomic="true">
        {draft && (
          <>
            <Alert severity="info">
              <BrandText>{message}</BrandText>
            </Alert>
            <div className="contact-draft-actions">
              <a className="button primary" href={draft.url}>
                Open email app ↗
              </a>
              <button
                className="button secondary"
                type="button"
                onClick={copyDraft}
              >
                Copy draft
              </button>
            </div>
            <details className="contact-draft-preview">
              <summary>Preview your draft</summary>
              <p>{draft.subject}</p>
              <pre>{draft.body}</pre>
            </details>
          </>
        )}
      </div>
    </motion.form>
  );
}
