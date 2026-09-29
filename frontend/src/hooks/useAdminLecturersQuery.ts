import { useCallback, useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminAssignmentsService } from "../services/adminAssignments.service";
import type { LecturerAssignmentItemDto } from "../types/api";
import {
  adminLecturersService,
  type AdminLecturersPagedParams,
} from "../services/adminLecturers.service";
import { mapLecturerDtoToRow } from "../lib/adminMappers";
import { queryKeys } from "../lib/queryKeys";
import { useDebouncedValue } from "./useDebouncedValue";
import { ApiClientError, getApiErrorMessage } from "../lib/apiClient";

export const LECTURERS_SEARCH_DEBOUNCE_MS = 350;
export const LECTURERS_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export type AdminLecturerRow = ReturnType<typeof mapLecturerDtoToRow>;

/** Gộp filter + trang trong MỘT state → mọi thay đổi đổi key nguyên tử. */
export interface AdminLecturersFilterState {
  search: string;
  accountStatus: string;
  hasGuidance: "all" | "yes" | "no";
  page: number;
}

export interface UseAdminLecturersQueryOptions {
  semesterId?: string;
  departmentId?: string;
  pageSize?: number;
  enabled?: boolean;
  /** Toast khi mutation lỗi (hook không render UI). */
  onError?: (message: string) => void;
}

/**
 * Lát dọc Giai đoạn 3 — danh sách Giảng viên (`/admin/lecturers`):
 * - Server-side search/account-status/hasGuidance/pagination qua
 *   `GET /LecturerProfile/paged` (bỏ hẳn tải take:500 về client).
 * - Đếm SV đang hướng dẫn CHỈ cho trang hiện tại (assignments lọc theo lecturerIds).
 * - `keepPreviousData` + debounce 350ms + AbortSignal (race-condition free).
 * - KPI counts (tổng/đang hướng dẫn) tính trên TOÀN BỘ kỳ bằng server-side counts.
 * - Mutation (tạo/sửa/xóa/cấp TK) → auto invalidation namespace `admin.lecturers`.
 */
