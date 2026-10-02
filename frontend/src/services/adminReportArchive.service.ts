import { downloadAuthenticatedFile, apiRequest } from "../lib/apiClient";

export interface WeeklyReportArchiveStudentDto {
  studentId: string;
  studentCode: string;
  studentName: string;
  className?: string | null;
  companyName?: string | null;
  reportCount: number;
  fileCount: number;
  weeks: number[];
  lastSubmittedAt?: string | null;
}

export const adminReportArchiveService = {
  getStudents(semesterId: string): Promise<WeeklyReportArchiveStudentDto[]> {
    return apiRequest<WeeklyReportArchiveStudentDto[]>(
      `/api/DepartmentAdmin/report-archive/${semesterId}/students`,
      { skipCache: true },
    );
  },

  downloadZip(semesterId: string, studentId?: string) {
    const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    const fallbackName = studentId
      ? `reports-${studentId}-${semesterId}.zip`
      : `weekly-reports-${semesterId}.zip`;
    return downloadAuthenticatedFile(
      `/api/DepartmentAdmin/report-archive/${semesterId}/download${query}`,
      fallbackName,
    );
  },
};