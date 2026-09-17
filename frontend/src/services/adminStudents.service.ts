import { apiRequest, downloadAuthenticatedFile } from "../lib/apiClient";
import type { StudentDto, StudentImportResultDto } from "../types/api";

export const adminStudentsService = {
  getAll(skip = 0, take = 500, semesterId?: string, departmentId?: string): Promise<StudentDto[]> {
    const params = new URLSearchParams({ skip: String(skip), take: String(take) });
    if (semesterId && semesterId !== "all") params.set("semesterId", semesterId);
    if (departmentId && departmentId !== "all") params.set("departmentId", departmentId);
    return apiRequest<StudentDto[]>(`/api/Admin/students?${params.toString()}`);
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
