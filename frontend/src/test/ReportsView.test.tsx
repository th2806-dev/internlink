import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ReportsView } from "../features/lecturer/pages/ReportsView";
import { weeklyReportService } from "../services/weeklyReport.service";
import { submissionApiService } from "../services/submissionApi.service";
import { semesterReportScheduleService } from "../services/semesterReportSchedule.service";
import { ApiClientError } from "../lib/apiClient";
import type { PaginatedResponse, WeeklyReportDto } from "../types/api";

vi.mock("../services/weeklyReport.service", () => ({
  weeklyReportService: {
    getAllForLecturer: vi.fn(),
    review: vi.fn(),
    download: vi.fn(),
  },
}));

vi.mock("../services/submissionApi.service", () => ({
  submissionApiService: {
    downloadLecturerSemesterZip: vi.fn(),
  },
}));

vi.mock("../contexts/SemesterContext", () => ({
  useSemester: () => ({ semesters: [] }),
}));

vi.mock("../services/semesterReportSchedule.service", () => ({
  semesterReportScheduleService: {
    getSchedules: vi.fn().mockResolvedValue([]),
  },
}));

// Khu vực bài nộp dùng portal legacy — ngoài phạm vi lát dọc tiên phong.
vi.mock("../features/lecturer/components/SubmissionsHub", () => ({
  SubmissionsHub: () => <div data-testid="submissions-hub" />,
}));

vi.mock("../hooks/useLecturerSubmissionsQuery", () => ({
  useLecturerSubmissionsQuery: () => ({
    submissions: [],
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    updateSubmissionStatus: vi.fn(),
    isUpdating: false,
  }),
}));

const getAllForLecturer = vi.mocked(weeklyReportService.getAllForLecturer);
const downloadLecturerSemesterZip = vi.mocked(submissionApiService.downloadLecturerSemesterZip);
const getSchedules = vi.mocked(semesterReportScheduleService.getSchedules);

function makeReport(id: string, status = "Submitted"): WeeklyReportDto {
  return {
    id,
    internshipId: `int-${id}`,
    weekNumber: 1,
    version: 1,
    title: `Báo cáo ${id}`,
    content: "Nội dung báo cáo",
    fileName: `${id}.pdf`,
    status,
    createdAt: "2026-09-01T00:00:00Z",
    submittedAt: "2026-09-02T00:00:00Z",
  };
}

function makePage(
  items: WeeklyReportDto[],
  total: number,
  skip = 0,
  take = 20,
): PaginatedResponse<WeeklyReportDto> {
  return { items, total, skip, take };
}

const TOTALS: Record<string, number> = {
  "": 45,
  Submitted: 12,
  RevisionRequested: 7,
  Approved: 26,
};
const totalsResponse = (status?: string) => makePage([], TOTALS[status ?? ""], 0, 1);

