"use client";

import { useCallback, useEffect, useState } from "react";

import { api, buildQuery, errorMessage } from "@/lib/api";
import type { Paginated } from "@/lib/types";

type Params = Record<string, string | number | boolean | undefined | null>;

/** Load a paginated list and reload it whenever the path or params change. */
export function useList<T>(path: string | null, params: Params = {}) {
  const [data, setData] = useState<Paginated<T> | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const query = buildQuery(params);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    api<Paginated<T>>(`${path}${query}`)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError("");
      })
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [path, query, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { data, setData, error, setError, reload };
}

/** Load one resource (or any JSON) and reload on demand. */
export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    api<T>(path)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError("");
      })
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [path, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { data, setData, error, setError, reload };
}

/** A value that only updates after the user stops typing. */
export function useDebounced<T>(value: T, ms = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** Current page number that resets to 1 whenever any of `filters` changes (no effect needed). */
export function usePage(...filters: unknown[]) {
  const key = JSON.stringify(filters);
  const [state, setState] = useState({ key, page: 1 });
  const page = state.key === key ? state.page : 1;
  const setPage = useCallback((next: number) => setState({ key, page: next }), [key]);
  return [page, setPage] as const;
}