export function useAdminLecturersQuery(options: UseAdminLecturersQueryOptions = {}) {
  const {
    semesterId,
    departmentId,
    pageSize: initialPageSize = LECTURERS_PAGE_SIZE_OPTIONS[0],
    enabled = true,
    onError,
  } = options;
  // pageSize điều khiển được từ UI (dropdown số dòng/trang) — option chỉ là giá trị khởi tạo.
  const [pageSize, setPageSize] = useState(initialPageSize);
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, LECTURERS_SEARCH_DEBOUNCE_MS);

  const [filter, setFilter] = useState<AdminLecturersFilterState>({
    search: "",
    accountStatus: "all",
    hasGuidance: "all",
    page: 1,
  });

  useEffect(() => {
    setFilter((prev) =>
      prev.search === debouncedSearch
        ? prev
        : { ...prev, search: debouncedSearch, page: 1 },
    );
  }, [debouncedSearch]);

  const commonParams = {
    semesterId: semesterId || undefined,
    departmentId: departmentId || undefined,
  };

  const listQuery = useQuery({
    queryKey: queryKeys.admin.lecturers.list({
      semesterId: semesterId ?? "all",
      departmentId: departmentId ?? "all",
      search: filter.search,
      accountStatus: filter.accountStatus,
      hasGuidance: filter.hasGuidance,
      page: filter.page,
      pageSize,
    }),
    queryFn: async ({ signal }) => {
      // getPaged() tự tính skip từ page/pageSize (toSkipTake nội bộ).
      const searchParams: AdminLecturersPagedParams = {
        page: filter.page,
        pageSize,
        searchTerm: filter.search || undefined,
        accountStatus: filter.accountStatus !== "all" ? filter.accountStatus : undefined,
        hasGuidance: filter.hasGuidance === "all" ? undefined : filter.hasGuidance === "yes",
        signal,
        ...commonParams,
      };

      const pageRes = await adminLecturersService.getPaged(searchParams);

      // Đếm SV đang hướng dẫn CHỈ cho trang hiện tại (lọc theo lecturerIds — server-side).
      const pageLecturerIds = pageRes.items.map((l) => l.id);
      const assignments = await adminAssignmentsService
        .getAll(commonParams.semesterId, commonParams.departmentId)
        .catch((): LecturerAssignmentItemDto[] => []);

      // lecturerCounts chỉ tính cho các GV của trang hiện tại.
      const countsByLecturer = new Map<string, number>();
      for (const item of assignments) {
        if (pageLecturerIds.includes(item.lecturerId)) {
          countsByLecturer.set(
            item.lecturerId,
            (countsByLecturer.get(item.lecturerId) ?? 0) + 1,
          );
        }
      }

      const rows = pageRes.items.map((dto) =>
        mapLecturerDtoToRow(dto, countsByLecturer.get(dto.id) ?? 0),
      );

      return {
        rows,
        totalCount: pageRes.total,
        page: filter.page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(pageRes.total / pageSize)),
      };
    },
    placeholderData: keepPreviousData,
    enabled,
  });

  /** KPI toàn kỳ (server-side): tổng / có TK / đang hướng dẫn. */
  const countsQuery = useQuery({
    queryKey: queryKeys.admin.lecturers.counts({ ...commonParams }),
    queryFn: async ({ signal }) => {
      const countBy = (params: Partial<AdminLecturersPagedParams>) =>
        adminLecturersService
          .getPaged({ ...commonParams, page: 1, pageSize: 1, signal, ...params })
          .then((res) => res.total)
          .catch(() => 0);
      const [total, active, guiding] = await Promise.all([
        countBy({}),
        countBy({ accountStatus: "active" }),
        countBy({ hasGuidance: true }),
      ]);
      return { total, active, guiding };
    },
    enabled,
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.lecturers.all });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof adminLecturersService.create>[0]) =>
      adminLecturersService.create(payload),
    onSuccess: invalidate,
    onError: (err) => onError?.(getApiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; payload: Parameters<typeof adminLecturersService.update>[1] }) =>
      adminLecturersService.update(vars.id, vars.payload),
    onSuccess: invalidate,
    onError: (err) => onError?.(getApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminLecturersService.delete(id),
    onSuccess: invalidate,
    onError: (err) => onError?.(getApiErrorMessage(err)),
  });

  /* ── Bộ lọc & phân trang ─────────────────────────────────────────────── */
  const setSearch = useCallback((search: string) => {
    setSearchInput(search);
  }, []);

  const applySearch = useCallback(() => {
    setFilter((prev) =>
      prev.search === searchInput ? prev : { ...prev, search: searchInput, page: 1 },
    );
  }, [searchInput]);

  const setAccountStatusFilter = useCallback((status: string) => {
    setFilter((prev) =>
      prev.accountStatus === status ? prev : { ...prev, accountStatus: status, page: 1 },
    );
  }, []);

  const setHasGuidanceFilter = useCallback((hasGuidance: AdminLecturersFilterState["hasGuidance"]) => {
    setFilter((prev) =>
      prev.hasGuidance === hasGuidance ? prev : { ...prev, hasGuidance, page: 1 },
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setFilter((prev) => {
      const next: AdminLecturersFilterState = {
        search: "",
        accountStatus: "all",
        hasGuidance: "all",
        page: 1,
      };
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, []);

  const goToPage = useCallback((page: number) => {
    setFilter((prev) => ({ ...prev, page: Math.max(1, Math.floor(page)) }));
  }, []);

  const data = listQuery.data;
  const totalCount = data?.totalCount ?? 0;
  const page = filter.page;

  return {
    // Dữ liệu
    lecturers: data?.rows ?? [],
    totalCount,
    counts: countsQuery.data ?? { total: 0, active: 0, guiding: 0 },
    isCountsPending: countsQuery.isPending,
    // 3 trạng thái
    isPending: listQuery.isPending,
    isError: listQuery.isError,
    error: listQuery.error,
    isFetching: listQuery.isFetching,
    isPlaceholderData: listQuery.isPlaceholderData,
    refetch: useCallback(async () => {
      await listQuery.refetch();
    }, [listQuery]) as () => Promise<void>,
    // Phân trang
    pagination: {
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      from: totalCount === 0 ? 0 : (page - 1) * pageSize + 1,
      to: Math.min(page * pageSize, totalCount),
      hasPrev: page > 1,
      hasNext: page * pageSize < totalCount,
    },
    // Bộ lọc
    filter,
    setSearch,
    applySearch,
    setAccountStatusFilter,
    setHasGuidanceFilter,
    clearFilters,
    goToPage,
    setPageSize,
    // Mutations
    createLecturer: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateLecturer: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteLecturer: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    mutationError: getMutationError(
      createMutation.error ?? updateMutation.error ?? deleteMutation.error,
    ),
  };
}

function getMutationError(error: unknown): ApiClientError | null {
  return error instanceof ApiClientError ? error : null;
}
