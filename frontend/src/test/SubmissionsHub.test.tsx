import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SubmissionsHub } from "../features/lecturer/components/SubmissionsHub";
import type { Submission } from "../types/submission";

vi.mock("../contexts/SemesterContext", () => ({
  useSemester: () => ({ selectedSemester: null }),
}));

describe("SubmissionsHub", () => {
  it("shows weekly reports mapped to 'Đã hoàn thành' in the approved tab", () => {
    const submission: Submission = {
      id: "weekly:report-1",
      internshipId: "internship-1",
      sourceType: "weeklyReport",
      sourceId: "report-1",
      studentName: "Nguyễn An",
      mssv: "SV001",
      avatar: "",
      company: "Công ty A",
      reportType: "Báo cáo tuần",
      time: "09:00",
      date: "01/09/2026",
      status: "Đã hoàn thành",
      fileName: "BaoCaoTuan1.pdf",
      fileUrl: "BaoCaoTuan1.pdf",
      fileSize: "—",
      summary: "Báo cáo tuần 1",
      duplicateScore: 0,
      lecturerNote: "",
    };

    render(<SubmissionsHub submissions={[submission]} />);

    fireEvent.click(screen.getByRole("button", { name: /Đã phê duyệt/ }));

    expect(screen.getByText("Nguyễn An")).toBeInTheDocument();
    expect(screen.getByText("Bài nộp theo sinh viên")).toBeInTheDocument();
  });
});
