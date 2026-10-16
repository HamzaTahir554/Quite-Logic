"use client";
import { useRef } from "react";
import { useCrystalPointer } from "@/hooks/useCrystalPointer";
export default function CrystalReflection() {
  const ref = useRef<HTMLSpanElement>(null);
  useCrystalPointer(ref, "", true);
  return (
    <>
      <span ref={ref} className="crystal-light" aria-hidden="true" />
      <span className="crystal-sheen" aria-hidden="true" />
    </>
  );
}
