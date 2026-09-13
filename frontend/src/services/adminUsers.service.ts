import { apiRequest } from "../lib/apiClient";
import type { PaginatedResponse, UserDto } from "../types/api";

export const adminUsersService = {
  getAll(params?: {
    skip?: number;
    take?: number;
    role?: string;
    isActive?: boolean;
    searchTerm?: string;
  }): Promise<PaginatedResponse<UserDto>> {
    const q = new URLSearchParams();
    q.set("skip", String(params?.skip ?? 0));
    q.set("take", String(params?.take ?? 200));
    if (params?.role) q.set("role", params.role);
    if (params?.isActive != null) q.set("isActive", String(params.isActive));
    if (params?.searchTerm) q.set("searchTerm", params.searchTerm);
    return apiRequest<PaginatedResponse<UserDto>>(
      `/api/Admin/users?${q.toString()}`,
    );
  },

  resetPassword(id: string) {
    return apiRequest<{ userId: string; username: string; emailSent: boolean }>(
      `/api/Admin/users/${id}/reset-password`,
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
  }): Promise<UserDto> {
    return apiRequest<UserDto>("/api/Admin/users", {
      method: "POST",
      body,
    });
  },

  update(
    id: string,
    body: { fullName: string; email?: string; isActive: boolean },
  ): Promise<UserDto> {
    return apiRequest<UserDto>(`/api/Admin/users/${id}`, {
      method: "PUT",
      body,
    });
  },

  delete(id: string): Promise<void> {
    return apiRequest<void>(`/api/Admin/users/${id}`, { method: "DELETE" });
  },
};
