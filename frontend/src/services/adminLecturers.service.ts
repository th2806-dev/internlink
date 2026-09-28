import { apiRequest, downloadAuthenticatedFile } from "../lib/apiClient";
import type { LecturerDto, LecturerImportResultDto, PaginatedResponse } from "../types/api";

export interface AdminLecturersPagedParams {
  /** 1-based page — adapter toSkipTake chuyển thành skip/take. */
  page?: number;
  pageSize?: number;
  /** Tìm theo tên, mã GV, email (server-side contains). */
  searchTerm?: string;
  /** active (có TK) | pending (chưa có TK). */
  accountStatus?: string;
  /** true = đang hướng dẫn ít nhất 1 SV trong scope. */
  hasGuidance?: boolean;
  semesterId?: string;
  departmentId?: string;
  /** Nhận AbortSignal từ TanStack Query để hủy request cũ. */
  signal?: AbortSignal;
}

export const adminLecturersService = {
  /**
   * LEACY: tải theo lô skip/take (GET) — còn dùng bởi modal phân công, dashboard/nav stats,
   * AssignmentsView matrix. Danh sách chính của LecturersView dùng `getPaged()`.
   */
  getAll(skip = 0, take = 500, semesterId?: string, departmentId?: string): Promise<LecturerDto[]> {
    const params = new URLSearchParams({ skip: String(skip), take: String(take) });
    if (semesterId && semesterId !== "all") params.set("semesterId", semesterId);
    if (departmentId && departmentId !== "all") params.set("departmentId", departmentId);
    return apiRequest<LecturerDto[]>(`/api/LecturerProfile?${params.toString()}`);
  },

  /** Danh sách server-side qua GET /LecturerProfile/paged (trả total). */
  getPaged(params: AdminLecturersPagedParams = {}): Promise<PaginatedResponse<LecturerDto>> {
    const { page = 1, pageSize = 20 } = params;
    const skip = (Math.max(1, page) - 1) * pageSize;
    const q = new URLSearchParams({
      skip: String(skip),
      take: String(pageSize),
    });
    if (params.searchTerm?.trim()) q.set("searchTerm", params.searchTerm.trim());
    if (params.accountStatus) q.set("accountStatus", params.accountStatus);
    if (params.hasGuidance != null) q.set("hasGuidance", String(params.hasGuidance));
    if (params.semesterId && params.semesterId !== "all") q.set("semesterId", params.semesterId);
    if (params.departmentId && params.departmentId !== "all") q.set("departmentId", params.departmentId);
    return apiRequest<PaginatedResponse<LecturerDto>>(
      `/api/LecturerProfile/paged?${q.toString()}`,
      { signal: params.signal },
    );
  },

  getById(id: string): Promise<LecturerDto> {
    return apiRequest<LecturerDto>(`/api/LecturerProfile/${id}`);
  },

  create(body: {
    staffCode: string;
    fullName: string;
    email?: string;
    phone?: string;
    department?: string;
    grantAccount?: boolean;
  }): Promise<LecturerDto> {
    return apiRequest<LecturerDto>("/api/LecturerProfile", {
      method: "POST",
      body,
    });
  },

  update(
    id: string,
    body: {
      fullName: string;
      email?: string;
      phone?: string;
      department?: string;
      grantAccount?: boolean;
    },
  ): Promise<LecturerDto> {
    return apiRequest<LecturerDto>(`/api/LecturerProfile/${id}`, {
      method: "PUT",
      body,
    });
  },

  delete(id: string): Promise<void> {
    return apiRequest<void>(`/api/LecturerProfile/${id}`, {
      method: "DELETE",
    });
  },

  importExcel(file: File, semesterId?: string, grantAccount = false) {
    const form = new FormData();
    form.append("file", file);
    const params = new URLSearchParams();
    if (semesterId && semesterId !== "all") params.set("semesterId", semesterId);
    params.set("grantAccount", String(grantAccount));
    const qs = `?${params.toString()}`;
    return apiRequest<LecturerImportResultDto>(
      `/api/LecturerProfile/import${qs}`,
      {
        method: "POST",
        body: form,
      },
    );
  },

  downloadImportTemplate() {
    return downloadAuthenticatedFile(
      "/api/LecturerProfile/import/template",
      "lecturer-import-template.xlsx",
    );
  },

  downloadExport() {
    return downloadAuthenticatedFile(
      "/api/LecturerProfile/export",
      "danh-sach-giang-vien.xlsx",
    );
  },
};
