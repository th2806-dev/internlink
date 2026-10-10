import { useCallback, useEffect, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { weeklyReportService } from "../services/weeklyReport.service";
import { queryKeys } from "../lib/queryKeys";
import { toSkipTake } from "../lib/pagination";
import { mapUiWeeklyReportReviewStatusToApi } from "../lib/portalMappers";
import { useDebouncedValue } from "./useDebouncedValue";
import type { WeeklyReportDto } from "../types/api";

export const REPORTS_PAGE_SIZE = 20;
export const SEARCH_DEBOUNCE_MS = 350;

/** KPI đếm trên TOÀN BỘ kỳ (server-side), không phụ thuộc trang/bộ lọc hiện tại. */
export interface WeeklyReportTotals {
  total: number;
  pending: number;
  revision: number;
  approved: number;
}

/** Bộ lọc + trang gộp trong MỘT state → mọi thay đổi đổi key nguyên tử (không fetch trang cũ với filter mới). */
export interface ReportsQueryState {
  status: string;
  searchTerm: string;
  page: number;
}

export interface UseLecturerReportsQueryOptions {
  semesterId?: string;
  enabled?: boolean;
  pageSize?: number;
  /** Gọi sau khi duyệt thành công để đồng bộ các cache khác (portal legacy/dashboard). */
  onReviewed?: () => void;
}

async function fetchTotals(
  semesterId: string | undefined,
  signal: AbortSignal,
): Promise<WeeklyReportTotals> {
  const countBy = (status?: string) =>
    weeklyReportService
      .getAllForLecturer({ semesterId, skip: 0, take: 1, status, signal })
      .then((res) => res.total);
  const [total, pending, revision, approved] = await Promise.all([
    countBy(),
    countBy("Submitted"),
    countBy("RevisionRequested"),
    countBy("Approved"),
  ]);
  return { total, pending, revision, approved };
}

/**
 * Lát dọc tiên phong (Gold Standard) — quản lý toàn bộ dữ liệu trang
 * `/lecturer/reports` theo TanStack Query:
 *
 * - Race-condition free: mỗi request nhận `AbortSignal`, response cũ không bao giờ ghi đè UI.
 * - `placeholderData: keepPreviousData` → chuyển trang giữ nguyên layout, không nhấp nháy.
 * - Debounce 350ms cho ô tìm kiếm.
 * - Auto cache invalidation sau khi duyệt báo cáo.
 * - Tách bạch 3 trạng thái: isLoading / isError / is_empty.
 */
export function useLecturerReportsQuery(options: UseLecturerReportsQueryOptions = {}) {
  const {
    semesterId,
    enabled = true,
    pageSize = REPORTS_PAGE_SIZE,
    onReviewed,
  } = options;
  const queryClient = useQueryClient();

  // Giá trị gõ tức thì (control ô input)…
  const [searchInput, setSearchInput] = useState("");
  // …và giá trị đã debounce đưa vào query (chỉ phát sinh 1 request sau khi gõ ngừng).
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  const [query, setQuery] = useState<ReportsQueryState>({
    status: "",
    searchTerm: "",
    page: 1,
  });

  // Đồng bộ debounce → query NGUYÊN TỬ (searchTerm + reset page trong cùng 1 set state).
  useEffect(() => {
    setQuery((prev) =>
      prev.searchTerm === debouncedSearch ? prev : { ...prev, searchTerm: debouncedSearch, page: 1 },
    );
  }, [debouncedSearch]);

  const listQuery = useQuery({
    queryKey: queryKeys.lecturerReports.list({
      semesterId: semesterId ?? "all",
      status: query.status,
      search: query.searchTerm,
      page: query.page,
      pageSize,
    }),
    queryFn: ({ signal }) =>
      weeklyReportService.getAllForLecturer({
        semesterId,
        skip: toSkipTake({ page: query.page, pageSize }).skip,
        take: pageSize,
        status: query.status || undefined,
        searchTerm: query.searchTerm || undefined,
        signal,
      }),
    // Giữ dữ liệu trang cũ (mờ nhẹ) cho đến khi trang mới về → không giật màn hình trắng.
    placeholderData: keepPreviousData,
    enabled,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  const totalsQuery = useQuery({
    queryKey: queryKeys.lecturerReports.totals(semesterId),
    queryFn: ({ signal }) => fetchTotals(semesterId, signal),
    enabled,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  const reviewMutation = useMutation({
    mutationFn: (vars: { id: string; uiStatus: string; comment?: string; qualityScore?: number }) =>
      weeklyReportService.review(vars.id, {
        status: mapUiWeeklyReportReviewStatusToApi(vars.uiStatus),
        lecturerComment: vars.comment?.trim() || undefined,
        qualityScore: vars.qualityScore,
      }),
    onSuccess: () => {
      // Auto sync: làm mới toàn bộ namespace báo cáo và điểm thực tập → bảng cập nhật ngay, không cần F5.
      void queryClient.invalidateQueries({ queryKey: queryKeys.lecturerReports.all });
      void queryClient.invalidateQueries({ queryKey: ["internship-grading"] });
      onReviewed?.();
    },
  });

  const setStatus = useCallback((status: string) => {
    setQuery((prev) => ({ ...prev, status, page: 1 }));
  }, []);

  const setSearchTerm = useCallback((searchTerm: string) => {
    setSearchInput(searchTerm);
  }, []);

  /** Áp dụng ngay lập tức (nút "Tìm"/Enter) thay vì chờ hết debounce. */
  const applySearch = useCallback(() => {
    setQuery((prev) =>
      prev.searchTerm === searchInput ? prev : { ...prev, searchTerm: searchInput, page: 1 },
    );
  }, [searchInput]);

  /** Xóa toàn bộ bộ lọc (status + search) và quay về trang 1. */
  const clearFilters = useCallback(() => {
    setSearchInput("");
    setQuery((prev) =>
      prev.status === "" && prev.searchTerm === "" && prev.page === 1
        ? prev
        : { status: "", searchTerm: "", page: 1 },
    );
  }, []);

  const goToPage = useCallback((page: number) => {
    setQuery((prev) => ({ ...prev, page: Math.max(1, Math.floor(page)) }));
  }, []);

  const items: WeeklyReportDto[] = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;

  return {
    // Dữ liệu
    items,
    totals: totalsQuery.data,
    isTotalsPending: totalsQuery.isPending,
    isTotalsError: totalsQuery.isError,
    totalsError: totalsQuery.error,
    refetchTotals: totalsQuery.refetch,
    // Trạng thái 3 chiều (Loading / Error / Empty) — UI KHÔNG được trộn lẫn.
    isPending: listQuery.isPending,
    isError: listQuery.isError,
    error: listQuery.error,
    isFetching: listQuery.isFetching,
    /** Đang giữ dữ liệu trang trước khi trang mới về (layout stability). */
    isPlaceholderData: listQuery.isPlaceholderData,
    refetch: listQuery.refetch,
    // Bộ lọc & phân trang
    filter: { status: query.status, searchTerm: searchInput, appliedSearchTerm: query.searchTerm },
    page: query.page,
    pageSize,
    pagination: {
      total,
      page: query.page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      from: total === 0 ? 0 : (query.page - 1) * pageSize + 1,
      to: Math.min(query.page * pageSize, total),
      hasPrev: query.page > 1,
      hasNext: query.page * pageSize < total,
    },
    setStatus,
    setSearchTerm,
    applySearch,
    clearFilters,
    goToPage,
    // Mutation duyệt / yêu cầu chỉnh sửa
    reviewReport: reviewMutation.mutateAsync,
    isReviewing: reviewMutation.isPending,
    reviewError: reviewMutation.error,
  };
}
