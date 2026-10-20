import Arrow from "@/components/ui/Arrow";
export function ListControls({
  search,
  setSearch,
  status,
  setStatus,
  statuses,
  sort,
  setSort,
  noun = "items",
  disabled = false,
}: {
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  statuses: string[];
  sort?: string;
  setSort?: (value: string) => void;
  noun?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={`admin-controls ${setSort && noun === "projects" ? "has-sort" : ""}`}
    >
      <label>
        Search {noun}
        <input
          type="search"
          value={search}
          maxLength={100}
          disabled={disabled}
          placeholder={`Search ${noun}…`}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <label>
        Filter by status
        <select
          value={status}
          disabled={disabled}
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
      {setSort && noun === "projects" && (
        <label>
          Sort projects
          <select
            value={sort}
            disabled={disabled}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="order">Display order</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      )}
    </div>
  );
}
export function Pagination({
  page,
  total,
  setPage,
  loading = false,
}: {
  page: number;
  total: number;
  setPage: (page: number) => void;
  loading?: boolean;
}) {
  return (
    <nav className="admin-pagination" aria-label="List pages">
      <span>
        {total === 0
          ? "0 items"
          : `${(page - 1) * 12 + 1}–${Math.min(page * 12, total)} of ${total} items`}
      </span>
      <div className="admin-actions">
        <button
          className="admin-button"
          disabled={loading || page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous <Arrow />
        </button>
        <span className="small">
          Page {page} of {Math.max(1, Math.ceil(total / 12))}
        </span>
        <button
          className="admin-button"
          disabled={loading || page * 12 >= total}
          onClick={() => setPage(page + 1)}
        >
          Next <Arrow />
        </button>
      </div>
    </nav>
  );
}
