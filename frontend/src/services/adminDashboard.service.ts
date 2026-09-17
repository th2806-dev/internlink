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
  getOverview(semesterId?: string, departmentId?: string, backendRole?: string | null): Promise<AdminOverviewDto> {
    const params = new URLSearchParams();
    if (semesterId && semesterId !== "all") params.set("semesterId", semesterId);
    if (departmentId && departmentId !== "all") params.set("departmentId", departmentId);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const prefix = backendRole === "SuperAdmin" ? "/api/SuperAdmin/dashboard" : "/api/DepartmentAdmin";
    return apiRequest<AdminOverviewDto>(`${prefix}/overview${qs}`);
  },

  getInternshipStats(semesterId?: string, departmentId?: string, backendRole?: string | null): Promise<InternshipStatsDto> {
    const params = new URLSearchParams();
    if (semesterId && semesterId !== "all") params.set("semesterId", semesterId);
    if (departmentId && departmentId !== "all") params.set("departmentId", departmentId);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const prefix = backendRole === "SuperAdmin" ? "/api/SuperAdmin/dashboard" : "/api/DepartmentAdmin";
    return apiRequest<InternshipStatsDto>(`${prefix}/internship-stats${qs}`);
  },
};
