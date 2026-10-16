import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Providers from "@/components/Providers";
import SiteChrome from "@/components/layout/SiteChrome";
import { siteUrl } from "@/lib/seo";
import "./globals.css";
import "./studio.css";
import "./hero.css";
import "./atlas-motion.css";
import "./service-cube.css";
import "./services-editorial.css";
import "./interaction.css";
import "./crystal.css";
import "./reviews-admin.css";
const manrope = Manrope({
  subsets: ["latin"],
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
    <html lang="en">
      <body className={manrope.variable}>
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
