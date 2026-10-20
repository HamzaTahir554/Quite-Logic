"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Drawer, IconButton } from "@mui/material";
import { motion } from "framer-motion";
import { navigation } from "@/data/content";
import { BookingButton } from "@/components/booking/BookingProvider";
import BrandName from "@/components/ui/BrandName";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useHeaderScroll } from "@/hooks/useHeaderScroll";
import { useMotionPreference } from "@/hooks/useMotionPreference";
export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const { compact, down } = useHeaderScroll(header, open);
  const reduced = useMotionPreference();
  useEffect(() => {
    const desktop = matchMedia("(min-width: 981px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  const links = (mobile = false) =>
    navigation.map(([label, href]) => {
      const active =
        pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
      return (
        <Link
          onClick={() => setOpen(false)}
          aria-current={active ? "page" : undefined}
          className="nav-link"
          href={href}
          key={href}
        >
          {active && (
            <motion.span
              className="nav-active"
              aria-hidden="true"
              layoutId={
                mobile ? "mobile-active-navigation" : "active-navigation"
              }
              transition={
                reduced
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 430, damping: 36 }
              }
            />
          )}
          <span>{label}</span>
        </Link>
      );
    });
  return (
    <header
      ref={header}
      className={`site-header ${compact ? "scrolled" : ""} ${down && !open ? "scrolling-down" : ""}`}
      data-compact={compact}
      data-scrolling-down={down && !open}
      data-menu-open={open}
    >
      <span className="header-surface" aria-hidden="true" />
      <div className="header-bar">
        <Link className="brand" href="/" aria-label="Quite Logic home">
          <Image src="/logo/icon.png" alt="" width={42} height={42} priority />
          <BrandName />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links()}
        </nav>
        <ThemeToggle />
        <span className="header-booking">
          <BookingButton className="nav-project" />
        </span>
        <IconButton
          className="mobile-toggle"
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="public-mobile-navigation"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </IconButton>
      </div>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        anchor="top"
        className="public-navigation-modal"
        transitionDuration={reduced ? 0 : { enter: 280, exit: 220 }}
        slotProps={{
          paper: {
            id: "public-mobile-navigation",
            className: "public-mobile-menu",
            role: "dialog",
            "aria-modal": true,
            "aria-label": "Site navigation",
          },
        }}
      >
        <div className="drawer-head">
          <BrandName />
          <IconButton
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M6 18 18 6" />
            </svg>
          </IconButton>
        </div>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {links(true)}
        </nav>
        <BookingButton className="drawer-booking" />
        <p>Calm, precise software.</p>
      </Drawer>
    </header>
  );
}
