import { apiRequest } from "../lib/apiClient";
import type { InternshipStatsDto } from "../types/api";

export const adminDashboardService = {
  getInternshipStats(semesterId?: string, departmentId?: string): Promise<InternshipStatsDto> {
    const params = new URLSearchParams();
    if (semesterId && semesterId !== "all") params.set("semesterId", semesterId);
    if (departmentId && departmentId !== "all") params.set("departmentId", departmentId);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<InternshipStatsDto>(`/api/Admin/internship-stats${qs}`);
  },
};
