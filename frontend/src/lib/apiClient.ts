import { API_BASE_URL, TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY } from "../config/env";
import type { ApiResponse } from "../types/api";
import { toVietnameseMessage } from "./viMessageMap";

export class ApiClientError extends Error {
  status: number;
  body?: ApiResponse<unknown>;

  constructor(message: string, status: number, body?: ApiResponse<unknown>) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.body = body;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function setStoredRefreshToken(token: string | null): void {
  if (token) localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function clearAuthTokens(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function getApiErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) return toVietnameseMessage(err.message);
  if (err instanceof Error) return toVietnameseMessage(err.message);
  return "Đã xảy ra lỗi không xác định.";
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
  _retry?: boolean;
  skipCache?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;
const inFlightGetRequests = new Map<string, Promise<unknown>>();
const apiGetCache = new Map<string, { data: unknown; expiresAt: number }>();
const DEFAULT_GET_CACHE_TTL = 20_000; // 20s cache for GET

export function clearApiCache(): void {
  apiGetCache.clear();
  inFlightGetRequests.clear();
}

function dispatchUnauthorized(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("internlink:unauthorized", {
        detail: { status: 401, message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ." },
      }),
    );
  }
}

async function attemptRefreshToken(): Promise<string | null> {
  const currentAccessToken = getStoredToken();
  const currentRefreshToken = getStoredRefreshToken();

  if (!currentAccessToken || !currentRefreshToken) {
    clearAuthTokens();
    return null;
  }

  try {
    const url = resolveApiUrl("/api/Auth/refresh-token");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: currentAccessToken,
        refreshToken: currentRefreshToken,
      }),
    });

    if (!res.ok) {
      clearAuthTokens();
      dispatchUnauthorized();
      return null;
    }

    const json = (await res.json()) as ApiResponse<{ token: string; refreshToken?: string }>;
    if (json.success && json.data?.token) {
      setStoredToken(json.data.token);
      if (json.data.refreshToken) {
        setStoredRefreshToken(json.data.refreshToken);
      }
      return json.data.token;
    }

    clearAuthTokens();
    dispatchUnauthorized();
    return null;
  } catch {
    clearAuthTokens();
    dispatchUnauthorized();
    return null;
  }
}

async function parseJson<T>(res: Response): Promise<ApiResponse<T>> {
  const text = await res.text();
  if (!text) {
    return { success: res.ok, data: undefined };
  }
  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    throw new ApiClientError(
      res.ok ? "Phản hồi API không hợp lệ." : `HTTP ${res.status}`,
      res.status,
    );
  }
}

export function resolveApiUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const base = API_BASE_URL.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  if (base.endsWith("/api") && p.startsWith("/api/")) {
    return `${base}${p.slice(4)}`;
  }
  return `${base}${p}`;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const isGet = method === "GET";
  const url = resolveApiUrl(path);
  const cacheKey = `${url}|auth=${Boolean(options.auth !== false)}`;

  if (isGet && !options.skipCache) {
    const cached = apiGetCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }
    const inFlight = inFlightGetRequests.get(cacheKey);
    if (inFlight) {
      return inFlight as Promise<T>;
    }
  }

  const performFetch = async (): Promise<T> => {
    const { body, auth = true, headers, _retry = false, skipCache: _skip, ...rest } = options;

    const reqHeaders = new Headers(headers);
    if (body !== undefined && !(body instanceof FormData)) {
      reqHeaders.set("Content-Type", "application/json");
    }
    if (auth) {
      const token = getStoredToken();
      if (token) reqHeaders.set("Authorization", `Bearer ${token}`);
    }

    const res = await fetch(url, {
      ...rest,
      method,
      headers: reqHeaders,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });

    // Handle Token Expiry & Automatic Refresh Token Flow
    if (res.status === 401 && auth && !_retry && !path.includes("/api/Auth/login") && !path.includes("/api/Auth/refresh-token")) {
      if (!refreshPromise) {
        refreshPromise = attemptRefreshToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        // Retry original request with fresh access token
        return apiRequest<T>(path, {
          ...options,
          _retry: true,
          skipCache: true,
        });
      }
    }

    const payload = await parseJson<T>(res);

    if (res.status === 401) {
      clearAuthTokens();
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("internlink:unauthorized", {
            detail: { status: 401, message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ." },
          }),
        );
      }
    }

    if (!res.ok || payload.success === false) {
      const msg =
        payload.error?.title ||
        payload.error?.detail ||
        (res.status === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." : `HTTP ${res.status}`);
      throw new ApiClientError(msg, res.status, payload);
    }

    const result = payload.data as T;

    if (isGet && !options.skipCache) {
      apiGetCache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + DEFAULT_GET_CACHE_TTL,
      });
    } else if (!isGet) {
      // Invalidate cache on mutations (POST, PUT, DELETE)
      clearApiCache();
    }

    return result;
  };

  if (isGet && !options.skipCache) {
    const promise = performFetch().finally(() => {
      inFlightGetRequests.delete(cacheKey);
    });
    inFlightGetRequests.set(cacheKey, promise);
    return promise;
  }

  return performFetch();
}

