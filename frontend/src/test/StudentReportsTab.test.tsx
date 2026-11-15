import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StudentReportsTab } from "../features/lecturer/components/StudentReportsTab";
import type { StudentWeeklyTimelineDto, WeeklyReportDto } from "../types/api";

vi.mock("../features/lecturer/components/PdfViewer", () => ({
  PdfViewer: () => null,
}));

describe("StudentReportsTab timeline data", () => {
  it("uses the consolidated timeline for due dates, rubric scores, and lecturer feedback", () => {
    const report: WeeklyReportDto = {
      id: "report-1",
      internshipId: "internship-1",
      weekNumber: 1,
      version: 1,
      title: "Báo cáo tuần 1",
      content: "Nội dung",
      status: "Approved",
      createdAt: "2026-09-18T00:00:00.000Z",
    };
    const timeline: StudentWeeklyTimelineDto = {
      studentId: "student-1",
      studentCode: "SV001",
      fullName: "Nguyễn Văn An",
      companyName: "Công ty A",
      totalWeeks: 1,
      submittedWeeks: 1,
      approvedWeeks: 1,
      weeks: [
        {
          weekNumber: 1,
          title: "Tuần 1",
          dueDate: "2026-09-19T12:00:00.000Z",
          status: "Approved",
          attachments: [],
          score: 4.5,
          feedback: "Phân tích tốt, tiếp tục phát huy.",
          reports: [report],
        },
      ],
    };

    render(
      <StudentReportsTab
        internshipId="internship-1"
        studentName="Nguyễn Văn An"
        studentCode="SV001"
        weeklyReports={[]}
        weeklyTimeline={timeline}
        submissions={[]}
        isLoading={false}
      />,
    );

    expect(screen.getByText("Báo cáo tuần (1)")).toBeInTheDocument();
    expect(
      screen.getByText(new Date("2026-09-19T12:00:00.000Z").toLocaleDateString("vi-VN")),
    ).toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("Phân tích tốt, tiếp tục phát huy.")).toBeInTheDocument();
  });
});
