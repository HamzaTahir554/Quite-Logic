"use client";
import Header from "./Header";
import Footer from "./Footer";
import StudioMotion from "../motion/StudioMotion";
import TextMotion from "../motion/TextMotion";
import { usePathname } from "next/navigation";
export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/"))
    return <main id="main">{children}</main>;
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
