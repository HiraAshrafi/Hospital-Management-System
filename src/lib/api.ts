export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

const ACCESS_KEY = "ij_access";
const REFRESH_KEY = "ij_refresh";

function read(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const tokens = {
  access: () => read(ACCESS_KEY),
  refresh: () => read(REFRESH_KEY),
  set(access: string, refresh?: string) {
    try {
      localStorage.setItem(ACCESS_KEY, access);
      if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    } catch {
      /* storage unavailable */
    }
  },
  clear() {
    try {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
  ) {
    super(extractMessage(data) ?? `Request failed (${status})`);
  }
}

/** Turn a DRF error payload ({detail}, {non_field_errors}, {field: [msg]}) into one line. */
function extractMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (typeof record.detail === "string") return record.detail;
  for (const [field, value] of Object.entries(record)) {
    const msg = Array.isArray(value) ? value[0] : value;
    if (typeof msg === "string") {
      return field === "non_field_errors" ? msg : `${field.replace(/_/g, " ")}: ${msg}`;
    }
  }
  return null;
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

let refreshing: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refresh = tokens.refresh();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { access: string; refresh?: string };
    tokens.set(data.access, data.refresh);
    return true;
  } catch {
    return false;
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: Method;
  body?: unknown;
  auth?: boolean;
}

export async function api<T>(path: string, { method = "GET", body, auth = true }: RequestOptions = {}): Promise<T> {
  const send = () => {
    const headers: Record<string, string> = { Accept: "application/json" };
    const access = tokens.access();
    if (auth && access) headers.Authorization = `Bearer ${access}`;
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
    return fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  };

  // Not signed in: fail fast instead of sending a request that can only return 401.
  if (auth && !tokens.access() && !tokens.refresh()) {
    throw new ApiError(401, { detail: "You are not signed in." });
  }

  let res = await send();

  if (res.status === 401 && auth && tokens.refresh()) {
    refreshing ??= refreshAccessToken().finally(() => {
      refreshing = null;
    });
    if (await refreshing) res = await send();
  }

  if (res.status === 401 && auth) {
    tokens.clear();
    window.dispatchEvent(new Event("auth:logout"));
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data);
  }

  if (res.status === 204 || res.status === 205) return undefined as T;
  return (await res.json()) as T;
}

export function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  }
  const str = query.toString();
  return str ? `?${str}` : "";
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function initials(name: string, fallback = "?"): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback.slice(0, 1).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/**
 * Fetch a protected file (PDF, image, export) with the user's token and open or save it.
 * `mode: "open"` shows it in a new tab (PDF/images); "download" saves it with `filename`.
 */
export async function openProtectedFile(path: string, { mode = "open", filename }: { mode?: "open" | "download"; filename?: string } = {}) {
  const get = () => fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${tokens.access() ?? ""}` } });
  // Open the tab first (inside the click) so pop-up blockers allow it, then fill it once the file arrives.
  const tab = mode === "open" ? window.open("", "_blank") : null;
  let res = await get();
  if (res.status === 401 && tokens.refresh()) {
    refreshing ??= refreshAccessToken().finally(() => {
      refreshing = null;
    });
    if (await refreshing) res = await get();
  }
  if (!res.ok) {
    tab?.close();
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  if (tab) {
    tab.location.href = url;
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
