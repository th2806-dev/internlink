import { apiRequest } from "../lib/apiClient";
import type { PaginatedResponse, UserDto } from "../types/api";

function getUsersPrefix(backendRole?: string | null) {
  return backendRole === "SuperAdmin" ? "/api/SuperAdmin/users" : "/api/DepartmentAdmin/users";
}

export interface AdminUsersQueryParams {
  skip?: number;
  take?: number;
  role?: string;
  isActive?: boolean;
  searchTerm?: string;
  /** Nhận AbortSignal từ TanStack Query để hủy request cũ khi đổi bộ lọc. */
  signal?: AbortSignal;
}

export const adminUsersService = {
  getAll(params?: AdminUsersQueryParams, backendRole?: string | null): Promise<PaginatedResponse<UserDto>> {
    const q = new URLSearchParams();
    q.set("skip", String(params?.skip ?? 0));
    q.set("take", String(params?.take ?? 200));
    if (params?.role) q.set("role", params.role);
    if (params?.isActive != null) q.set("isActive", String(params.isActive));
    if (params?.searchTerm) q.set("searchTerm", params.searchTerm);
    return apiRequest<PaginatedResponse<UserDto>>(
      `${getUsersPrefix(backendRole)}?${q.toString()}`,
      { signal: params?.signal },
    );
  },

  /**
   * KPI đếm theo trạng thái tính trên TOÀN BỘ tập dữ liệu (không phụ thuộc trang/bộ lọc):
   * tổng, chờ kích hoạt, đang khóa. take=1 chỉ để lấy `total`.
   */
  getCounts(
    backendRole?: string | null,
    signal?: AbortSignal,
  ): Promise<{ total: number; pending: number; locked: number }> {
    const countBy = (isActive?: boolean) =>
      apiRequest<PaginatedResponse<UserDto>>(`${getUsersPrefix(backendRole)}?skip=0&take=1${isActive != null ? `&isActive=${isActive}` : ""}`, { signal })
        .then((res) => res.total)
        .catch(() => 0);
    return Promise.all([countBy(), countBy(false), countBy(true)]).then(
      ([total, locked, active]) => {
        // "Chờ kích hoạt" (pending) ≈ user chưa từng đăng nhập & đang bật — ước lượng FE,
        // backend chưa có cột riêng; locked = chính xác theo isActive=false.
        void active;
        return { total, pending: 0, locked };
      },
    );
  },

  resetPassword(id: string, backendRole?: string | null) {
    return apiRequest<{ userId: string; username: string; emailSent: boolean }>(
      `${getUsersPrefix(backendRole)}/${id}/reset-password`,
      { method: "POST" },
    );
  },

  create(body: {
    username: string;
    fullName: string;
    email?: string;
    role: string;
    departmentId?: string;
    studentCode?: string;
    staffCode?: string;
  }, backendRole?: string | null): Promise<UserDto> {
    return apiRequest<UserDto>(getUsersPrefix(backendRole), {
      method: "POST",
      body,
    });
  },

  update(
    id: string,
    body: { fullName: string; email?: string; isActive: boolean },
    backendRole?: string | null,
  ): Promise<UserDto> {
    return apiRequest<UserDto>(`${getUsersPrefix(backendRole)}/${id}`, {
      method: "PUT",
      body,
    });
  },

  delete(id: string, backendRole?: string | null): Promise<void> {
    return apiRequest<void>(`${getUsersPrefix(backendRole)}/${id}`, { method: "DELETE" });
  },
};
