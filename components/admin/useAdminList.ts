"use client";
import { useCallback, useEffect, useState } from "react";

export async function apiCall(url: string, method = "GET", data?: unknown) {
  const response = await fetch(url, {
    method,
    ...(data === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "Your session expired. Sign in again."
        : result.error || "Request failed.",
    );
  return result;
}
export function useAdminList<T>(resource: string) {
  const [items, setItems] = useState<T[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1);
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  const [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/admin/${resource}?${new URLSearchParams({ search, status, page: String(page), limit: "12" })}`,
          { signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? "Your session expired. Sign in again."
              : data.error || "Unable to load data.",
          );
        setItems(data.items);
        setTotal(data.total);
        if (page > 1 && data.items.length === 0) setPage(page - 1);
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Unable to load data.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [resource, search, status, page, revision]);
  return {
    items,
    total,
    page,
    setPage,
    search,
    setSearch: (value: string) => {
      setPage(1);
      setSearch(value);
    },
    status,
    setStatus: (value: string) => {
      setPage(1);
      setStatus(value);
    },
    error,
    setError,
    loading,
    refresh,
  };
}
