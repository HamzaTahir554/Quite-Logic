"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createGraphRenderer, type GraphVariant } from "./graph-renderer";
import { useVisualTheme } from "@/theme/VisualThemeProvider";

/** One persistent, decorative canvas shared by the root layout. */
export default function GraphBackground({
  variant,
}: {
  variant?: GraphVariant;
}) {
  const pathname = usePathname();
  const { theme } = useVisualTheme();
  const admin = pathname === "/admin" || pathname.startsWith("/admin/");
  const auth = [
    "/admin/login",
    "/admin/forgot-password",
    "/admin/reset-password",
  ].includes(pathname);
  const resolved = variant ?? (auth ? "auth" : admin ? "admin" : "public");
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<ReturnType<typeof createGraphRenderer> | null>(null);

  useEffect(() => {
    if (!canvas.current || !host.current) return;
    const graph = createGraphRenderer(canvas.current, host.current);
    renderer.current = graph;
    return () => {
      graph.dispose();
      renderer.current = null;
    };
  }, []);

  useEffect(() => {
    renderer.current?.setVariant(resolved);
  }, [resolved]);

  useEffect(() => {
    renderer.current?.setTheme(
      document.documentElement.dataset.theme === "day" ? "day" : "night",
    );
  }, [theme]);

  return (
    <div
      ref={host}
      className="graph-background"
      data-variant={resolved}
      data-interaction="autonomous"
      aria-hidden="true"
    >
      <canvas ref={canvas} />
    </div>
  );
}
