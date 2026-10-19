"use client";
import { createTheme } from "@mui/material/styles";
import { glass, glassSurface } from "./glass";
import { palettes } from "./tokens";
export const brand = {
  smokyGray: "#4B5560",
  darkSlate: "#303944",
  cardGray: "#596572",
  blue: "#2F80FE",
  paper: "#F0F1F8",
  background: "#4B5560",
  surface: "#596572",
  secondary: "#D1D6DD",
};
function createVisualTheme(mode: "light" | "dark") {
  const colors = palettes[mode === "light" ? "day" : "night"];
  return createTheme({
    palette: {
      mode,
      primary: { main: brand.blue },
      background: { default: colors.background, paper: colors.surface },
      text: { primary: colors.primary, secondary: colors.secondary },
      ...(mode === "light"
        ? {
            primary: {
              main: palettes.day.accent,
              dark: palettes.day.accentHover,
              contrastText: "#FFFFFF",
            },
            success: { main: palettes.day.success },
            error: { main: palettes.day.error },
          }
        : {}),
    },
    typography: {
      fontFamily: "var(--font-manrope), sans-serif",
      button: { textTransform: "none", fontWeight: 700 },
    },
    shape: { borderRadius: 16 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            padding: "14px 22px",
            boxShadow: "none",
            transition:
              "scale 280ms ease, border-color 280ms ease, background-color 280ms ease",
            "&:focus-visible": {
              outline: "2px solid #91bdff",
              outlineOffset: 3,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            border: "1px solid rgba(240,241,248,.14)",
            background: "rgba(240,241,248,.06)",
            fontSize: 11,
            color: "var(--text-primary)",
          },
        },
      },
      MuiTextField: { defaultProps: { variant: "outlined", fullWidth: true } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            background: "var(--input-surface)",
            color: "var(--text-primary)",
            borderRadius: 12,
            transition: "background-color 280ms ease, box-shadow 280ms ease",
            "&.Mui-focused": {
              background: "var(--input-focus)",
              boxShadow:
                "inset 0 1px rgba(255,255,255,.06), 0 0 0 3px rgba(47,128,254,.1)",
            },
          },
          notchedOutline: { borderColor: "var(--border)" },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            ...glassSurface,
            borderRadius: 24,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: { backgroundImage: "none", boxShadow: "none" },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            ...glassSurface,
            backgroundColor: "var(--modal-surface)",
            "@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))":
              {
                backgroundColor: "var(--modal-surface)",
                WebkitBackdropFilter: "blur(10px) saturate(120%)",
                backdropFilter: "blur(10px) saturate(120%)",
              },
            padding: 28,
            width: "min(360px, 100vw)",
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            ...glassSurface,
            borderColor: glass.border,
            borderRadius: 24,
          },
        },
      },
    },
  });
}
export const dayTheme = createVisualTheme("light");
export const nightTheme = createVisualTheme("dark");
export const themes = { day: dayTheme, night: nightTheme };
export const theme = nightTheme;
