import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useLecturerSubmissionsQuery } from "../hooks/useLecturerSubmissionsQuery";
import { lecturerInternshipsService } from "../services/lecturerInternships.service";
import { submissionApiService } from "../services/submissionApi.service";
import { weeklyReportService } from "../services/weeklyReport.service";
import type { SubmissionDto, LecturerStudentListItemDto } from "../types/api";

vi.mock("../services/lecturerInternships.service", () => ({
  lecturerInternshipsService: {
    getAllSubmissions: vi.fn(),
    getStudents: vi.fn(),
  },
}));

vi.mock("../services/submissionApi.service", () => ({
  submissionApiService: {
    review: vi.fn(),
  },
}));

vi.mock("../services/weeklyReport.service", () => ({
  weeklyReportService: {
    review: vi.fn(),
  },
}));

const mockSubmissions: SubmissionDto[] = [
  {
    id: "sub-1",
    studentId: "stu-1",
    studentName: "Nguyen Van A",
    studentCode: "SV001",
    title: "Báo cáo cuối kỳ",
    type: "FinalReport",
    status: "Submitted",
    version: 1,
    createdAt: "2026-03-01T00:00:00Z",
    submittedAt: "2026-03-01T00:00:00Z",
    feedbacks: [],
    assets: [],
  },
];

const mockStudents: LecturerStudentListItemDto[] = [
  {
    id: "stu-1",
    studentCode: "SV001",
    fullName: "Nguyen Van A Full",
    companyName: "FPT Software",
    academicStatus: "Eligible",
    internshipStatus: "InProgress",
  },
];

describe("useLecturerSubmissionsQuery", () => {
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

  it("fetches and maps submissions with student info and AbortSignal", async () => {
    vi.mocked(lecturerInternshipsService.getAllSubmissions).mockResolvedValue(
      mockSubmissions,
    );
    vi.mocked(lecturerInternshipsService.getStudents).mockResolvedValue(
      mockStudents,
    );

    const { result } = renderHook(
      () => useLecturerSubmissionsQuery({ semesterId: "sem-1" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.submissions).toHaveLength(1);
    expect(result.current.submissions[0].id).toBe("sub-1");
    expect(result.current.submissions[0].studentName).toBe("Nguyen Van A Full");
    expect(result.current.submissions[0].company).toBe("FPT Software");
    expect(
      lecturerInternshipsService.getAllSubmissions,
    ).toHaveBeenCalledWith(
      "sem-1",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("updates submission status and invalidates cache", async () => {
    vi.mocked(lecturerInternshipsService.getAllSubmissions).mockResolvedValue(
      mockSubmissions,
    );
    vi.mocked(lecturerInternshipsService.getStudents).mockResolvedValue([]);
    vi.mocked(submissionApiService.review).mockResolvedValue(
      mockSubmissions[0],
    );

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useLecturerSubmissionsQuery({ semesterId: "sem-1" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateSubmissionStatus("sub-1", "Đã duyệt", "Tốt");
    });

    expect(submissionApiService.review).toHaveBeenCalledWith(
      "sub-1",
      "Đã duyệt",
      "Tốt",
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["lecturer-portal", "submissions"],
      }),
    );
  });

  it("handles weekly report id prefix and calls weeklyReportService", async () => {
    vi.mocked(lecturerInternshipsService.getAllSubmissions).mockResolvedValue([]);
    vi.mocked(lecturerInternshipsService.getStudents).mockResolvedValue([]);
    vi.mocked(weeklyReportService.review).mockResolvedValue({} as never);

    const { result } = renderHook(
      () => useLecturerSubmissionsQuery({ semesterId: "sem-1" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateSubmissionStatus("weekly:rep-123", "Đã duyệt", "Nhận xét");
    });

    expect(weeklyReportService.review).toHaveBeenCalledWith("rep-123", {
      status: "Approved",
      lecturerComment: "Nhận xét",
    });
  });
});
