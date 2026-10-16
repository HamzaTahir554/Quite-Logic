"use client";
import { createTheme } from "@mui/material/styles";
export const brand = {
  smokyGray: "#4B5560",
  darkSlate: "#303944",
  cardGray: "#596572",
  blue: "#2F80FE",
  paper: "#F0F1F8",
  background: "#4B5560",
  surface: "#596572",
  secondary: "#DDE1E8",
};
export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: brand.blue },
    background: { default: brand.background, paper: brand.surface },
    text: { primary: brand.paper, secondary: brand.secondary },
  },
  typography: {
    fontFamily: "var(--font-manrope), sans-serif",
    button: { textTransform: "none", fontWeight: 700 },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 14, padding: "14px 22px", boxShadow: "none" },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(240,241,248,.14)",
          background: "rgba(240,241,248,.06)",
          fontSize: 11,
          color: brand.paper,
        },
      },
    },
    MuiTextField: { defaultProps: { variant: "outlined", fullWidth: true } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { background: "rgba(240,241,248,.035)", borderRadius: 12 },
        notchedOutline: { borderColor: "rgba(240,241,248,.22)" },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid rgba(240,241,248,.12)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: { root: { backgroundImage: "none", boxShadow: "none" } },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: brand.darkSlate,
          backgroundImage: "none",
          padding: 28,
          width: "min(360px, 100vw)",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: "none",
          border: "1px solid rgba(240,241,248,.15)",
        },
      },
    },
  },
});
