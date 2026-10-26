"use client";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import { MotionConfig } from "framer-motion";
import { themes } from "@/theme/theme";
import VisualThemeProvider, {
  useVisualTheme,
} from "@/theme/VisualThemeProvider";
import BookingProvider from "@/components/booking/BookingProvider";
import GlassLighting from "@/components/motion/GlassLighting";
import GraphBackground from "@/components/background/GraphBackground";
import ThemeToggle from "@/components/ui/ThemeToggle";
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <VisualThemeProvider>
        <ThemedApplication>{children}</ThemedApplication>
      </VisualThemeProvider>
    </AppRouterCacheProvider>
  );
}
function ThemedApplication({ children }: { children: React.ReactNode }) {
  const { theme } = useVisualTheme();
  return (
    <ThemeProvider theme={themes[theme]}>
      <MotionConfig reducedMotion="user">
        <GraphBackground />
        <GlassLighting />
        <BookingProvider>{children}</BookingProvider>
        <ThemeToggle />
      </MotionConfig>
    </ThemeProvider>
  );
}
