import { useCallback, useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminAssignmentsService } from "../services/adminAssignments.service";
import type { LecturerAssignmentItemDto } from "../types/api";
import { adminStudentsService, type AdminStudentsSearchParams } from "../services/adminStudents.service";
import { mapStudentDtoToRow } from "../lib/adminMappers";
import { queryKeys } from "../lib/queryKeys";
import { useDebouncedValue } from "./useDebouncedValue";
import { ApiClientError, getApiErrorMessage } from "../lib/apiClient";

export const STUDENTS_SEARCH_DEBOUNCE_MS = 350;
export const STUDENTS_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export type AdminStudentRow = ReturnType<typeof mapStudentDtoToRow>;

/** Gộp filter + trang trong MỘT state → mọi thay đổi đổi key nguyên tử. */
export interface AdminStudentsFilterState {
  search: string;
  class: string;
  accountStatus: string;
  internshipStatus: string;
  sortBy: string;
  page: number;
}

export interface UseAdminStudentsQueryOptions {
  semesterId?: string;
  departmentId?: string;
  pageSize?: number;
  enabled?: boolean;
  /** Toast khi mutation lỗi (hook không render UI). */
  onError?: (message: string) => void;
}

/**
 * Lát dọc Giai đoạn 3 — danh sách Sinh viên (`/admin/students`):
 * - Server-side search/class/account-status/internship-status/sort/pagination
 *   qua `POST /Admin/students/search` (bỏ hẳn take:500 + join users/assignments client-side).
 * - Join GVHD/Doanh nghiệp CHỈ cho trang hiện tại (assignments theo batchstudentIds).
 * - `keepPreviousData` + debounce 350ms + AbortSignal (race-condition free).
 * - KPI counts (tổng/đã cấp TK/chưa TK/đã có DN) tính trên TOÀN BỘ kỳ bằng 4 request take=1.
 * - Mutation (tạo/sửa/xóa/cấp TK) → auto invalidation namespace `admin.students`.
 */
