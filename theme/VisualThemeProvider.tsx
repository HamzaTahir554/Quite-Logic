"use client";
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { themeStorageKey, type VisualTheme } from "./tokens";

const listeners = new Set<() => void>();
let transitionTimer: ReturnType<typeof setTimeout> | undefined;
function savedTheme(): VisualTheme | null {
  try {
    const value = localStorage.getItem(themeStorageKey);
    return value === "day" || value === "night" ? value : null;
  } catch {
    return null;
  }
}
function preferredTheme(): VisualTheme {
  return (
    savedTheme() ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day")
  );
}
function snapshot(): VisualTheme {
  return document.documentElement.dataset.theme === "day" ? "day" : "night";
}
function applyTheme(value: VisualTheme, persist = false) {
  if (persist) {
    try {
      localStorage.setItem(themeStorageKey, value);
    } catch {
      /* Remain usable with blocked storage. */
    }
  }
  if (snapshot() !== value) {
    const root = document.documentElement;
    root.classList.add("theme-changing");
    root.dataset.theme = value;
    clearTimeout(transitionTimer);
    transitionTimer = setTimeout(
      () => root.classList.remove("theme-changing"),
      450,
    );
  }
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
const Context = createContext<{
  theme: VisualTheme;
  setTheme: (value: VisualTheme) => void;
} | null>(null);
export default function VisualThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const theme = useSyncExternalStore<VisualTheme>(
    subscribe,
    snapshot,
    () => "night",
  );
  useEffect(() => {
    // Bootstrap already selected the mode before paint. Match external changes too.
    const media = matchMedia("(prefers-color-scheme: dark)");
    const systemChange = () => {
      if (!savedTheme()) applyTheme(preferredTheme());
    };
    const storageChange = (event: StorageEvent) => {
      if (event.key === themeStorageKey || event.key === null)
        applyTheme(preferredTheme());
    };
    media.addEventListener("change", systemChange);
    window.addEventListener("storage", storageChange);
    // Reconcile changes between the early bootstrap and hydration.
    applyTheme(preferredTheme());
    return () => {
      media.removeEventListener("change", systemChange);
      window.removeEventListener("storage", storageChange);
    };
  }, []);
  return (
    <Context.Provider
      value={{ theme, setTheme: (value) => applyTheme(value, true) }}
    >
      {children}
    </Context.Provider>
  );
}
export function useVisualTheme() {
  const value = useContext(Context);
  if (!value) throw new Error("VisualThemeProvider is required.");
  return value;
}
