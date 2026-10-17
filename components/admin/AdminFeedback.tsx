"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useMotionPreference } from "@/hooks/useMotionPreference";

type Confirmation = {
  title: string;
  description: string;
  action?: string;
  danger?: boolean;
};
type Feedback = {
  notify: (message: string, severity?: "success" | "error") => void;
  confirm: (options: Confirmation) => Promise<boolean>;
  markDirty: (dirty: boolean) => void;
  hasUnsavedChanges: () => boolean;
};
const Context = createContext<Feedback | null>(null);
export function useAdminFeedback() {
  const context = useContext(Context);
  if (!context) throw new Error("Admin feedback provider is missing.");
  return context;
}
export default function AdminFeedbackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notice, setNotice] = useState<{
    message: string;
    severity: "success" | "error";
    id: number;
  } | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const answer = useRef<((confirmed: boolean) => void) | null>(null);
  const dirty = useRef(false);
  const router = useRouter();
  const reduced = useMotionPreference();
  const notify = useCallback(
    (message: string, severity: "success" | "error" = "success") =>
      setNotice({ message, severity, id: Date.now() }),
    [],
  );
  const confirm = useCallback(
    (options: Confirmation) =>
      new Promise<boolean>((resolve) => {
        answer.current?.(false);
        answer.current = resolve;
        setConfirmation(options);
      }),
    [],
  );
  const markDirty = useCallback((value: boolean) => {
    dirty.current = value;
  }, []);
  function finish(confirmed: boolean) {
    answer.current?.(confirmed);
    answer.current = null;
    setConfirmation(null);
  }
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    function followLink(event: MouseEvent) {
      if (
        !dirty.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download"))
        return;
      const url = new URL(link.href, location.href);
      if (
        !["https:", "http:"].includes(url.protocol) ||
        (url.pathname === location.pathname && url.search === location.search)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      void confirm({
        title: "Leave without saving?",
        description:
          "Your changes haven’t been saved. Stay here to finish editing, or discard them and leave.",
        action: "Discard changes",
        danger: true,
      }).then((approved) => {
        if (!approved) return;
        dirty.current = false;
        if (url.origin === location.origin)
          router.push(url.pathname + url.search + url.hash);
        else location.assign(url.href);
      });
    }
    addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", followLink, true);
    return () => {
      removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", followLink, true);
      answer.current?.(false);
    };
  }, [confirm, router]);
  return (
    <Context.Provider
      value={{
        notify,
        confirm,
        markDirty,
        hasUnsavedChanges: () => dirty.current,
      }}
    >
      {children}
      <Dialog
        open={!!confirmation}
        onClose={() => finish(false)}
        fullWidth
        maxWidth="xs"
        transitionDuration={reduced ? 0 : 180}
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-description"
        slotProps={{ paper: { className: "admin-dialog" } }}
      >
        <DialogTitle id="admin-confirm-title">
          {confirmation?.title}
        </DialogTitle>
        <DialogContent>
          <p id="admin-confirm-description">{confirmation?.description}</p>
        </DialogContent>
        <DialogActions>
          <button
            className="admin-button"
            autoFocus
            onClick={() => finish(false)}
          >
            Cancel
          </button>
          <button
            className={`admin-button ${confirmation?.danger ? "is-danger" : "is-primary"}`}
            onClick={() => finish(true)}
          >
            {confirmation?.action || "Confirm"}
          </button>
        </DialogActions>
      </Dialog>
      <Snackbar
        transitionDuration={reduced ? 0 : 180}
        key={notice?.id}
        open={!!notice}
        autoHideDuration={6000}
        onClose={(_event, reason) => {
          if (reason !== "clickaway") setNotice(null);
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          className={`admin-toast is-${notice?.severity || "success"}`}
          severity={notice?.severity || "success"}
          variant="filled"
          role={notice?.severity === "error" ? "alert" : "status"}
          onClose={() => setNotice(null)}
        >
          {notice?.message}
        </Alert>
      </Snackbar>
    </Context.Provider>
  );
}
export function useUnsavedChanges(dirty: boolean) {
  const { markDirty } = useAdminFeedback();
  useEffect(() => {
    markDirty(dirty);
    return () => markDirty(false);
  }, [dirty, markDirty]);
}
export function useAdminAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const inFlight = useRef(false);
  const { notify } = useAdminFeedback();
  async function run(operation: () => Promise<unknown>, success: string) {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await operation();
      notify(success);
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";
      setError(message);
      notify(message, "error");
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}
