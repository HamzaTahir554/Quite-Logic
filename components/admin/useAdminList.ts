"use client";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export class AdminRequestError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export async function apiCall(url: string, method = "GET", data?: unknown) {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      ...(data === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          }),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new AdminRequestError(
      "We couldn’t connect. Check your connection and try again.",
    );
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new AdminRequestError(
      "The server couldn’t complete your request. Please try again.",
    );
  }
  if (!response.ok)
    throw new AdminRequestError(
      response.status === 401
        ? "Your session expired. Sign in again."
        : result.error || "Something went wrong. Please try again.",
      result.fields || {},
    );
  return result;
}
export function useAdminList<T>(resource: string) {
  const params = useSearchParams();
  const [items, setItems] = useState<T[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1);
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(params.get("status") || ""),
    [sort, setSort] = useState(resource === "projects" ? "order" : "newest"),
    [error, setError] = useState("");
  const [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const refresh = useCallback(() => {
    setLoading(true);
    setRevision((value) => value + 1);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/admin/${resource}?${new URLSearchParams({ search, status, sort, page: String(page), limit: "12" })}`,
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
            error instanceof TypeError
              ? "We couldn’t load this list. Check your connection and try again."
              : error instanceof Error
                ? error.message
                : "Unable to load data.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [resource, search, status, sort, page, revision]);
  return {
    items,
    total,
    page,
    setPage: (value: number) => {
      if (value !== page) {
        setLoading(true);
        setPage(value);
      }
    },
    search,
    setSearch: (value: string) => {
      if (value !== search) setLoading(true);
      setPage(1);
      setSearch(value);
    },
    status,
    sort,
    setSort: (value: string) => {
      if (value !== sort) setLoading(true);
      setPage(1);
      setSort(value);
    },
    setStatus: (value: string) => {
      if (value !== status) setLoading(true);
      setPage(1);
      setStatus(value);
    },
    error,
    setError,
    loading,
    refresh,
  };
}
