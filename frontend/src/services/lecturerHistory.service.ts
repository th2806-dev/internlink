import { apiRequest } from "../lib/apiClient";

export interface LecturerHistoryStudent {
  internshipId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  className?: string | null;
  companyName?: string | null;
  reviewedReportCount: number;
  finalGrade?: number | null;
  isFinalized: boolean;
}

export interface LecturerHistoryActivity {
  id: string;
  studentId?: string | null;
  studentName?: string | null;
  companyName?: string | null;
  activityType: string;
  title: string;
  detail?: string | null;
  weekNumber?: number | null;
  occurredAt: string;
}

export interface LecturerParticipationHistory {
  semesterId: string;
  semesterName: string;
  generatedAt: string;
  lastActivityAt?: string | null;
  students: LecturerHistoryStudent[];
  activities: LecturerHistoryActivity[];
}

export const lecturerHistoryService = {
  getSemesterHistory(semesterId: string): Promise<LecturerParticipationHistory> {
    return apiRequest<LecturerParticipationHistory>(`/api/lecturer/history/${semesterId}`, {
      skipCache: true,
    });
  },
};