export function useAdminStudentsQuery(options: UseAdminStudentsQueryOptions = {}) {
  const {
    semesterId,
    departmentId,
    pageSize: initialPageSize = STUDENTS_PAGE_SIZE_OPTIONS[1],
    enabled = true,
    onError,
  } = options;
  // pageSize điều khiển được từ UI (dropdown số dòng/trang) — option chỉ là giá trị khởi tạo.
  const [pageSize, setPageSize] = useState(initialPageSize);
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, STUDENTS_SEARCH_DEBOUNCE_MS);

  const [filter, setFilter] = useState<AdminStudentsFilterState>({
    search: "",
    class: "all",
    accountStatus: "all",
    internshipStatus: "all",
    sortBy: "ten",
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

  /** Map "ten" (UI) → "name" (API). */
  const apiSortBy =
    filter.sortBy === "mssv" ? "mssv" : filter.sortBy === "class" ? "class" : "name";

  const listQuery = useQuery({
    queryKey: queryKeys.admin.students.list({
      semesterId: semesterId ?? "all",
      departmentId: departmentId ?? "all",
      search: filter.search,
      class: filter.class,
      accountStatus: filter.accountStatus,
      internshipStatus: filter.internshipStatus,
      sortBy: filter.sortBy,
      page: filter.page,
      pageSize,
    }),
    queryFn: async ({ signal }) => {
      // search() tự tính skip từ page/pageSize (toSkipTake nội bộ).
      const searchParams: AdminStudentsSearchParams = {
        page: filter.page,
        pageSize,
        searchTerm: filter.search || undefined,
        class: filter.class !== "all" ? filter.class : undefined,
        accountStatus: filter.accountStatus !== "all" ? filter.accountStatus : undefined,
        internshipStatus: filter.internshipStatus !== "all" ? filter.internshipStatus : undefined,
        sortBy: apiSortBy,
        signal,
        ...commonParams,
      };

      const pageRes = await adminStudentsService.search(searchParams);

      // Join GV/Doanh nghiệp CHỈ cho trang hiện tại — server lọc theo studentIds,
      // không tải toàn bộ phân công của kỳ về client.
      const pageStudentIds = pageRes.items.map((s) => s.id);
      const assignments = await adminAssignmentsService
        .getAll(commonParams.semesterId, commonParams.departmentId, pageStudentIds)
        .catch((): LecturerAssignmentItemDto[] => []);

      const assignmentByStudent = new Map(assignments.map((a) => [a.studentId, a]));

      const rows = pageRes.items.map((dto) => {
        const assignment = assignmentByStudent.get(dto.id);
        // Trạng thái tài khoản lấy thẳng từ DTO (AccountIsActive do backend ghép User) —
        // không còn cần bulk-load bảng users.
        return mapStudentDtoToRow(dto, {
          assignment: assignment
            ? {
                lecturerName: assignment.lecturerName,
                companyName: assignment.companyName,
                status: assignment.status,
              }
            : undefined,
          user:
            dto.accountIsActive == null
              ? null
              : {
                  isActive: dto.accountIsActive,
                  lastLoginAt: dto.accountLastLoginAt ?? undefined,
                },
        });
      });

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

  /** KPI toàn kỳ (server-side): tổng / đã cấp TK / chưa TK / đã có DN. */
  const countsQuery = useQuery({
    queryKey: queryKeys.admin.students.counts({ ...commonParams }),
    queryFn: async ({ signal }) => {
      const countBy = (params: Partial<AdminStudentsSearchParams>) =>
        adminStudentsService
          .search({ ...commonParams, page: 1, pageSize: 1, signal, ...params })
          .then((res) => res.total)
          .catch(() => 0);
      const [total, active, pending, hasCompany] = await Promise.all([
        countBy({}),
        countBy({ accountStatus: "active" }),
        countBy({ accountStatus: "pending" }),
        countBy({ internshipStatus: "hasCompany" }),
      ]);
      return { total, active, pending, hasCompany };
    },
    enabled,
  });

  /** Danh sách lớp cho dropdown filter (server-side distinct). */
  const classOptionsQuery = useQuery({
    queryKey: queryKeys.admin.students.options({ ...commonParams }),
    queryFn: ({ signal }) =>
      adminStudentsService.getClassOptions(
        commonParams.semesterId,
        commonParams.departmentId,
        signal,
      ),
    enabled,
    staleTime: 5 * 60 * 1000, // danh sách lớp ít đổi → 5 phút
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.students.all });
  }, [queryClient]);

  const invalidateAfterGrant = useCallback(() => {
    // Cấp tài khoản đổi cả users → invalidate users namespace.
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
    invalidate();
  }, [queryClient, invalidate]);

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof adminStudentsService.create>[0]) =>
      adminStudentsService.create(payload),
    onSuccess: invalidate,
    onError: (err) => onError?.(getApiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; payload: Parameters<typeof adminStudentsService.update>[1] }) =>
      adminStudentsService.update(vars.id, vars.payload),
    onSuccess: invalidate,
    onError: (err) => onError?.(getApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminStudentsService.delete(id),
    onSuccess: invalidate,
    onError: (err) => onError?.(getApiErrorMessage(err)),
  });

  /** Cấp tài khoản nhanh = update với grantAccount=true (như luồng hiện nay). */
  const grantAccountMutation = useMutation({
    mutationFn: (vars: { id: string; payload: Record<string, unknown> }) =>
      adminStudentsService.update(vars.id, vars.payload as Parameters<typeof adminStudentsService.update>[1]),
    onSuccess: invalidateAfterGrant,
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

  const setClassFilter = useCallback((cls: string) => {
    setFilter((prev) => (prev.class === cls ? prev : { ...prev, class: cls, page: 1 }));
  }, []);

  const setAccountStatusFilter = useCallback((status: string) => {
    setFilter((prev) =>
      prev.accountStatus === status ? prev : { ...prev, accountStatus: status, page: 1 },
    );
  }, []);

  const setInternshipStatusFilter = useCallback((status: string) => {
    setFilter((prev) =>
      prev.internshipStatus === status ? prev : { ...prev, internshipStatus: status, page: 1 },
    );
  }, []);

  const setSortBy = useCallback((sortBy: string) => {
    setFilter((prev) => (prev.sortBy === sortBy ? prev : { ...prev, sortBy, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setFilter((prev) => {
      const next: AdminStudentsFilterState = {
        search: "",
        class: "all",
        accountStatus: "all",
        internshipStatus: "all",
        sortBy: "ten",
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
    students: data?.rows ?? [],
    totalCount,
    counts: countsQuery.data ?? { total: 0, active: 0, pending: 0, hasCompany: 0 },
    isCountsPending: countsQuery.isPending,
    classOptions: classOptionsQuery.data ?? [],
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
    setClassFilter,
    setAccountStatusFilter,
    setInternshipStatusFilter,
    setSortBy,
    clearFilters,
    goToPage,
    setPageSize,
    // Mutations
    createStudent: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateStudent: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteStudent: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    grantAccount: grantAccountMutation.mutateAsync,
    isGranting: grantAccountMutation.isPending,
    mutationError: getMutationError(
      createMutation.error ?? updateMutation.error ?? deleteMutation.error ?? grantAccountMutation.error,
    ),
  };
}

function getMutationError(error: unknown): ApiClientError | null {
  return error instanceof ApiClientError ? error : null;
}
