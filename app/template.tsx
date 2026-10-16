"use client";
import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
export default function Template({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const admin = usePathname().startsWith("/admin");
  if (admin) return <>{children}</>;
  return (
    <motion.div
      initial={false}
      animate={{ clipPath: ["inset(0 0 5% 0)", "inset(0 0 0% 0)"] }}
      transition={{ duration: reduced ? 0 : 0.35, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
