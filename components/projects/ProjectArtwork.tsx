"use client";
import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import ProjectLogo from "./ProjectLogo";
export default function ProjectArtwork({
  src,
  alt,
  detail = false,
  logoTitle,
}: {
  src: string;
  alt: string;
  detail?: boolean;
  logoTitle?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useMotionPreference();
  const visible = useInView(ref, { margin: "80px" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [detail ? 10 : 7, detail ? -10 : -7],
  );
  return (
    <motion.div
      className={`project-artwork ${detail ? "project-artwork-detail" : ""}`}
      ref={ref}
      data-active={visible}
      style={{ y: reduced ? 0 : y }}
    >
      <div className="project-artwork-float">
        {logoTitle ? (
          <ProjectLogo
            src={src}
            title={logoTitle}
            alt={alt}
            width={720}
            height={520}
            sizes="(max-width: 650px) calc(100vw - 80px), (max-width: 1200px) 44vw, 540px"
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            width={detail ? 1200 : 720}
            height={detail ? 760 : 520}
            loading="lazy"
          />
        )}
      </div>
    </motion.div>
  );
}
