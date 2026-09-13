import { apiRequest } from "../lib/apiClient";
import type {
  AttendanceSessionDto,
  AttendanceSessionDetailDto,
  AttendanceRecordDto,
  CreateAttendanceSessionDto,
  UpdateAttendanceSessionDto,
  MarkAttendanceDto,
  StudentAttendanceOverviewDto,
  AdminAttendanceReportDto,
} from "../types/api";

export const attendanceService = {
  // ---- LECTURER ENDPOINTS ----
  getLecturerSessions(semesterId: string, lecturerId?: string): Promise<AttendanceSessionDto[]> {
    const query = new URLSearchParams({ semesterId });
    if (lecturerId) {
      query.set("lecturerId", lecturerId);
    }
    return apiRequest<AttendanceSessionDto[]>(`/api/Attendance/sessions?${query.toString()}`);
  },

  getSessionDetail(sessionId: string): Promise<AttendanceSessionDetailDto> {
    return apiRequest<AttendanceSessionDetailDto>(`/api/Attendance/sessions/${sessionId}`);
  },

  createSession(dto: CreateAttendanceSessionDto): Promise<AttendanceSessionDetailDto> {
    return apiRequest<AttendanceSessionDetailDto>("/api/Attendance/sessions", {
      method: "POST",
      body: dto,
    });
  },

  updateSession(sessionId: string, dto: UpdateAttendanceSessionDto): Promise<AttendanceSessionDetailDto> {
    return apiRequest<AttendanceSessionDetailDto>(`/api/Attendance/sessions/${sessionId}`, {
      method: "PUT",
      body: dto,
    });
  },

  deleteSession(sessionId: string): Promise<boolean> {
    return apiRequest<boolean>(`/api/Attendance/sessions/${sessionId}`, {
      method: "DELETE",
    });
  },

  markAttendance(sessionId: string, dto: MarkAttendanceDto): Promise<AttendanceSessionDetailDto> {
    return apiRequest<AttendanceSessionDetailDto>(`/api/Attendance/sessions/${sessionId}/mark`, {
      method: "POST",
      body: dto,
    });
  },

  getStudentAttendanceForLecturer(studentId: string, semesterId: string): Promise<AttendanceRecordDto[]> {
    return apiRequest<AttendanceRecordDto[]>(
      `/api/Attendance/lecturer/students/${studentId}?semesterId=${encodeURIComponent(semesterId)}`
    );
  },

  // ---- STUDENT PORTAL ----
  getStudentAttendance(semesterId: string): Promise<StudentAttendanceOverviewDto> {
    return apiRequest<StudentAttendanceOverviewDto>(
      `/api/Attendance/student/me?semesterId=${encodeURIComponent(semesterId)}`
    );
  },

  // ---- ADMIN REPORT ----
  getAdminReport(semesterId: string): Promise<AdminAttendanceReportDto> {
    return apiRequest<AdminAttendanceReportDto>(
      `/api/Attendance/admin/report?semesterId=${encodeURIComponent(semesterId)}`
    );
  },
};
