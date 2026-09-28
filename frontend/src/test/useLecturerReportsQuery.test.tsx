import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useLecturerReportsQuery } from "../hooks/useLecturerReportsQuery";
import { weeklyReportService } from "../services/weeklyReport.service";
import { ApiClientError } from "../lib/apiClient";
import type { PaginatedResponse, WeeklyReportDto } from "../types/api";

vi.mock("../services/weeklyReport.service", () => ({
  weeklyReportService: {
    getAllForLecturer: vi.fn(),
    review: vi.fn(),
  },
}));

const getAllForLecturer = vi.mocked(weeklyReportService.getAllForLecturer);
const review = vi.mocked(weeklyReportService.review);

function makeReport(id: string, status = "Submitted"): WeeklyReportDto {
  return {
    id,
    internshipId: `int-${id}`,
    weekNumber: 1,
    version: 1,
    title: `Báo cáo ${id}`,
    content: "Nội dung báo cáo",
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

/** Tổng KPI theo trạng thái (các request take=1 do hook fetch nền). */
const TOTALS: Record<string, number> = {
  "": 45,
  Submitted: 12,
  RevisionRequested: 7,
  Approved: 26,
};
const totalsResponse = (status?: string) => makePage([], TOTALS[status ?? ""], 0, 1);

/** Chỉ những call là fetch DANH SÁCH (take>1), loại bỏ call đếm totals. */
const listCalls = () =>
  getAllForLecturer.mock.calls
    .map((call) => call[0])
    .filter((params) => (params?.take ?? 0) > 1);

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 60_000 },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useLecturerReportsQuery", () => {
  it("khởi tạo: fetch đúng hợp đồng skip/take + AbortSignal và nạp KPI totals", async () => {
    getAllForLecturer.mockImplementation(async (params) => {
      if ((params?.take ?? 0) === 1) return totalsResponse(params?.status);
      return makePage([makeReport("r1"), makeReport("r2")], 45, params?.skip ?? 0, params?.take ?? 20);
    });

    const { result } = renderHook(() => useLecturerReportsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.items.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(result.current.pagination).toMatchObject({
      total: 45,
      page: 1,
      from: 1,
      to: 20,
      totalPages: 3,
      hasPrev: false,
      hasNext: true,
    });

    const listCall = listCalls()[0];
    expect(listCall).toMatchObject({ skip: 0, take: 20 });
    expect(listCall?.signal).toBeInstanceOf(AbortSignal);

    await waitFor(() =>
      expect(result.current.totals).toEqual({
        total: 45,
        pending: 12,
        revision: 7,
        approved: 26,
      }),
    );
  });

  it("chuyển trang 2: giữ dữ liệu trang cũ (keepPreviousData) tới khi dữ liệu mới về", async () => {
    let resolvePage2!: (value: PaginatedResponse<WeeklyReportDto>) => void;

    getAllForLecturer.mockImplementation(async (params) => {
      if ((params?.take ?? 0) === 1) return totalsResponse(params?.status);
      if ((params?.skip ?? 0) === 20) {
        return new Promise<PaginatedResponse<WeeklyReportDto>>((resolve) => {
          resolvePage2 = resolve;
        });
      }
      return makePage([makeReport("p1")], 45, 0, 20);
    });

    const { result } = renderHook(() => useLecturerReportsQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.items.map((r) => r.id)).toEqual(["p1"]);

    act(() => {
      result.current.goToPage(2);
    });

    // Bố cục cũ vẫn hiển thị trong lúc trang 2 tải → không nhấp nháy màn hình trắng.
    expect(result.current.pagination.page).toBe(2);
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.items.map((r) => r.id)).toEqual(["p1"]);
    const page2Call = listCalls()[listCalls().length - 1];
    expect(page2Call).toMatchObject({ skip: 20, take: 20 });

    await act(async () => {
      resolvePage2(makePage([makeReport("p2")], 45, 20, 20));
    });

    await waitFor(() => expect(result.current.items.map((r) => r.id)).toEqual(["p2"]));
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it("gõ tìm kiếm liên tục: response cũ về sau KHÔNG được ghi đè kết quả mới", async () => {
    getAllForLecturer.mockImplementation(async (params) => {
      if ((params?.take ?? 0) === 1) return totalsResponse(params?.status);
      if (params?.searchTerm === "a") {
        // Request cũ chậm: về TRỄ hơn request mới.
        await new Promise((resolve) => setTimeout(resolve, 150));
        return makePage([makeReport("stale-result")], 1);
      }
      if (params?.searchTerm === "abc") {
        return makePage([makeReport("fresh-result")], 1);
      }
      return makePage([makeReport("r1")], 45);
    });

    const { result } = renderHook(() => useLecturerReportsQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    // Gõ "a" và áp dụng ngay → request chậm đang bay.
    act(() => {
      result.current.setSearchTerm("a");
    });
    act(() => {
      result.current.applySearch();
    });
    await waitFor(() =>
      expect(listCalls().some((p) => p?.searchTerm === "a")).toBe(true),
    );

    // Gõ nhanh tiếp "abc" → request mới.
    act(() => {
      result.current.setSearchTerm("abc");
    });
    act(() => {
      result.current.applySearch();
    });

    await waitFor(() =>
      expect(result.current.items.map((r) => r.id)).toEqual(["fresh-result"]),
    );

    // Đợi response "a" cũ về — tuyệt đối không được đè lên UI.
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(result.current.items.map((r) => r.id)).toEqual(["fresh-result"]);
    expect(result.current.filter.appliedSearchTerm).toBe("abc");
  });

  it("debounce 350ms: gõ nhanh nhiều ký tự chỉ phát sinh 1 request", async () => {
    getAllForLecturer.mockImplementation(async (params) => {
      if ((params?.take ?? 0) === 1) return totalsResponse(params?.status);
      return makePage([makeReport("q1")], 1);
    });

    const { result } = renderHook(() => useLecturerReportsQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    act(() => {
      result.current.setSearchTerm("a");
      result.current.setSearchTerm("ab");
      result.current.setSearchTerm("abc");
    });

    const searches = () =>
      getAllForLecturer.mock.calls
        .map((call) => call[0]?.searchTerm)
        .filter((term): term is string => Boolean(term));

    await waitFor(() => expect(searches()).toEqual(["abc"]), { timeout: 2000 });

    // Không phát sinh thêm request thừa sau khi gõ ngừng.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(searches()).toEqual(["abc"]);
    expect(result.current.filter.searchTerm).toBe("abc");
  });

  it("duyệt báo cáo thành công → invalidate cache và tự tải lại danh sách", async () => {
    getAllForLecturer.mockImplementation(async (params) => {
      if ((params?.take ?? 0) === 1) return totalsResponse(params?.status);
      return makePage([makeReport("r1", "Submitted")], 1);
    });
    review.mockResolvedValue(makeReport("r1", "Approved"));

    const { result } = renderHook(() => useLecturerReportsQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    const before = listCalls().length;

    await act(async () => {
      await result.current.reviewReport({
        id: "r1",
        uiStatus: "Đã duyệt",
        comment: "Làm tốt!",
      });
    });

    expect(review).toHaveBeenCalledWith("r1", {
      status: "Approved",
      lecturerComment: "Làm tốt!",
    });
    // Auto sync: không cần F5, danh sách được refetch ngay sau mutation.
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(before));
  });

  it("duyệt thất bại → lỗi nổi lên cho UI toast và KHÔNG invalidate danh sách", async () => {
    getAllForLecturer.mockImplementation(async (params) => {
      if ((params?.take ?? 0) === 1) return totalsResponse(params?.status);
      return makePage([makeReport("r1", "Submitted")], 1);
    });
    review.mockRejectedValue(new ApiClientError("Không có quyền duyệt", 403));

    const { result } = renderHook(() => useLecturerReportsQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    const before = listCalls().length;

    let thrown: unknown = null;
    await act(async () => {
      try {
        await result.current.reviewReport({ id: "r1", uiStatus: "Đã duyệt" });
      } catch (err) {
        thrown = err;
      }
    });

    expect(thrown).toBeInstanceOf(ApiClientError);
    await waitFor(() => expect(result.current.reviewError).toBeInstanceOf(ApiClientError));
    expect(listCalls().length).toBe(before);
  });
});
