import { describe, it, expect } from "vitest";
import { shouldRetry, isAbortError, QUERY_DEFAULTS } from "../lib/queryClient";
import { ApiClientError } from "../lib/apiClient";

describe("queryClient retry policy", () => {
  it("mặc định: staleTime 2 phút, gcTime 10 phút, tối đa 1 lần retry", () => {
    expect(QUERY_DEFAULTS.staleTime).toBe(120_000);
    expect(QUERY_DEFAULTS.gcTime).toBe(600_000);
    expect(QUERY_DEFAULTS.retries).toBe(1);
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
