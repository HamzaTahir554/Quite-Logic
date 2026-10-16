export default function Loading() {
  return (
    <div
      className="container loading-shell"
      aria-label="Loading page"
      role="status"
    >
      <div />
      <div />
      <div />
      <span className="small muted">Bringing things into focus…</span>
    </div>
  );
}
