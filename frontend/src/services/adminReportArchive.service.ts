import { downloadAuthenticatedFile, apiRequest } from "../lib/apiClient";

export interface WeeklyReportArchiveStudentDto {
  studentId: string;
  internshipId: string;
  studentCode: string;
  studentName: string;
  className?: string | null;
  companyName?: string | null;
  reportCount: number;
  fileCount: number;
  weeklyReportCount: number;
  hasFinalReport: boolean;
  hasEvidence: boolean;
  totalFilesCount: number;
  weeks: number[];
  lastSubmittedAt?: string | null;
  documents: StudentArchiveDocumentItemDto[];
}

export interface StudentArchiveDocumentItemDto {
  id: string;
  submissionId?: string | null;
  assetId?: string | null;
  documentType: string;
  displayType: string;
  title: string;
  fileName?: string | null;
  fileSize?: number | null;
  weekNumber?: number | null;
  version: number;
  status: string;
  submittedAt?: string | null;
}

export type ArchiveDocumentType = "all" | "weekly" | "final" | "evidence" | "product" | "other";

export const adminReportArchiveService = {
  getStudents(semesterId: string): Promise<WeeklyReportArchiveStudentDto[]> {
    return apiRequest<WeeklyReportArchiveStudentDto[]>(
      `/api/DepartmentAdmin/report-archive/${semesterId}/students`,
      { skipCache: true },
    );
  },

  downloadZip(semesterId: string, studentId?: string, documentType: ArchiveDocumentType = "all") {
    const query = new URLSearchParams({ documentType });
    if (studentId) query.set("studentId", studentId);
    const fallbackName = studentId
      ? `archive-${studentId}-${semesterId}.zip`
      : `archive-${semesterId}.zip`;
    return downloadAuthenticatedFile(
      `/api/DepartmentAdmin/report-archive/${semesterId}/download?${query.toString()}`,
      fallbackName,
    );
  },
};