/** For endpoints that return raw JSON (e.g. EvaluationController). */
export async function apiRequestRaw<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth = true, headers, _retry = false, ...rest } = options;
  const url = resolveApiUrl(path);

  const reqHeaders = new Headers(headers);
  if (body !== undefined && !(body instanceof FormData)) {
    reqHeaders.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getStoredToken();
    if (token) reqHeaders.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...rest,
    headers: reqHeaders,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });

  // Handle Token Expiry & Automatic Refresh Token Flow
  if (res.status === 401 && auth && !_retry && !path.includes("/api/Auth/login") && !path.includes("/api/Auth/refresh-token")) {
    if (!refreshPromise) {
      refreshPromise = attemptRefreshToken().finally(() => {
        refreshPromise = null;
      });
    }

    const newToken = await refreshPromise;
    if (newToken) {
      return apiRequestRaw<T>(path, {
        ...options,
        _retry: true,
      });
    }
  }

  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401) {
      clearAuthTokens();
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("internlink:unauthorized", {
            detail: { status: 401, message: "Phiên đăng nhập đã hết hạn." },
          }),
        );
      }
    }
    let msg = res.status === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." : `HTTP ${res.status}`;
    try {
      const err = JSON.parse(text) as { message?: string; title?: string };
      msg = err.message ?? err.title ?? msg;
    } catch {
      /* ignore */
    }
    throw new ApiClientError(msg, res.status);
  }

  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function parseContentDispositionFilename(
  header: string | null,
): string | null {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(header);
  return match ? decodeURIComponent(match[1].replace(/"/g, "")) : null;
}

/** Download binary file with JWT auth and trigger browser download. */
export async function downloadAuthenticatedFile(
  path: string,
  fallbackFilename: string,
  autoTrigger = true,
  options: RequestInit = {},
): Promise<{ blob: Blob; filename: string }> {
  const url = resolveApiUrl(path);
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && typeof options.body !== "string") {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body && !(options.body instanceof FormData) && typeof options.body !== "string"
      ? JSON.stringify(options.body)
      : options.body,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as ApiResponse<unknown>;
      msg = err.error?.title ?? err.error?.detail ?? msg;
    } catch {
      /* binary or empty body */
    }
    throw new ApiClientError(msg, res.status);
  }
  const filename =
    parseContentDispositionFilename(res.headers.get("Content-Disposition")) ??
    fallbackFilename;
  const blob = await res.blob();
  if (autoTrigger && typeof window !== "undefined") {
    triggerBlobDownload(blob, filename);
  }
  return { blob, filename };
}

/** Trigger browser download for a blob (works reliably across browsers). */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Normalizes any backend list or paginated response format into a standard structure:
 * { items: T[], total: number, page: number, pageSize: number, totalPages: number }
 */
export function normalizePaginatedData<T>(
  res: unknown,
  defaultPage = 1,
  defaultPageSize = 50,
): {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  if (!res) {
    return { items: [], total: 0, page: defaultPage, pageSize: defaultPageSize, totalPages: 0 };
  }

  // If res is directly an array
  if (Array.isArray(res)) {
    return {
      items: res as T[],
      total: res.length,
      page: defaultPage,
      pageSize: defaultPageSize,
      totalPages: Math.ceil(res.length / defaultPageSize) || 1,
    };
  }

  const obj = res as Record<string, unknown>;

  // Check items / data / results array
  let items: T[] = [];
  if (Array.isArray(obj.items)) items = obj.items as T[];
  else if (Array.isArray(obj.data)) items = obj.data as T[];
  else if (Array.isArray(obj.results)) items = obj.results as T[];

  const total =
    typeof obj.total === "number"
      ? obj.total
      : typeof obj.totalCount === "number"
        ? obj.totalCount
        : typeof obj.count === "number"
          ? obj.count
          : items.length;

  const pageSize =
    typeof obj.pageSize === "number"
      ? obj.pageSize
      : typeof obj.take === "number"
        ? obj.take
        : defaultPageSize;

  const page =
    typeof obj.currentPage === "number"
      ? obj.currentPage
      : typeof obj.page === "number"
        ? obj.page
        : typeof obj.pageIndex === "number"
          ? obj.pageIndex + 1
          : typeof obj.skip === "number" && pageSize > 0
            ? Math.floor(obj.skip / pageSize) + 1
            : defaultPage;

  const totalPages =
    typeof obj.totalPages === "number"
      ? obj.totalPages
      : Math.ceil(total / (pageSize || 1)) || 1;

  return { items, total, page, pageSize, totalPages };
}

/**
 * Convenient extractor that reliably returns an array from any API payload
 */
export function extractItems<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (!res || typeof res !== "object") return [];
  const obj = res as Record<string, unknown>;
  if (Array.isArray(obj.items)) return obj.items as T[];
  if (Array.isArray(obj.data)) return obj.data as T[];
  if (Array.isArray(obj.results)) return obj.results as T[];
  return [];
}

