"use client";
import { useEffect, useState } from "react";
import { meetingStatus } from "@/lib/meeting-contract";
import { apiCall, useAdminList } from "./useAdminList";
import { EmptyState, ListError, ListSkeleton } from "./AdminElements";
type Item = {
  _id: string;
  requestId: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message?: string;
  projectType?: string;
  startTime: string;
  endTime: string;
  timezone: string;
  state: string;
};
export default function MeetingManager() {
  const list = useAdminList<Item>("meetings");
  const [checking, setChecking] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  async function check(requestId: string) {
    if (checking) return;
    setChecking(requestId);
    setError("");
    try {
      await apiCall("/api/admin/meetings", "POST", { requestId });
      list.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to check this meeting.",
      );
    } finally {
      setChecking("");
    }
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Your conversations</span>
          <h1>Meetings</h1>
          <p>
            Bookings made through Quiet Logic. Check the calendar for current
            invitation and cancellation details.
          </p>
        </div>
        <button className="admin-button" onClick={list.refresh}>
          Refresh list
        </button>
      </div>
      <div className="admin-form">
        <label>
          Find a meeting
          <input
            type="search"
            value={list.search}
            onChange={(event) => list.setSearch(event.target.value)}
            placeholder="Client, email or company"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      {list.error ? (
        <ListError message={list.error} retry={list.refresh} />
      ) : list.loading ? (
        <ListSkeleton />
      ) : !list.items.length ? (
        <EmptyState
          title="No meetings yet"
          description="Confirmed bookings and requests awaiting confirmation will appear here."
        />
      ) : (
        <div className="admin-list">
          {list.items.map((item) => (
            <article
              key={item._id}
              className="admin-panel meeting-admin-record"
            >
              <div>
                <h2>{item.name}</h2>
                <a href={`mailto:${item.email}`}>{item.email}</a>
                {item.company && <p>{item.company}</p>}
              </div>
              <dl>
                <dt>Date &amp; time</dt>
                <dd>
                  {new Intl.DateTimeFormat("en", {
                    timeZone: item.timezone,
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(item.startTime))}
                  <small>{item.timezone}</small>
                </dd>
                <dt>Status</dt>
                <dd>{meetingStatus(item, now)}</dd>
              </dl>
              {(item.phone || item.message || item.projectType) && (
                <details>
                  <summary>Meeting details</summary>
                  {item.phone && <p>{item.phone}</p>}
                  {item.projectType && <p>{item.projectType}</p>}
                  {item.message && (
                    <p className="meeting-admin-message">{item.message}</p>
                  )}
                </details>
              )}
              {item.state !== "cancelled" && (
                <button
                  className="admin-button"
                  disabled={!!checking}
                  onClick={() => void check(item.requestId)}
                >
                  {checking === item.requestId
                    ? "Checking..."
                    : "Check calendar"}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      {list.total > 12 && (
        <div className="admin-pagination">
          <button
            className="admin-button"
            disabled={list.page <= 1}
            onClick={() => list.setPage(list.page - 1)}
          >
            Previous
          </button>
          <span>
            Page {list.page} of {Math.ceil(list.total / 12)}
          </span>
          <button
            className="admin-button"
            disabled={list.page * 12 >= list.total}
            onClick={() => list.setPage(list.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
