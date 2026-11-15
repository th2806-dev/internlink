import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import { WeeklyReportsReviewPanel } from "../features/lecturer/components/WeeklyReportsReviewPanel";
import type { WeeklyReportDto } from "../types/api";

vi.mock("../services/system.service", () => ({
  systemService: {
    getFieldPolicies: vi.fn().mockResolvedValue([
      { fieldKey: "QualityScore", isVisible: true, isRequired: true },
      { fieldKey: "LecturerComment", isVisible: true, isRequired: false },
    ]),
  },
}));

function makeReport(
  id: string,
  weekNumber: number,
  status: string,
  title: string,
  content: string,
): WeeklyReportDto {
  return {
    id,
    internshipId: "internship-1",
    weekNumber,
    version: 1,
    title,
    content,
    status,
    submittedAt: "2026-09-01T10:00:00Z",
    createdAt: "2026-09-01T10:00:00Z",
  };
}

function renderPanel(props: ComponentProps<typeof WeeklyReportsReviewPanel>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<WeeklyReportsReviewPanel {...props} />, { wrapper });
}

describe("WeeklyReportsReviewPanel", () => {
  it("uses the week strip as a master and shows only the selected report detail", () => {
    renderPanel({
        reports: [
          makeReport("report-1", 1, "Submitted", "Báo cáo tuần 1", "Nội dung tuần một"),
          makeReport("report-2", 2, "Approved", "Báo cáo tuần 2", "Nội dung tuần hai"),
        ],
        studentByInternship: { "internship-1": { studentName: "Nguyễn Văn An" } },
        onReview: vi.fn(),
      });

    expect(screen.getByText("Nội dung tuần một")).toBeInTheDocument();
    expect(screen.queryByText("Nội dung tuần hai")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Tuần 2.*Đã hoàn thành/ }));

    expect(screen.getByText("Nội dung tuần hai")).toBeInTheDocument();
    expect(screen.queryByText("Nội dung tuần một")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tuần 2.*Đã hoàn thành/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("submits rubric score and lecturer feedback when approving a weekly report", async () => {
    const onReview = vi.fn().mockResolvedValue(undefined);
    renderPanel({
      reports: [makeReport("report-1", 1, "Submitted", "Báo cáo tuần 1", "Nội dung tuần một")],
      onReview,
    });

    fireEvent.click(screen.getByRole("button", { name: "Duyệt & Đánh giá" }));
    fireEvent.change(screen.getByRole("combobox", { name: /Đánh giá chất lượng báo cáo/ }), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /Nhận xét cho sinh viên/ }), {
      target: { value: "Phân tích tốt, trình bày rõ ràng." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận duyệt & Đánh giá" }));

    await waitFor(() => {
      expect(onReview).toHaveBeenCalledWith(
        "report-1",
        "Đã duyệt",
        "Phân tích tốt, trình bày rõ ràng.",
        5,
      );
    });
  });
});