function renderReportsView() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 60_000 },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<ReportsView semesterId="sem-1" />, { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ReportsView (lát dọc tiên phong /lecturer/reports)", () => {
  it("Test 1 — hiển thị Skeleton khi khởi tạo, KHÔNG phải trạng thái lỗi/rỗng", () => {
    getAllForLecturer.mockImplementation(
      () => new Promise<PaginatedResponse<WeeklyReportDto>>(() => {}),
    );

    renderReportsView();

    expect(screen.getByTestId("reports-loading")).toBeInTheDocument();
    expect(document.querySelector(".animate-pulse")).not.toBeNull();
    expect(screen.queryByTestId("request-error-state")).not.toBeInTheDocument();
    expect(screen.queryByText("Không có báo cáo nào")).not.toBeInTheDocument();
  });

  it("Test 2 — render danh sách + KPI totals + phân trang từ API", async () => {
    getAllForLecturer.mockImplementation(async (params) => {
      if ((params?.take ?? 0) === 1) return totalsResponse(params?.status);
      return makePage([makeReport("r1"), makeReport("r2")], 45, params?.skip ?? 0, params?.take ?? 20);
    });

    renderReportsView();

    // KPI lấy từ tổng server-side (toàn kỳ), không phải đếm theo trang.
    expect(await screen.findByText("45 báo cáo")).toBeInTheDocument();
    expect(screen.getByText("1-20 / 45")).toBeInTheDocument();

    // Hàng đợi duyệt hiển thị báo cáo Submitted của trang hiện tại.
    expect(await screen.findByText(/Tuần 1 — Báo cáo r1/)).toBeInTheDocument();
    expect(screen.getByTestId("submissions-hub")).toBeInTheDocument();
    expect(screen.queryByTestId("request-error-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("reports-loading")).not.toBeInTheDocument();
  });

  it("Test 3 — lỗi 500 → RequestErrorState + nút Thử lại → phục hồi thành công", async () => {
    const user = userEvent.setup();
    let listCall = 0;
    getAllForLecturer.mockImplementation(async (params) => {
      if ((params?.take ?? 0) === 1) return totalsResponse(params?.status);
      listCall += 1;
      if (listCall === 1) throw new ApiClientError("Lỗi máy chủ", 500);
      return makePage([makeReport("r-ok")], 1);
    });

    renderReportsView();

    // Lỗi phải hiện RA LOI, tuyệt đối không được hiện "không có dữ liệu".
    const errorState = await screen.findByTestId("request-error-state");
    expect(errorState).toBeInTheDocument();
    expect(errorState).toHaveTextContent("Không thể tải danh sách báo cáo");
    expect(errorState).toHaveTextContent("Mã lỗi: HTTP 500");
    expect(screen.queryByText("Không có báo cáo nào")).not.toBeInTheDocument();
    expect(screen.queryByTestId("reports-loading")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Thử lại/ }));

    expect(await screen.findByText(/Tuần 1 — Báo cáo r-ok/)).toBeInTheDocument();
    expect(screen.queryByTestId("request-error-state")).not.toBeInTheDocument();
  });

  it("Test 4 — dữ liệu rỗng (không lỗi) → EmptyState, không hiện lỗi", async () => {
    getAllForLecturer.mockImplementation(async (params) => {
      if ((params?.take ?? 0) === 1) return totalsResponse(params?.status);
      return makePage([], 0);
    });

    renderReportsView();

    expect(await screen.findByText("Không có báo cáo nào")).toBeInTheDocument();
    expect(screen.queryByTestId("request-error-state")).not.toBeInTheDocument();
    expect(screen.getByText("0 / 0")).toBeInTheDocument();
    expect(screen.getByTestId("submissions-hub")).toBeInTheDocument();
  });

  it("Test 5 — bấm sang trang 2: gọi API skip=20 và cập nhật dữ liệu chính xác", async () => {
    const user = userEvent.setup();
    getAllForLecturer.mockImplementation(async (params) => {
      if ((params?.take ?? 0) === 1) return totalsResponse(params?.status);
      const page = Math.floor((params?.skip ?? 0) / 20) + 1;
      return makePage(
        [makeReport(`page${page}-r1`), makeReport(`page${page}-r2`)],
        45,
        params?.skip ?? 0,
        params?.take ?? 20,
      );
    });

    renderReportsView();
    expect(await screen.findByText(/Tuần 1 — Báo cáo page1-r1/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sau" }));

    expect(await screen.findByText(/Tuần 1 — Báo cáo page2-r1/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("21-40 / 45")).toBeInTheDocument());
    const listCalls = getAllForLecturer.mock.calls
      .map((call) => call[0])
      .filter((p) => (p?.take ?? 0) > 1);
    expect(listCalls[listCalls.length - 1]).toMatchObject({ skip: 20, take: 20 });
  });

  it("cho phép mở modal duyệt báo cáo đã nộp sau khi hạn nộp tuần kết thúc", async () => {
    const user = userEvent.setup();
    getAllForLecturer.mockImplementation(async (params) => {
      if ((params?.take ?? 0) === 1) return totalsResponse(params?.status);
      return makePage([makeReport("past-deadline-report")], 1);
    });
    getSchedules.mockResolvedValue([
      {
        id: "schedule-week-1",
        semesterId: "sem-1",
        weekNumber: 1,
        title: "Báo cáo tuần 1",
        dueDate: "2026-09-01T23:59:59Z",
        isSubmissionOpen: false,
        allowLateSubmission: false,
      },
    ]);

    renderReportsView();

    const approveButton = await screen.findByRole("button", {
      name: "Duyệt & Đánh giá",
    });
    expect(approveButton).toBeEnabled();

    await user.click(approveButton);

    expect(
      await screen.findByRole("heading", {
        name: "Duyệt báo cáo & Đánh giá chất lượng",
      }),
    ).toBeInTheDocument();
  }, 15000);

  it("downloads a ZIP for the selected archive type and semester", async () => {
    const user = userEvent.setup();
    getAllForLecturer.mockResolvedValue(makePage([], 0));
    downloadLecturerSemesterZip.mockResolvedValue({
      blob: new Blob(),
      filename: "HoSo_student.zip",
    });

    renderReportsView();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Loại hồ sơ cần tải ZIP" }),
      "student",
    );
    await user.click(screen.getByRole("button", { name: "Tải ZIP" }));

    await waitFor(() => {
      expect(downloadLecturerSemesterZip).toHaveBeenCalledWith("sem-1", "student");
    });
  });
});
