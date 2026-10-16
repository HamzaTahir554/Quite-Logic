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
export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [down, setDown] = useState(false);
  const lastY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      if (Math.abs(y - lastY.current) > 7) {
        setDown(y > lastY.current && y > 220);
        lastY.current = y;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const links = navigation.map(([label, href]) => (
    <Link
      onClick={() => setOpen(false)}
      aria-current={pathname === href ? "page" : undefined}
      className="nav-link"
      href={href}
      key={href}
    >
      {pathname === href && (
        <motion.span
          className="nav-active"
          layoutId="active-navigation"
          transition={{ duration: 0.3 }}
        />
      )}
      <span>{label}</span>
    </Link>
  ));
  return (
    <header
      className={`site-header ${scrolled ? "scrolled" : ""} ${down && !open ? "scrolling-down" : ""}`}
    >
      <Link className="brand" href="/" aria-label="Quite Logic home">
        <Image src="/logo/icon.png" alt="" width={42} height={42} priority />
        <BrandName />
      </Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        {links}
      </nav>
      <BookingButton className="nav-project" />
      <IconButton
        className="mobile-toggle"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        ☰
      </IconButton>
      <Drawer open={open} onClose={() => setOpen(false)} anchor="right">
        <div className="drawer-head">
          <BrandName />
          <IconButton
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            ×
          </IconButton>
        </div>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {links}
        </nav>
        <p>Calm, precise software.</p>
      </Drawer>
    </header>
  );
}
