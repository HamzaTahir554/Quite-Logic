"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { PublicSocialLink } from "@/lib/social-links";
import SocialIcon from "@/components/ui/SocialIcon";

export default function SocialLinks() {
  const path = usePathname();
  const [links, setLinks] = useState<PublicSocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let request: AbortController | undefined;
    async function load() {
      request?.abort();
      const active = new AbortController();
      request = active;
      try {
        const response = await fetch("/api/socials", {
          cache: "no-store",
          signal: AbortSignal.any([active.signal, AbortSignal.timeout(10000)]),
        });
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (!active.signal.aborted) setLinks(result.links);
      } catch {
        if (!active.signal.aborted) setLinks([]);
      } finally {
        if (!active.signal.aborted) setLoading(false);
      }
    }
    void load();
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      request?.abort();
      removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [path]);
  return (
    <div className="footer-socials" aria-busy={loading}>
      <h3>Elsewhere</h3>
      {loading ? (
        <span
          className="footer-social-loading"
          role="status"
          aria-label="Loading social links"
        />
      ) : links.length ? (
        <nav aria-label="Social media">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${link.platform === "X" ? "X / Twitter" : link.platform} (opens in a new tab)`}
            >
              <SocialIcon platform={link.platform} />
              <span>
                {link.platform === "X" ? "X / Twitter" : link.platform}
              </span>
              <span aria-hidden="true">↗</span>
            </a>
          ))}
        </nav>
      ) : (
        <p className="small muted">More ways to connect, coming soon.</p>
      )}
    </div>
  );
}
