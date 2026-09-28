import { QueryClient } from "@tanstack/react-query";
import { ApiClientError } from "./apiClient";

/** Global defaults cho toàn bộ server-state (Section III — Giai đoạn 0). */
export const QUERY_DEFAULTS = {
  /** 2 phút: dữ liệu còn "tươi" → chuyển tab/quay lại thấy ngay, không spinner. */
  staleTime: 1000 * 60 * 2,
  /** 10 phút: giữ cache trong RAM rồi mới garbage-collect. */
  gcTime: 1000 * 60 * 10,
  /** Chỉ retry đúng 1 lần (xem shouldRetry). */
  retries: 1,
} as const;

export function isAbortError(error: unknown): boolean {
  // DOMException (fetch bị hủy) không kế thừa Error ở mọi runtime → so tên.
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

/**
 * Chính sách retry: thử lại TỐI ĐA 1 lần cho lỗi mạng/5xx;
 * KHÔNG retry lỗi nghiệp vụ 4xx (401/403/404...) và KHÔNG retry request đã hủy.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= QUERY_DEFAULTS.retries) return false;
  if (isAbortError(error)) return false;
  if (error instanceof ApiClientError) return error.status >= 500;
  // Lỗi mạng thuần (TypeError: Failed to fetch) hoặc chưa chuẩn hóa → thử lại 1 lần.
  return true;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_DEFAULTS.staleTime,
        gcTime: QUERY_DEFAULTS.gcTime,
        retry: shouldRetry,
      },
    },
  });
}

/** Instance dùng chung cho app (mount trong App.tsx qua QueryClientProvider). */
export const queryClient = createQueryClient();
