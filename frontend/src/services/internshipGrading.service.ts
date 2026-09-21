import { apiRequest, downloadAuthenticatedFile } from "../lib/apiClient";

// ═════════════════════════════════════════════════════════════════════════════
// Module chấm điểm thực tập — quy định hiện hành (QT 40% + Thi 60%)
// ═════════════════════════════════════════════════════════════════════════════

/** Trạng thái nộp 1 tuần: on_time | late | missing | pending */
export interface GradingWeekStatus {
  weekNumber: number;
  title: string;
  startDate?: string | null;
  deadline?: string | null;
  submittedAt?: string | null;
  status: "on_time" | "late" | "missing" | "pending";
  /** Điểm danh buổi hẹn tuần đó: present | absent | no_session (nguồn: trang Điểm danh) */
  attendanceStatus: "present" | "absent" | "no_session";
  isAttendanceAbsent: boolean;
}

export interface StudentGrade {
  studentId: string;
  studentCode: string;
  fullName: string;
  className: string;
  note: string;

  missingCount: number;
  lateCount: number;
  absentCount: number;

  submissionScore: number;
  punctualityScore: number;
  qualityScore: number | null;
  hasCreativeProduct: boolean;
  processScore: number;

  oralExamScore: number | null;
  averageScore: number | null;
  classification: string;

  weeks: GradingWeekStatus[];
  finalReportStatus: "on_time" | "late" | "missing" | "pending";
  finalReportSubmitted: boolean;

  isEligible: boolean;
  ineligibleReasons: string[];
}

export interface GradingSummaryResponse {
  semesterId: string;
  semesterName: string;
  schedule: GradingWeekStatus[];
  students: StudentGrade[];
  generatedAt: string;
}

export interface SaveGradeRequest {
  studentId: string;
  /** 1 trong 5 mức rubric: 1 | 2 | 3.5 | 4 | 5 (null = chưa chấm) */
  qualityScore?: number | null;
  hasCreativeProduct: boolean;
  /** Cột J — Điểm thi vấn đáp (thang 10) */
  oralExamScore?: number | null;
  note?: string | null;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const internshipGradingService = {
  getSummary(semesterId: string, className?: string): Promise<GradingSummaryResponse> {
    const params = new URLSearchParams({ semesterId });
    if (className) params.set("className", className);
    return apiRequest<GradingSummaryResponse>(`/api/InternshipGrading/summary?${params.toString()}`);
  },

  saveGrade(semesterId: string, request: SaveGradeRequest): Promise<StudentGrade> {
    return apiRequest<StudentGrade>(`/api/InternshipGrading/save?semesterId=${semesterId}`, {
      method: "POST",
      body: request,
    });
  },

  /** Export bảng điểm theo mẫu danh sách thực tập. */
  exportExcel(semesterId: string, lecturerId?: string): Promise<{ blob: Blob; filename: string }> {
    const params = new URLSearchParams({ semesterId });
    if (lecturerId) params.set("lecturerId", lecturerId);
    return downloadAuthenticatedFile(
      `/api/Export/internship-excel?${params.toString()}`,
      `DanhSachThucTap_${semesterId.slice(0, 8)}.xlsx`
    );
  },
};
