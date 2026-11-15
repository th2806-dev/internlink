import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStudentWorkspace } from "../hooks/useStudentWorkspace";
import { lecturerInternshipsService } from "../services/lecturerInternships.service";
import { weeklyReportService } from "../services/weeklyReport.service";
import type { StudentWeeklyTimelineDto } from "../types/api";

vi.mock("../contexts/SemesterContext", () => ({
  useSemester: () => ({
    activeSemesterId: "semester-1",
    selectedSemester: { id: "semester-1", totalWeeks: 6 },
  }),
}));

vi.mock("../services/lecturerInternships.service", () => ({
  lecturerInternshipsService: {
    getById: vi.fn().mockResolvedValue({
      id: "internship-1",
      studentId: "student-1",
      companyId: "company-1",
      status: "InProgress",
      student: {
        id: "student-1",
        studentCode: "SV001",
        fullName: "Nguyễn An",
      },
    }),
    getStudents: vi.fn().mockResolvedValue([
      {
        internshipId: "internship-1",
        studentId: "student-1",
        studentCode: "SV001",
        fullName: "Nguyễn An",
        internshipStatus: "InProgress",
        weeklyReportCount: 1,
        pendingReportCount: 0,
        submissionCount: 0,
        hasEvaluation: false,
        isEvaluationFinalized: false,
        progressPercent: 50,
      },
    ]),
    getStudentTimeline: vi.fn(),
    getSubmissions: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../services/evaluation.service", () => ({
  evaluationService: {
    getByInternship: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("../services/weeklyReport.service", () => ({
  weeklyReportService: {
    getByInternship: vi.fn(),
  },
}));

const timeline: StudentWeeklyTimelineDto = {
  studentId: "student-1",
  studentCode: "SV001",
  fullName: "Nguyễn An",
  companyName: "Công ty A",
  totalWeeks: 1,
  submittedWeeks: 1,
  approvedWeeks: 1,
  averageWeeklyScore: 4,
  weeks: [
    {
      weekNumber: 1,
      title: "Báo cáo tuần 1",
      dueDate: "2026-09-10T00:00:00Z",
      status: "Approved",
      attachments: [],
      score: 4,
      feedback: "Tốt.",
      reports: [
        {
          id: "report-1",
          internshipId: "internship-1",
          weekNumber: 1,
          version: 1,
          title: "Báo cáo tuần 1",
          content: "Đã hoàn thành.",
          status: "Approved",
          createdAt: "2026-09-10T00:00:00Z",
        },
      ],
    },
  ],
};

describe("useStudentWorkspace timeline loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(lecturerInternshipsService.getStudentTimeline).mockResolvedValue(timeline);
  });

  it("uses the consolidated student timeline instead of separately loading reports", async () => {
    const { result } = renderHook(() => useStudentWorkspace("internship-1"));

    await waitFor(() => {
      expect(result.current.weeklyTimeline).toEqual(timeline);
    });

    expect(lecturerInternshipsService.getStudentTimeline).toHaveBeenCalledWith(
      "student-1",
      "semester-1",
    );
    expect(result.current.weeklyReports).toEqual(timeline.weeks[0].reports);
    expect(weeklyReportService.getByInternship).not.toHaveBeenCalled();
  });
});
