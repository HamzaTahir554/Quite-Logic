import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import Arrow from "./Arrow";

type Shared = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  arrow?: boolean;
  className?: string;
};
type Props = Shared &
  (
    | ({ href: string } & Omit<
        ComponentProps<typeof Link>,
        keyof Shared | "href"
      >)
    | ({ href?: never } & Omit<ComponentProps<"button">, keyof Shared>)
  );

/** Links navigate; native buttons retain form, dialog and keyboard behavior. */
export default function FabricButton({
  children,
  variant = "primary",
  arrow = true,
  className = "",
  ...props
}: Props) {
  const classes = `button magnetic fabric-button ${variant} ${className}`;
  const content = (
    <>
      <span className="button-label">{children}</span>
      {arrow && <Arrow className="button-arrow" />}
    </>
  );
  if (typeof props.href === "string")
    return (
      <Link {...props} className={classes}>
        {content}
      </Link>
    );
  return (
    <button type="button" {...props} className={classes}>
      {content}
    </button>
  );
}
