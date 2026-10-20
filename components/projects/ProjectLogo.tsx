"use client";
import Image from "next/image";
import { useState } from "react";
export default function ProjectLogo({
  src,
  title,
  alt,
  width = 240,
  height = 120,
  className = "",
  sizes,
}: {
  src: string | null;
  title: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const url = src?.startsWith("/api/project-images/")
    ? `${src}?size=card`
    : src;
  return (
    <span className={`project-logo-image ${className}`}>
      {url && failed !== url ? (
        <Image
          unoptimized
          src={url}
          alt={alt || `${title} logo`}
          width={width}
          height={height}
          loading="lazy"
          sizes={sizes}
          onError={() => setFailed(url)}
        />
      ) : (
        <span
          className="project-logo-fallback"
          role="img"
          aria-label={`${title} logo placeholder`}
        >
          {title.trim().slice(0, 1).toUpperCase() || "Q"}
        </span>
      )}
    </span>
  );
}
