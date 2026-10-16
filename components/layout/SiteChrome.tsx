"use client";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import StudioMotion from "../motion/StudioMotion";
import TextMotion from "../motion/TextMotion";
export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = usePathname().startsWith("/admin");
  if (admin)
    return (
      <main id="main" className="admin-root">
        {children}
      </main>
    );
  return (
    <div className="public-site">
      <StudioMotion />
      <TextMotion />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
