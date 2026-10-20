"use client";
import Image from "next/image";
import { useState } from "react";
import type { ProjectMediaType } from "@/lib/portfolio";
import styles from "./ProjectMedia.module.css";

/** A bounded, non-animated image plane; the surrounding card owns motion. */
export default function ProjectMedia({
  src,
  title,
  mediaType = "logo",
}: {
  src: string;
  title: string;
  mediaType?: ProjectMediaType;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span className={styles.frame} data-media-type={mediaType}>
      <span className={styles.bounds}>
        {src && failed !== src ? (
          <Image
            className={styles.image}
            src={src}
            alt={`${title} ${mediaType}`}
            width={1200}
            height={1200}
            unoptimized
            loading="lazy"
            onError={() => setFailed(src)}
          />
        ) : (
          <span
            className="project-logo-fallback"
            role="img"
            aria-label={`${title} image placeholder`}
          >
            {title.trim().slice(0, 1).toUpperCase() || "Q"}
          </span>
        )}
      </span>
    </span>
  );
}
