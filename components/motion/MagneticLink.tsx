import Link from "next/link";
import type { ReactNode } from "react";
export default function MagneticLink({
  href,
  children,
  secondary = false,
  className = "",
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`button magnetic ${secondary ? "secondary" : "primary"} ${className}`}
    >
      <span className="button-label">{children}</span>
      <span className="button-arrow" aria-hidden="true">
        ↗
      </span>
    </Link>
  );
}
