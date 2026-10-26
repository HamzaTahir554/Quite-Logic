"use client";
import { useState } from "react";
export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => Array.from(part)[0])
      .join("")
      .toUpperCase() || "QL"
  );
}
export default function Avatar({
  name,
  src,
  className = "",
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState("");
  return (
    <span
      className={`ql-avatar ${className}`}
      aria-label={`${name} profile image`}
      role="img"
    >
      {src && src !== failed ? (
        <img
          src={src}
          alt=""
          width="48"
          height="48"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(src)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
