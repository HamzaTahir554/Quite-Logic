import type { Metadata } from "next";
import localFont from "next/font/local";
import Providers from "@/components/Providers";
import SiteChrome from "@/components/layout/SiteChrome";
import { siteUrl } from "@/lib/seo";
import { themeInitScript } from "@/theme/tokens";
import "./globals.css";
import "./studio.css";
import "./hero.css";
import "./atlas-motion.css";
import "./service-cube.css";
import "./services-editorial.css";
import "./interaction.css";
import "./crystal.css";
import "./reviews.css";
import "./portfolio.css";
import "./booking.css";
import "./glass.css";
import "./graph-background.css";
import "./themes.css";
import "./refinements.css";
import "./fabric.css";
import "./header.css";
const manrope = localFont({
  src: "../public/fonts/manrope-latin.woff2",
  weight: "200 800",
  variable: "--font-manrope",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Quite Logic | Calm, precise software.",
    template: "%s | Quite Logic",
  },
  description:
    "Thoughtful software engineering, web and app development, AI automation, and computer vision.",
  applicationName: "Quite Logic",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/logo/icon.png", apple: "/logo/icon.png" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="night" suppressHydrationWarning>
      <head>
        <script
          id="quietlogic-theme-init"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className={manrope.variable}>
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
