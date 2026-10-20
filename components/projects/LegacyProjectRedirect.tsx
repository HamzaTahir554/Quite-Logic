"use client";
import FabricButton from "@/components/ui/FabricButton";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function LegacyProjectRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/portfolio/atlas-cloud");
  }, [router]);
  return (
    <section className="section container">
      <h1>Atlas / Cloud</h1>
      <p>This concept has a new home.</p>
      <FabricButton href="/portfolio/atlas-cloud">
        Explore Atlas / Cloud
      </FabricButton>
    </section>
  );
}
