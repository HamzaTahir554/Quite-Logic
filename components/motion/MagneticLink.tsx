import FabricButton from "@/components/ui/FabricButton";
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
    <FabricButton
      href={href}
      variant={secondary ? "secondary" : "primary"}
      className={className}
    >
      {children}
    </FabricButton>
  );
}
