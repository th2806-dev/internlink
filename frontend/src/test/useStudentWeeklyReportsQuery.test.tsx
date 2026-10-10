import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useStudentWeeklyReportsQuery } from "../hooks/useStudentWeeklyReportsQuery";
import { weeklyReportService } from "../services/weeklyReport.service";
import { semesterReportScheduleService } from "../services/semesterReportSchedule.service";
import type { WeeklyReportDto } from "../types/api";

vi.mock("../services/weeklyReport.service", () => ({
  weeklyReportService: {
    getMine: vi.fn(),
    upload: vi.fn(),
    uploadRevision: vi.fn(),
    submit: vi.fn(),
  },
}));

vi.mock("../services/semesterReportSchedule.service", () => ({
  semesterReportScheduleService: {
    getSchedules: vi.fn(),
  },
}));

const mockReports: WeeklyReportDto[] = [
  {
    id: "rep-1",
    internshipId: "int-1",
    weekNumber: 1,
    title: "Báo cáo tuần 1",
    content: "Nội dung tuần 1",
    version: 1,
    status: "Submitted",
    createdAt: "2026-09-01T00:00:00Z",
    submittedAt: "2026-09-02T00:00:00Z",
    dueDate: "2026-09-03T00:00:00Z",
    fileName: "tuan1.pdf",
    feedbacks: [],
    versions: [],
  },
];

const mockSchedules = [
  {
    id: "sched-1",
    semesterId: "sem-1",
    weekNumber: 1,
    title: "Báo cáo tuần 1",
    dueDate: "2026-09-07T23:59:59Z",
    isSubmissionOpen: true,
    allowLateSubmission: true,
  },
];

describe("useStudentWeeklyReportsQuery", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("fetches reports and schedules with AbortSignal and maps correctly", async () => {
    vi.mocked(weeklyReportService.getMine).mockResolvedValue(mockReports);
    vi.mocked(semesterReportScheduleService.getSchedules).mockResolvedValue(
      mockSchedules,
    );

    const { result } = renderHook(
      () => useStudentWeeklyReportsQuery({ semesterId: "sem-1" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reports).toHaveLength(1);
    expect(result.current.reports[0].id).toBe("rep-1");
    expect(result.current.reports[0].weekNumber).toBe(1);
    expect(result.current.reports[0].deadline).toBe("—");
    expect(result.current.schedules).toHaveLength(1);
    expect(weeklyReportService.getMine).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("submits new report by uploading and then calling submit", async () => {
    vi.mocked(weeklyReportService.getMine).mockResolvedValue([]);
    vi.mocked(semesterReportScheduleService.getSchedules).mockResolvedValue([]);
    vi.mocked(weeklyReportService.upload).mockResolvedValue(mockReports[0]);
    vi.mocked(weeklyReportService.submit).mockResolvedValue(mockReports[0]);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useStudentWeeklyReportsQuery({ semesterId: "sem-1" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const dummyFile = new File(["test content"], "report.pdf", {
      type: "application/pdf",
    });

    await act(async () => {
      await result.current.submitReport({
        internshipId: "int-1",
        weekNumber: 1,
        title: "Báo cáo tuần 1",
        file: dummyFile,
      });
    });

    expect(weeklyReportService.upload).toHaveBeenCalledWith({
      internshipId: "int-1",
      weekNumber: 1,
      title: "Báo cáo tuần 1",
      file: dummyFile,
    });
    expect(weeklyReportService.submit).toHaveBeenCalledWith("rep-1");
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["student", "weekly-reports"],
      }),
    );
  });

  it("submits revision by uploading revision and then calling submit", async () => {
    vi.mocked(weeklyReportService.getMine).mockResolvedValue(mockReports);
    vi.mocked(semesterReportScheduleService.getSchedules).mockResolvedValue([]);
    vi.mocked(weeklyReportService.uploadRevision).mockResolvedValue(
      mockReports[0],
    );
    vi.mocked(weeklyReportService.submit).mockResolvedValue(mockReports[0]);

    const { result } = renderHook(
      () => useStudentWeeklyReportsQuery({ semesterId: "sem-1" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const dummyFile = new File(["revised content"], "report-v2.pdf", {
      type: "application/pdf",
    });

    await act(async () => {
      await result.current.submitReport({
        internshipId: "int-1",
        weekNumber: 1,
        title: "Báo cáo tuần 1",
        file: dummyFile,
        reportId: "rep-1",
      });
    });

    expect(weeklyReportService.uploadRevision).toHaveBeenCalledWith(
      "rep-1",
      "Báo cáo tuần 1",
      dummyFile,
    );
    expect(weeklyReportService.submit).toHaveBeenCalledWith("rep-1");
  });
});
