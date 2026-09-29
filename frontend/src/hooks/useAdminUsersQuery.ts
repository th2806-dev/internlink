import { useCallback, useEffect, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { AdminUser, AdminUserStatus } from "../types/user";
import {
  adminUsersService,
  type AdminUsersQueryParams,
} from "../services/adminUsers.service";
import { mapUserDtoToAdminUser } from "../lib/adminMappers";
import { mapAdminUserRoleToBackendRoles } from "../lib/roleMap";
import { queryKeys } from "../lib/queryKeys";
import { toSkipTake } from "../lib/pagination";
import { useAuth } from "./useAuth";
import { useDebouncedValue } from "./useDebouncedValue";
import { ApiClientError, getApiErrorMessage } from "../lib/apiClient";

export const USERS_SEARCH_DEBOUNCE_MS = 350;
/** Trang mặc định 10 dòng — đồng bộ với select số dòng trong UsersView. */
export const USERS_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

/** Một trang kết quả đã map về shape `AdminUser` của UI. */
export interface AdminUsersPage {
  users: AdminUser[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** KPI đếm trên TOÀN BỘ tập tài khoản (server-side), không phụ thuộc trang/bộ lọc. */
export interface AdminUsersCounts {
  total: number;
  locked: number;
}

/** Gộp filter + trang trong MỘT state → mọi thay đổi đổi key nguyên tử. */
export interface AdminUsersFilterState {
  search: string;
  role: "all" | "admin" | "lecturer" | "student";
  status: "all" | "active" | "locked";
  page: number;
}

export interface UseAdminUsersQueryOptions {
  pageSize?: number;
  enabled?: boolean;
  /** Toast khi mutation lỗi (hook không render UI). */
  onError?: (message: string) => void;
}

export type AdminUserRoleFilter = AdminUsersFilterState["role"];
export type AdminUserStatusFilter = AdminUsersFilterState["status"];

/**
 * Lát dọc Giai đoạn 3 — danh sách Tài khoản (`/admin/users`):
 * - Server-side search/role/status/pagination đầy đủ (bỏ tải take:500 về client).
 * - `keepPreviousData` → chuyển trang giữ bảng cũ mờ nhẹ.
 * - Debounce 350ms cho ô tìm kiếm; AbortSignal hủy request khi đổi bộ lọc.
 * - Mutation (tạo/khóa/reset/xóa) → auto invalidation namespace `admin.users`.
 */
export function useAdminUsersQuery(options: UseAdminUsersQueryOptions = {}) {
  const { pageSize: initialPageSize = 10, enabled = true, onError } = options;
  // pageSize điều khiển được từ UI (dropdown số dòng/trang) — option chỉ là giá trị khởi tạo.
  const [pageSize, setPageSize] = useState(initialPageSize);
  const { user } = useAuth();
  const backendRole = user?.backendRole;
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, USERS_SEARCH_DEBOUNCE_MS);

  const [filter, setFilter] = useState<AdminUsersFilterState>({
    search: "",
    role: "all",
    status: "all",
    page: 1,
  });

  // Debounce → filter NGUYÊN TỬ (search + reset page cùng lúc).
  useEffect(() => {
    setFilter((prev) =>
      prev.search === debouncedSearch
        ? prev
        : { ...prev, search: debouncedSearch, page: 1 },
    );
  }, [debouncedSearch]);

  const listQuery = useQuery({
    queryKey: queryKeys.admin.users.list({
      search: filter.search,
      role: filter.role,
      status: filter.status,
      page: filter.page,
      pageSize,
    }),
    queryFn: async ({ signal }): Promise<AdminUsersPage> => {
      const { skip } = toSkipTake({ page: filter.page, pageSize });
      const params: AdminUsersQueryParams = {
        skip,
        take: pageSize,
        role: mapAdminUserRoleToBackendRoles(filter.role),
        searchTerm: filter.search || undefined,
        // Backend chỉ có IsActive boolean: "locked" ⇔ isActive=false.
        isActive: filter.status === "all" ? undefined : filter.status === "active",
        signal,
      };
      const res = await adminUsersService.getAll(params, backendRole);
      return {
        users: res.items.map(mapUserDtoToAdminUser),
        totalCount: res.total,
        page: filter.page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(res.total / pageSize)),
      };
    },
    placeholderData: keepPreviousData,
    enabled,
  });

  const countsQuery = useQuery({
    queryKey: queryKeys.admin.users.counts(),
    queryFn: async ({ signal }): Promise<AdminUsersCounts> => {
      const countBy = (isActive?: boolean) =>
        adminUsersService
          .getAll({ skip: 0, take: 1, isActive, signal }, backendRole)
          .then((res) => res.total);
      const [total, locked] = await Promise.all([countBy(), countBy(false)]);
      return { total, locked };
    },
    enabled,
  });

  /** Invalidate mọi query con của admin.users (list + counts) sau mutation. */
  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: async (payload: {
      username: string;
      fullName: string;
      email?: string;
      role: string;
      studentCode?: string;
      staffCode?: string;
    }) => {
      const dto = await adminUsersService.create(payload, backendRole);
      return mapUserDtoToAdminUser(dto);
    },
    onSuccess: invalidate,
    onError: (err) => onError?.(getApiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; payload: { fullName: string; email?: string; isActive: boolean } }) =>
      adminUsersService.update(vars.id, vars.payload, backendRole),
    onSuccess: invalidate,
    onError: (err) => onError?.(getApiErrorMessage(err)),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => adminUsersService.resetPassword(id, backendRole),
    // Reset mật khẩu không đổi dữ liệu danh sách → không cần invalidate.
    onError: (err) => onError?.(getApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminUsersService.delete(id, backendRole),
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

  const setRole = useCallback((role: AdminUsersFilterState["role"]) => {
    setFilter((prev) => (prev.role === role ? prev : { ...prev, role, page: 1 }));
  }, []);

  const setStatus = useCallback((status: AdminUsersFilterState["status"]) => {
    setFilter((prev) => (prev.status === status ? prev : { ...prev, status, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setFilter((prev) =>
      prev.search === "" && prev.role === "all" && prev.status === "all" && prev.page === 1
        ? prev
        : { search: "", role: "all", status: "all", page: 1 },
    );
  }, []);

  const goToPage = useCallback((page: number) => {
    setFilter((prev) => ({ ...prev, page: Math.max(1, Math.floor(page)) }));
  }, []);

  /* ── API tương thích cho UI hiện hữu ─────────────────────────────────── */
  /** Khóa/mở khóa: toggle isActive rồi để invalidation đồng bộ lại danh sách. */
  const toggleLock = useCallback(
    async (target: AdminUser): Promise<string> => {
      const next: AdminUserStatus = target.status === "locked" ? "active" : "locked";
      await updateMutation.mutateAsync({
        id: target.id,
        payload: {
          fullName: target.fullName,
          email: target.email !== "—" ? target.email : undefined,
          isActive: next === "active",
        },
      });
      return next === "locked"
        ? `Đã khóa tài khoản ${target.code}`
        : `Đã mở khóa ${target.code}`;
    },
    [updateMutation],
  );

  const refetch = useCallback(async () => {
    await listQuery.refetch();
  }, [listQuery]);

  const data = listQuery.data;
  const totalCount = data?.totalCount ?? 0;
  const page = filter.page;

  return {
    // Dữ liệu trang hiện tại
    users: data?.users ?? [],
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
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
    counts: countsQuery.data ?? { total: 0, locked: 0 },
    // 3 trạng thái
    isPending: listQuery.isPending,
    isError: listQuery.isError,
    error: listQuery.error,
    isFetching: listQuery.isFetching,
    isPlaceholderData: listQuery.isPlaceholderData,
    refetch,
    // Bộ lọc
    filter: { ...filter, searchInput },
    setSearch,
    applySearch,
    setRole,
    setStatus,
    clearFilters,
    goToPage,
    setPageSize,
    // Mutations
    createUser: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateUser: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    toggleLock,
    isTogglingLock: updateMutation.isPending,
    resetPassword: resetPasswordMutation.mutateAsync,
    isResetting: resetPasswordMutation.isPending,
    deleteUser: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    /** Lỗi mutation gần nhất (UI có thể đọc để toast lại). */
    mutationError: getMutationError(
      createMutation.error ?? updateMutation.error ?? deleteMutation.error,
    ),
  };
}

function getMutationError(error: unknown): ApiClientError | null {
  return error instanceof ApiClientError ? error : null;
}
