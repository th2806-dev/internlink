import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WeeklyReportTimeline } from "../features/lecturer/components/WeeklyReportTimeline";
import type { StudentWeeklyTimelineDto, WeeklyReportDto } from "../types/api";

const report: WeeklyReportDto = {
  id: "report-1",
  internshipId: "internship-1",
  weekNumber: 1,
  version: 1,
  title: "Báo cáo tuần 1",
  content: "Hoàn thành phần phân tích.",
  status: "Submitted",
  submittedAt: "2026-09-13T10:00:00Z",
  createdAt: "2026-09-13T10:00:00Z",
};

const timeline: StudentWeeklyTimelineDto = {
  studentId: "student-1",
  studentCode: "SV001",
  fullName: "Nguyễn An",
  companyName: "Công ty A",
  totalWeeks: 2,
  submittedWeeks: 1,
  approvedWeeks: 0,
  weeks: [
    {
      weekNumber: 1,
      title: "Báo cáo tuần 1",
      dueDate: "2026-09-12T00:00:00Z",
      status: "Late",
      submittedAt: report.submittedAt,
      reportContent: report.content,
      attachments: [],
      feedback: "Vui lòng bổ sung kết quả.",
      reports: [report],
    },
    {
      weekNumber: 2,
      title: "Báo cáo tuần 2",
      dueDate: "2026-09-19T00:00:00Z",
      status: "NotSubmitted",
      attachments: [],
      reports: [],
    },
  ],
};

describe("WeeklyReportTimeline", () => {
  it("renders API statuses and due dates for submitted and missing weeks", () => {
    render(
      <WeeklyReportTimeline
        internshipId="internship-1"
        weeklyReports={[report]}
        weeklyTimeline={timeline}
        isLoading={false}
      />,
    );

    expect(screen.getByText("Nộp muộn")).toBeInTheDocument();
    expect(screen.getAllByText(/Hạn:/)).toHaveLength(2);
    expect(screen.getByText("Vui lòng bổ sung kết quả.")).toBeInTheDocument();
    expect(screen.getByText("Chưa nộp")).toBeInTheDocument();
    expect(screen.getByText("0/2 tuần đã duyệt")).toBeInTheDocument();
  });
});
