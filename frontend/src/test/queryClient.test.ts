import { describe, it, expect, vi } from "vitest";
import {
  createQueryClient,
  shouldRetry,
  isAbortError,
  QUERY_DEFAULTS,
} from "../lib/queryClient";
import { ApiClientError } from "../lib/apiClient";

describe("queryClient retry policy", () => {
  it("mặc định: staleTime 5 phút, gcTime 20 phút, tối đa 1 lần retry", () => {
    expect(QUERY_DEFAULTS.staleTime).toBe(300_000);
    expect(QUERY_DEFAULTS.gcTime).toBe(1_200_000);
    expect(QUERY_DEFAULTS.retries).toBe(1);
  });

  it("reuses fresh data while allowing invalidated stale data to refresh on mount", () => {
    const options = createQueryClient().getDefaultOptions().queries;

    expect(options?.staleTime).toBe(QUERY_DEFAULTS.staleTime);
    expect(options?.gcTime).toBe(QUERY_DEFAULTS.gcTime);
    expect(options?.refetchOnWindowFocus).toBe(false);
    expect(options?.refetchOnMount).toBe(true);
    expect(options?.refetchOnReconnect).toBe(true);
  });

  it("uses cached query data until invalidated", async () => {
    const client = createQueryClient();
    const queryFn = vi.fn().mockResolvedValue("cached");
    const options = { queryKey: ["cache-first-test"], queryFn };

    await client.fetchQuery(options);
    await client.fetchQuery(options);
    expect(queryFn).toHaveBeenCalledTimes(1);

    await client.invalidateQueries({ queryKey: options.queryKey });
    await client.fetchQuery(options);
    expect(queryFn).toHaveBeenCalledTimes(2);
    client.clear();
  });

  it("KHÔNG retry lỗi nghiệp vụ 4xx (401/403/404/422)", () => {
    for (const status of [400, 401, 403, 404, 409, 422]) {
      expect(shouldRetry(0, new ApiClientError("x", status))).toBe(false);
    }
  });

  it("retry đúng 1 lần cho 5xx rồi dừng", () => {
    expect(shouldRetry(0, new ApiClientError("boom", 500))).toBe(true);
    expect(shouldRetry(1, new ApiClientError("boom", 500))).toBe(false);
    expect(shouldRetry(0, new ApiClientError("bad gateway", 502))).toBe(true);
  });

  it("retry 1 lần cho lỗi mạng thuần (TypeError), không lặp vô hạn", () => {
    expect(shouldRetry(0, new TypeError("Failed to fetch"))).toBe(true);
    expect(shouldRetry(1, new TypeError("Failed to fetch"))).toBe(false);
  });

  it("KHÔNG retry request đã bị AbortSignal hủy", () => {
    const abortError = new DOMException("Aborted", "AbortError");
    expect(isAbortError(abortError)).toBe(true);
    expect(shouldRetry(0, abortError)).toBe(false);
  });
});
