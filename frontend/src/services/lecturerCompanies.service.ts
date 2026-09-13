import { apiRequest } from "../lib/apiClient";
import type { CompanyDetailDto, CompanyDto, LecturerCompanySummaryDto } from "../types/api";

/** Read-only company list for lecturer portal (scoped to assigned students' companies). */
export const lecturerCompaniesService = {
  getAll(semesterId?: string): Promise<LecturerCompanySummaryDto[]> {
    const params = semesterId && semesterId !== "all" ? `?semesterId=${semesterId}` : "";
    return apiRequest<LecturerCompanySummaryDto[]>(`/api/Lecturer/companies${params}`);
  },

  /** Scoped companies for lecturer portal (only enterprises of assigned students). */
  getActive(semesterId?: string): Promise<LecturerCompanySummaryDto[]> {
    const params = semesterId && semesterId !== "all" ? `?semesterId=${semesterId}` : "";
    return apiRequest<LecturerCompanySummaryDto[]>(`/api/Lecturer/companies${params}`);
  },

  /** Active partner companies available for student assignment (from semester partner roster). */
  getAvailableForAssignment(semesterId?: string): Promise<CompanyDto[]> {
    const qs = semesterId && semesterId !== "all" ? `&semesterId=${semesterId}` : "";
    return apiRequest<CompanyDto[]>(
      `/api/Company/active?take=100${qs}`,
    );
  },

  /** Chi tiết doanh nghiệp: danh sách SV đã nhận + tổng quan bài nộp / nhật ký. */
  getDetail(companyId: string, semesterId?: string): Promise<CompanyDetailDto> {
    const params = semesterId && semesterId !== "all" ? `?semesterId=${semesterId}` : "";
    return apiRequest<CompanyDetailDto>(`/api/Lecturer/enterprises/${companyId}${params}`);
  },
};

