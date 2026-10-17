export function ListControls({
  search,
  setSearch,
  status,
  setStatus,
  statuses,
}: {
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  statuses: string[];
}) {
  return (
    <div className="admin-controls">
      <label>
        Search
        <input
          type="search"
          value={search}
          maxLength={100}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <label>
        Status
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {value[0].toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
export function Pagination({
  page,
  total,
  setPage,
}: {
  page: number;
  total: number;
  setPage: (page: number) => void;
}) {
  return (
    <div className="admin-actions">
      <button disabled={page === 1} onClick={() => setPage(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {Math.max(1, Math.ceil(total / 12))} · {total} total
      </span>
      <button disabled={page * 12 >= total} onClick={() => setPage(page + 1)}>
        Next
      </button>
    </div>
  );
}
