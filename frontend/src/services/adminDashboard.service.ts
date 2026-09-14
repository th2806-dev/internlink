import { apiRequest } from "../lib/apiClient";
import type { InternshipStatsDto } from "../types/api";

export interface AdminOverviewDto {
  lecturerCount: number;
  studentCount: number;
  activeStudents: number;
  companyCount: number;
  activeCompanies: number;
  internshipTotal: number;
  internshipStats: InternshipStatsDto;
}

export const adminDashboardService = {
  getOverview(semesterId?: string, departmentId?: string): Promise<AdminOverviewDto> {
    const params = new URLSearchParams();
    if (semesterId && semesterId !== "all") params.set("semesterId", semesterId);
    if (departmentId && departmentId !== "all") params.set("departmentId", departmentId);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<AdminOverviewDto>(`/api/Admin/overview${qs}`);
  },

  getInternshipStats(semesterId?: string, departmentId?: string): Promise<InternshipStatsDto> {
    const params = new URLSearchParams();
    if (semesterId && semesterId !== "all") params.set("semesterId", semesterId);
    if (departmentId && departmentId !== "all") params.set("departmentId", departmentId);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<InternshipStatsDto>(`/api/Admin/internship-stats${qs}`);
  },
};
