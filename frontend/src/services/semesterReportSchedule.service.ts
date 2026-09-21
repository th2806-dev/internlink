import { apiRequest } from "../lib/apiClient";

export interface SemesterReportScheduleDto {
  id: string;
  semesterId: string;
  weekNumber: number;
  title: string;
  /** Ngày mở nộp báo cáo (mới — C23) */
  startDate?: string | null;
  dueDate: string;
  isSubmissionOpen: boolean;
  allowLateSubmission: boolean;
  description?: string | null;
  /** true với dòng "Báo cáo cuối kỳ" (WeekNumber = totalWeeks + 1) */
  isFinalReport?: boolean;
}

export interface UpdateReportScheduleRequest {
  title?: string;
  startDate?: string | null;
  dueDate?: string;
  isSubmissionOpen?: boolean;
  allowLateSubmission?: boolean;
  description?: string;
}

export const semesterReportScheduleService = {
  getSchedules(semesterId: string): Promise<SemesterReportScheduleDto[]> {
    return apiRequest<SemesterReportScheduleDto[]>(`/api/Semesters/${semesterId}/report-schedules`);
  },

  generateDefaults(semesterId: string): Promise<SemesterReportScheduleDto[]> {
    return apiRequest<SemesterReportScheduleDto[]>(`/api/Semesters/${semesterId}/report-schedules/generate-defaults`, {
      method: "POST",
    });
  },

  updateSchedule(
    semesterId: string,
    weekNumber: number,
    request: UpdateReportScheduleRequest
  ): Promise<SemesterReportScheduleDto> {
    return apiRequest<SemesterReportScheduleDto>(`/api/Semesters/${semesterId}/report-schedules/${weekNumber}`, {
      method: "PUT",
      body: request,
    });
  },
};
