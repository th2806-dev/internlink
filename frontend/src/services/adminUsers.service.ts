import { apiRequest } from "../lib/apiClient";
import type { PaginatedResponse, UserDto } from "../types/api";

function getUsersPrefix(backendRole?: string | null) {
  return backendRole === "SuperAdmin" ? "/api/SuperAdmin/users" : "/api/DepartmentAdmin/users";
}

export const adminUsersService = {
  getAll(params?: {
    skip?: number;
    take?: number;
    role?: string;
    isActive?: boolean;
    searchTerm?: string;
  }, backendRole?: string | null): Promise<PaginatedResponse<UserDto>> {
    const q = new URLSearchParams();
    q.set("skip", String(params?.skip ?? 0));
    q.set("take", String(params?.take ?? 200));
    if (params?.role) q.set("role", params.role);
    if (params?.isActive != null) q.set("isActive", String(params.isActive));
    if (params?.searchTerm) q.set("searchTerm", params.searchTerm);
    return apiRequest<PaginatedResponse<UserDto>>(
      `${getUsersPrefix(backendRole)}?${q.toString()}`,
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
