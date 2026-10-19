// CSS tokens are shared with native HTML surfaces; fallbacks also support
// isolated MUI previews where the application stylesheet is not loaded.
export const glass = {
  card: "var(--glass-card, rgba(89, 101, 114, 0.42))",
  dark: "var(--glass-dark, rgba(48, 57, 68, 0.48))",
  border: "var(--glass-border, rgba(255, 255, 255, 0.12))",
  shadow:
    "var(--glass-shadow, inset 0 1px 0 rgba(255,255,255,.08), 0 12px 40px rgba(0,0,0,.12))",
  blur: "var(--glass-blur, 16px)",
};

export const glassSurface = {
  backgroundColor: "var(--surface, #505c68)",
  backgroundImage:
    "linear-gradient(135deg, rgba(145,189,255,.05), transparent 65%)",
  border: `1px solid ${glass.border}`,
  boxShadow: glass.shadow,
  "@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))":
    {
      backgroundColor: glass.card,
      WebkitBackdropFilter: `blur(${glass.blur}) saturate(120%)`,
      backdropFilter: `blur(${glass.blur}) saturate(120%)`,
    },
};
