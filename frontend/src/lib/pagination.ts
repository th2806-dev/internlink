import { normalizePaginatedData } from "./apiClient";

/**
 * HỢP ĐỒNG PHÂN TRANG CHUẨN (Giai đoạn 1) — giao tiếp giữa UI và mọi API danh sách.
 *
 * - Request luôn dùng `page` 1-based + `pageSize` (10/20/50).
 * - Response quy về `PagedQueryResult<T>` bất kể backend trả
 *   `{items,total,skip,take}` hay mảng thuần.
 * - `toSkipTake` là cầu nối với các API backend hiện hữu đang dùng skip/take
 *   → không cần viết lại backend để chuẩn hoá được.
 */
export interface PagedQueryRequest {
  /** Chỉ số trang bắt đầu từ 1. */
  page: number;
  /** 10 | 20 | 50 */
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PagedQueryResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 20;

/** UI page/pageSize → skip/take mà các API backend hiện hữu đang dùng. */
export function toSkipTake(request: Pick<PagedQueryRequest, "page" | "pageSize">): {
  skip: number;
  take: number;
} {
  const page = Number.isFinite(request.page) && request.page >= 1 ? Math.floor(request.page) : 1;
  const pageSize =
    Number.isFinite(request.pageSize) && request.pageSize >= 1
      ? Math.floor(request.pageSize)
      : DEFAULT_PAGE_SIZE;
  return { skip: (page - 1) * pageSize, take: pageSize };
}

/**
 * Chuyển bất kỳ kiểu phản hồi phân trang nào của backend về hợp đồng chuẩn.
 * (Dựng trên normalizePaginatedData: {items|data|results}, {total|totalCount}, {skip|take|page}…)
 */
export function toPagedResult<T>(
  raw: unknown,
  request: Pick<PagedQueryRequest, "page" | "pageSize">,
): PagedQueryResult<T> {
  const normalized = normalizePaginatedData<T>(raw, request.page, request.pageSize);
  return {
    items: normalized.items,
    totalCount: normalized.total,
    page: normalized.page,
    pageSize: normalized.pageSize > 0 ? normalized.pageSize : request.pageSize,
    totalPages: normalized.totalPages,
  };
}
