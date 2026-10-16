"use client";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import { MotionConfig } from "framer-motion";
import { theme } from "@/theme/theme";
import BookingProvider from "@/components/booking/BookingProvider";
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <MotionConfig reducedMotion="user">
          <BookingProvider>{children}</BookingProvider>
        </MotionConfig>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
