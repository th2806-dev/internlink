import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAdminLecturersQuery } from "../hooks/useAdminLecturersQuery";
import { adminLecturersService } from "../services/adminLecturers.service";
import { adminAssignmentsService } from "../services/adminAssignments.service";
import { ApiClientError } from "../lib/apiClient";
import type {
  LecturerAssignmentItemDto,
  LecturerDto,
  PaginatedResponse,
} from "../types/api";

vi.mock("../services/adminLecturers.service", () => ({
  adminLecturersService: {
    getPaged: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../services/adminAssignments.service", () => ({
  adminAssignmentsService: {
    getAll: vi.fn(),
  },
}));

const getPaged = vi.mocked(adminLecturersService.getPaged);
const getAllAssignments = vi.mocked(adminAssignmentsService.getAll);

function makeLecturer(id: string, overrides: Partial<LecturerDto> = {}): LecturerDto {
  return {
    id,
    staffCode: `GV${id}`,
    fullName: `Lecturer ${id}`,
    email: `${id}@uni.edu.vn`,
    createdAt: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

const lecturerPage = (
  items: LecturerDto[],
  total: number,
): PaginatedResponse<LecturerDto> => ({ items, total, skip: 0, take: items.length });

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 60_000 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getPaged.mockResolvedValue(lecturerPage([], 0));
  getAllAssignments.mockResolvedValue([]);
});

describe("useAdminLecturersQuery (slice Lecturers — GĐ 3)", () => {
  it("gọi GET /LecturerProfile/paged đúng server-side params", async () => {
    getPaged.mockImplementation(async (params) => {
      if (params?.pageSize === 1) return lecturerPage([], 15);
      return lecturerPage([makeLecturer("1"), makeLecturer("2")], 15);
    });

    const { result } = renderHook(
      () => useAdminLecturersQuery({ semesterId: "sem-1", pageSize: 10 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.lecturers.map((l) => l.id)).toEqual(["1", "2"]);
    expect(result.current.pagination).toMatchObject({
      total: 15,
      page: 1,
      from: 1,
      to: 10,
      totalPages: 2,
    });

    const listCall = getPaged.mock.calls.find((c) => c[0]?.pageSize === 10)?.[0];
    expect(listCall).toMatchObject({ page: 1, pageSize: 10, semesterId: "sem-1" });
    expect(listCall?.signal).toBeInstanceOf(AbortSignal);

    // KPI toàn kỳ: tổng / có TK / đang hướng dẫn
    await waitFor(() => expect(result.current.counts.total).toBe(15));
    const countCalls = getPaged.mock.calls.filter((c) => c[0]?.pageSize === 1);
    expect(countCalls.length).toBe(3);
  });

  it("đếm SV đang hướng dẫn cho đúng GV của trang hiện tại", async () => {
    const assignments: LecturerAssignmentItemDto[] = [
      { internshipId: "i1", lecturerId: "1", lecturerName: "L1", studentId: "s1", studentCode: "SV1", studentName: "S1", status: "InProgress", companyId: null, companyName: null, companyAssigned: false, createdAt: "2026-09-01T00:00:00Z" },
      { internshipId: "i2", lecturerId: "1", lecturerName: "L1", studentId: "s2", studentCode: "SV2", studentName: "S2", status: "InProgress", companyId: null, companyName: null, companyAssigned: false, createdAt: "2026-09-01T00:00:00Z" },
      { internshipId: "i3", lecturerId: "999", lecturerName: "Other", studentId: "s3", studentCode: "SV3", studentName: "S3", status: "InProgress", companyId: null, companyName: null, companyAssigned: false, createdAt: "2026-09-01T00:00:00Z" },
    ];
    getPaged.mockResolvedValue(lecturerPage([makeLecturer("1"), makeLecturer("2")], 2));
    getAllAssignments.mockResolvedValue(assignments);

    const { result } = renderHook(() => useAdminLecturersQuery({ pageSize: 10 }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    const byId = new Map(result.current.lecturers.map((l) => [l.id, l]));
    expect(byId.get("1")?.currentCount).toBe(2);
    expect(byId.get("2")?.currentCount).toBe(0);
  });

  it("lọc accountStatus/hasGuidance → server-side params", async () => {
    getPaged.mockResolvedValue(lecturerPage([], 0));

    const { result } = renderHook(() => useAdminLecturersQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    act(() => {
      result.current.setAccountStatusFilter("pending");
    });
    act(() => {
      result.current.setHasGuidanceFilter("yes");
    });

    await waitFor(() =>
      expect(
        getPaged.mock.calls.some(
          (c) => c[0]?.accountStatus === "pending" && c[0]?.hasGuidance === true,
        ),
      ).toBe(true),
    );
  });

  it("search server-side + AbortSignal", async () => {
    getPaged.mockResolvedValue(lecturerPage([], 0));

    const { result } = renderHook(() => useAdminLecturersQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    act(() => {
      result.current.setSearch("nguyen");
    });
    act(() => {
      result.current.applySearch();
    });

    await waitFor(() =>
      expect(getPaged.mock.calls.some((c) => c[0]?.searchTerm === "nguyen")).toBe(true),
    );
    const searchCall = getPaged.mock.calls.find((c) => c[0]?.searchTerm === "nguyen")?.[0];
    expect(searchCall?.signal).toBeInstanceOf(AbortSignal);
  });

  it("xóa giảng viên → invalidation làm mới danh sách", async () => {
    getPaged.mockResolvedValue(lecturerPage([makeLecturer("1")], 1));
    vi.mocked(adminLecturersService.delete).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAdminLecturersQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    const callsBefore = getPaged.mock.calls.length;

    await act(async () => {
      await result.current.deleteLecturer("1");
    });

    await waitFor(() => expect(getPaged.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it("lỗi 500 → isError (UI render RequestErrorState + Thử lại)", async () => {
    getPaged.mockRejectedValue(new ApiClientError("Máy chủ bận", 500));

    const { result } = renderHook(() => useAdminLecturersQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiClientError);
  });
});
