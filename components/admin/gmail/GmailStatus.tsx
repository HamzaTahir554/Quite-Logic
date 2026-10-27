"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { GmailStatus } from "@/lib/gmail/contracts";
const Context = createContext<{
  status: GmailStatus | null;
  error: string;
  refresh: () => Promise<void>;
} | null>(null);
export default function GmailStatusProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [status, setStatus] = useState<GmailStatus | null>(null),
    [error, setError] = useState("");
  const running = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (running.current || document.hidden) return;
    const controller = new AbortController();
    running.current = controller;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 20000);
    try {
      const response = await fetch("/api/admin/gmail/status", {
        signal: controller.signal,
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Your session expired. Sign in again."
            : result.error || "Could not check Gmail connection.",
        );
      if (!controller.signal.aborted) {
        setStatus(result);
        setError("");
      }
    } catch (error) {
      if (timedOut) setError("Gmail connection check timed out. Please retry.");
      else if (!controller.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : "Could not check Gmail connection.",
        );
    } finally {
      clearTimeout(timeout);
      if (running.current === controller) running.current = null;
    }
  }, []);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), 45000);
    const visible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      running.current?.abort();
    };
  }, [refresh]);
  return (
    <Context.Provider value={{ status, error, refresh }}>
      {children}
    </Context.Provider>
  );
}
export function useGmailStatus() {
  const c = useContext(Context);
  if (!c) throw new Error("GmailStatusProvider is required");
  return c;
}
export function GmailUnreadBadge() {
  const { status } = useGmailStatus();
  return status?.connected && status.unreadCount > 0 ? (
    <span
      className="gmail-unread-badge"
      aria-label={status.unreadCount + " unread emails"}
    >
      {status.unreadCount > 99 ? "99+" : status.unreadCount}
    </span>
  ) : null;
}
