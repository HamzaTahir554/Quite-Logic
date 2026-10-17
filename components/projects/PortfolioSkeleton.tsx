export default function PortfolioSkeleton({
  contained = false,
}: {
  contained?: boolean;
}) {
  return (
    <div
      className={contained ? "container portfolio-section" : ""}
      role="status"
      aria-label="Loading projects"
    >
      <span className="sr-only">Loading projects…</span>
      <div className="managed-project-grid">
        {[0, 1, 2].map((id) => (
          <div
            key={id}
            className="managed-project-card glass-panel project-skeleton"
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>
        ))}
      </div>
    </div>
  );
}
