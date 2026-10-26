"use client";
import { useVisualTheme } from "@/theme/VisualThemeProvider";
function ThemeIcon({ day }: { day: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      {day ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
        </>
      ) : (
        <path d="M20.5 14.5A8.8 8.8 0 0 1 9.5 3.5 8.8 8.8 0 1 0 20.5 14.5Z" />
      )}
    </svg>
  );
}
export default function ThemeToggle() {
  const { theme, setTheme } = useVisualTheme();
  return (
    <button
      className="theme-toggle-button"
      type="button"
      aria-label={`Switch to ${theme === "day" ? "Night" : "Day"} mode`}
      onClick={() => setTheme(theme === "day" ? "night" : "day")}
    >
      <span className="theme-current-day" aria-hidden="true">
        <ThemeIcon day />
      </span>
      <span className="theme-current-night" aria-hidden="true">
        <ThemeIcon day={false} />
      </span>
    </button>
  );
}
