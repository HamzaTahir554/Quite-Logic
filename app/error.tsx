"use client";
import FabricButton from "@/components/ui/FabricButton";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="page-hero container">
      <span className="eyebrow">A moment of interruption</span>
      <h1>Something went wrong.</h1>
      <p>Please try loading this page again.</p>
      <FabricButton onClick={reset}>Try again ↻</FabricButton>
    </section>
  );
}
