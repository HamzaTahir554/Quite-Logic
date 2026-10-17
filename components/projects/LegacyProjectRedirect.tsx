"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
export default function LegacyProjectRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/portfolio/atlas-cloud");
  }, [router]);
  return (
    <section className="section container">
      <h1>Atlas / Cloud</h1>
      <p>This concept has a new home.</p>
      <Link className="button primary" href="/portfolio/atlas-cloud">
        Explore Atlas / Cloud ↗
      </Link>
    </section>
  );
}
