import { apiRequest, downloadAuthenticatedFile } from "../lib/apiClient";
import type { PaginatedResponse, StudentDto, StudentImportResultDto } from "../types/api";

export type AdminStudentListItem = StudentDto & {
  internshipId?: string | null;
  finalGrade?: number | null;
  hasEvaluation?: boolean;
  isEvaluationFinalized?: boolean;
  progressPercent?: number;
};

export interface AdminStudentsSearchParams {
  /** 1-based page — adapter toSkipTake chuyển thành skip/take. */
  page?: number;
  pageSize?: number;
  /** Tìm theo tên, MSSV, email, tên doanh nghiệp (server-side). */
  searchTerm?: string;
  class?: string;
  /** active | pending | locked (trạng thái tài khoản ghép từ User). */
  accountStatus?: string;
  /** registered | preparing | interning | completed | hasCompany. */
  internshipStatus?: string;
  /** name | mssv | class */
  sortBy?: string;
  semesterId?: string;
  departmentId?: string;
  /** Nhận AbortSignal từ TanStack Query để hủy request cũ. */
  signal?: AbortSignal;
}

export const adminStudentsService = {
  /**
   * LEACY: tải theo lô skip/take (GET) — còn dùng bởi modal phân công, dashboard/nav stats
   * và các luồng chưa chuyển sang TanStack Query. Danh sách chính dùng `search()`.
   */
  getAll(skip = 0, take = 500, semesterId?: string, departmentId?: string): Promise<StudentDto[]> {
    const params = new URLSearchParams({ skip: String(skip), take: String(take) });
    if (semesterId && semesterId !== "all") params.set("semesterId", semesterId);
    if (departmentId && departmentId !== "all") params.set("departmentId", departmentId);
    return apiRequest<StudentDto[]>(`/api/Admin/students?${params.toString()}`);
  },

  /** Danh sách server-side qua POST /Admin/students/search (trả total). */
  search(params: AdminStudentsSearchParams = {}): Promise<PaginatedResponse<StudentDto>> {
    const { page = 1, pageSize = 20 } = params;
    const skip = (Math.max(1, page) - 1) * pageSize;
    return apiRequest<PaginatedResponse<StudentDto>>("/api/Admin/students/search", {
      method: "POST",
      body: {
        skip,
        take: pageSize,
        searchTerm: params.searchTerm?.trim() || null,
        class: params.class || null,
        accountStatus: params.accountStatus || null,
        internshipStatus: params.internshipStatus || null,
        sortBy: params.sortBy || null,
        semesterId: params.semesterId || null,
        departmentId: params.departmentId || null,
      },
      signal: params.signal,
    });
  },

  /** Danh sách lớp distinct cho dropdown filter (scoped theo kỳ/khoa). */
  getClassOptions(
    semesterId?: string,
    departmentId?: string,
    signal?: AbortSignal,
  ): Promise<string[]> {
    const q = new URLSearchParams();
    if (semesterId && semesterId !== "all") q.set("semesterId", semesterId);
    if (departmentId && departmentId !== "all") q.set("departmentId", departmentId);
    const qs = q.toString();
    return apiRequest<string[]>(`/api/Admin/students/classes${qs ? `?${qs}` : ""}`, { signal });
  },

  getById(id: string): Promise<StudentDto> {
    return apiRequest<StudentDto>(`/api/Admin/students/${id}`);
  },

  create(body: {
    studentCode: string;
    fullName: string;
    class?: string;
    major?: string;
    email?: string;
    phone?: string;
    department?: string;
    desiredPosition?: string;
    alternativePosition?: string;
    desiredLocation?: string;
    workPreference?: string;
    preferredIndustry?: string;
    skills?: string;
    resumeUrl?: string;
    grantAccount?: boolean;
  }): Promise<StudentDto> {
    return apiRequest<StudentDto>("/api/Admin/students", {
      method: "POST",
      body,
    });
  },

  update(
    id: string,
    body: {
      fullName: string;
      class?: string;
      major?: string;
      email?: string;
      phone?: string;
      department?: string;
      desiredPosition?: string;
      alternativePosition?: string;
      desiredLocation?: string;
      workPreference?: string;
      preferredIndustry?: string;
      skills?: string;
      resumeUrl?: string;
      grantAccount?: boolean;
    },
  ): Promise<StudentDto> {
    return apiRequest<StudentDto>(`/api/Admin/students/${id}`, {
      method: "PUT",
      body,
    });
  },

  delete(id: string): Promise<void> {
    return apiRequest<void>(`/api/Admin/students/${id}`, {
      method: "DELETE",
    });
  },

  importExcel(file: File, semesterId?: string, departmentId?: string, grantAccount = false) {
    const form = new FormData();
    form.append("file", file);
    const params = new URLSearchParams();
    if (semesterId && semesterId !== "all") params.set("semesterId", semesterId);
    if (departmentId && departmentId !== "all") params.set("departmentId", departmentId);
    params.set("grantAccount", String(grantAccount));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<StudentImportResultDto>(`/api/Admin/students/import${qs}`, {
      method: "POST",
      body: form,
    });
  },

  downloadImportTemplate() {
    return downloadAuthenticatedFile(
      "/api/Admin/students/import/template",
      "student-import-template.xlsx",
    );
  },
};
