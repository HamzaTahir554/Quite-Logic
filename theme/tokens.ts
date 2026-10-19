export type VisualTheme = "day" | "night";
export const themeStorageKey = "quietlogic-theme";
export const palettes = {
  day: {
    background: "#E8ECF1",
    surface: "#E5E9EE",
    raised: "#EDF0F4",
    secondarySurface: "#DFE4EA",
    primary: "#18222D",
    secondary: "#465463",
    muted: "#687583",
    accent: "#2F80FE",
    accentHover: "#1F6FE5",
    success: "#2F7D5A",
    error: "#C2414B",
  },
  night: {
    background: "#4B5560",
    surface: "#596572",
    primary: "#F0F1F8",
    secondary: "#D1D6DD",
    accent: "#91BDFF",
  },
} as const;
export const graphPalettes = {
  night: {
    arc: "rgba(47,128,254,0.08)",
    quietArc: "rgba(180,195,215,0.055)",
    active: "rgba(47,128,254,0.16)",
    fine: "rgba(255,255,255,0.04)",
    line: "rgba(180,195,215,0.08)",
    node: "rgba(240,241,248,0.18)",
    accent: "#2f80fe",
  },
  day: {
    arc: "rgba(53,72,92,0.06)",
    quietArc: "rgba(53,72,92,0.04)",
    active: "rgba(47,128,254,0.18)",
    fine: "rgba(53,72,92,0.04)",
    line: "rgba(53,72,92,0.08)",
    node: "rgba(53,72,92,0.16)",
    accent: "rgba(47,128,254,0.55)",
  },
} as const;

// Runs in <head> before paint, independently of React hydration or storage access.
export const themeInitScript = `(function(){var t;try{t=localStorage.getItem('${themeStorageKey}')}catch(e){}if(t!=='day'&&t!=='night'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'night':'day'}document.documentElement.setAttribute('data-theme',t)})();`;
