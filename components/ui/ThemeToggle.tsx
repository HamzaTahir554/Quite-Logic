"use client";
import { useState } from "react";
import { Menu, MenuItem } from "@mui/material";
import { useVisualTheme } from "@/theme/VisualThemeProvider";
import { useMotionPreference } from "@/hooks/useMotionPreference";
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
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const reduced = useMotionPreference();
  return (
    <>
      <button
        className="theme-popover-button"
        type="button"
        aria-label={`Display settings: ${theme === "day" ? "Day" : "Night"} mode`}
        aria-haspopup="menu"
        aria-controls={anchor ? "display-settings-menu" : undefined}
        aria-expanded={Boolean(anchor)}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <span className="theme-current-day" aria-hidden="true">
          <ThemeIcon day />
        </span>
        <span className="theme-current-night" aria-hidden="true">
          <ThemeIcon day={false} />
        </span>
      </button>
      <Menu
        id="display-settings-menu"
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        marginThreshold={12}
        transitionDuration={reduced ? 0 : 180}
        slotProps={{
          paper: { className: "theme-popover" },
          list: { "aria-label": "Display mode" },
        }}
      >
        {(["day", "night"] as const).map((value) => (
          <MenuItem
            key={value}
            role="menuitemradio"
            aria-checked={theme === value}
            selected={theme === value}
            onClick={() => {
              setTheme(value);
              setAnchor(null);
            }}
          >
            <ThemeIcon day={value === "day"} />
            <span>
              {value === "day" ? "Day" : "Night"}
              <small>
                {value === "day" ? "Claymorphism" : "Glassmorphism"}
              </small>
            </span>
            {theme === value && <span aria-hidden="true">✓</span>}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
