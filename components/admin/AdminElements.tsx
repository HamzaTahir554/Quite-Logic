export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="admin-badge" data-status={status}>
      <span aria-hidden="true" />
      {status}
    </span>
  );
}
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="admin-list" role="status" aria-label="Loading items">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="admin-record admin-skeleton"
          aria-hidden="true"
        >
          <div />
          <div />
          <div />
        </div>
      ))}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="admin-empty">
      <span className="admin-empty-mark" aria-hidden="true">
        ◇
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function ListError({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="admin-error-panel" role="alert">
      <p>{message}</p>
      <button className="admin-button" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
