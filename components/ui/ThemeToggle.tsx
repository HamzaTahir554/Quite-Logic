"use client";
import { useVisualTheme } from "@/theme/VisualThemeProvider";
export default function ThemeToggle() {
  const { theme, setTheme } = useVisualTheme();
  const next = theme === "day" ? "night" : "day";
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => setTheme(next)}
    >
      <span className="theme-toggle-thumb" aria-hidden="true" />
      <span className="theme-option theme-option-day">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
        </svg>
        <span>Day</span>
      </span>
      <span className="theme-option theme-option-night">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 14.5A8.8 8.8 0 0 1 9.5 3.5 8.8 8.8 0 1 0 20.5 14.5Z" />
        </svg>
        <span>Night</span>
      </span>
    </button>
  );
}
