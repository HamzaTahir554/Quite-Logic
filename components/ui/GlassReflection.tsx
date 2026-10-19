// Decorative layers share one delegated pointer controller across the site.
export default function GlassReflection() {
  return (
    <>
      <span className="glass-reflection" aria-hidden="true" />
      <span className="glass-spotlight" aria-hidden="true" />
    </>
  );
}
