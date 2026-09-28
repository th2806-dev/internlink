import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAdminStudentsQuery } from "../hooks/useAdminStudentsQuery";
import { adminStudentsService } from "../services/adminStudents.service";
import { adminAssignmentsService } from "../services/adminAssignments.service";
import { ApiClientError } from "../lib/apiClient";
import type {
  LecturerAssignmentItemDto,
  PaginatedResponse,
  StudentDto,
} from "../types/api";

vi.mock("../services/adminStudents.service", () => ({
  adminStudentsService: {
    search: vi.fn(),
    getClassOptions: vi.fn(),
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

const search = vi.mocked(adminStudentsService.search);
const getClassOptions = vi.mocked(adminStudentsService.getClassOptions);
const getAllAssignments = vi.mocked(adminAssignmentsService.getAll);

function makeStudent(id: string, overrides: Partial<StudentDto> = {}): StudentDto {
  return {
    id,
    studentCode: `SV${id}`,
    fullName: `Student ${id}`,
    class: "K66",
    email: `${id}@uni.edu.vn`,
    createdAt: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

const studentPage = (
  items: StudentDto[],
  total: number,
): PaginatedResponse<StudentDto> => ({ items, total, skip: 0, take: items.length });

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
  search.mockResolvedValue(studentPage([], 0));
  getClassOptions.mockResolvedValue([]);
  getAllAssignments.mockResolvedValue([]);
});

describe("useAdminStudentsQuery (slice Students — GĐ 3)", () => {
  it("gửi POST /search đúng server-side params (không còn take:500)", async () => {
    search.mockImplementation(async (params) => {
      if (params?.pageSize === 1) return studentPage([], 42);
      return studentPage([makeStudent("1"), makeStudent("2")], 42);
    });

    const { result } = renderHook(
      () => useAdminStudentsQuery({ semesterId: "sem-1", pageSize: 20 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.students.map((s) => s.id)).toEqual(["1", "2"]);
    expect(result.current.pagination).toMatchObject({
      total: 42,
      page: 1,
      from: 1,
      to: 20,
      totalPages: 3,
    });

    const listCall = search.mock.calls.find((c) => c[0]?.pageSize === 20)?.[0];
    expect(listCall).toMatchObject({
      page: 1,
      pageSize: 20,
      semesterId: "sem-1",
      sortBy: "name",
    });
    expect(listCall?.signal).toBeInstanceOf(AbortSignal);

    // KPI toàn kỳ: 4 request take=1 (tổng/đã cấp TK/chưa TK/đã có DN)
    await waitFor(() => expect(result.current.counts.total).toBe(42));
    const countCalls = search.mock.calls.filter((c) => c[0]?.pageSize === 1);
    expect(countCalls.length).toBe(4);
  });

  it("join GV/DN theo trang: gửi studentIds của trang hiện tại cho assignments", async () => {
    const assignment: LecturerAssignmentItemDto = {
      internshipId: "int-1",
      lecturerId: "lec-1",
      lecturerName: "GV A",
      studentId: "1",
      studentCode: "SV1",
      studentName: "Student 1",
      status: "InProgress",
      companyId: "c1",
      companyName: "FPT",
      companyAssigned: true,
      createdAt: "2026-09-01T00:00:00Z",
    };
    search.mockResolvedValue(studentPage([makeStudent("1"), makeStudent("2")], 2));
    getAllAssignments.mockResolvedValue([assignment]);

    const { result } = renderHook(() => useAdminStudentsQuery({ pageSize: 20 }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(getAllAssignments).toHaveBeenCalledWith(undefined, undefined, ["1", "2"]);
    const row1 = result.current.students.find((s) => s.id === "1");
    expect(row1?.assignedLecturer).toBe("GV A");
    expect(row1?.companyName).toBe("FPT");
    const row2 = result.current.students.find((s) => s.id === "2");
    expect(row2?.assignedLecturer).toBe("Chưa phân công");
  });

  it("AccountIsActive từ DTO map đúng trạng thái TK (active/pending/locked) không cần bulk users", async () => {
    // Backend chỉ trả AccountIsActive khi sinh viên CÓ tài khoản (UserId != null).
    search.mockResolvedValue(
      studentPage(
        [
          makeStudent("1", { userId: "u1", accountIsActive: true, accountLastLoginAt: "2026-09-20T08:00:00Z" }),
          makeStudent("2", { userId: "u2", accountIsActive: false }),
          makeStudent("3", { userId: null, accountIsActive: null }),
        ],
        3,
      ),
    );

    const { result } = renderHook(() => useAdminStudentsQuery({ pageSize: 20 }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    const byId = new Map(result.current.students.map((s) => [s.id, s]));
    expect(byId.get("1")?.accountStatus).toBe("active");
    expect(byId.get("2")?.accountStatus).toBe("locked");
    expect(byId.get("3")?.accountStatus).toBe("pending");
  });

  it("đổi filter/sort → key nguyên tử, quay về trang 1", async () => {
    search.mockResolvedValue(studentPage([], 0));

    const { result } = renderHook(() => useAdminStudentsQuery({ pageSize: 20 }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    act(() => {
      result.current.goToPage(3);
    });
    act(() => {
      result.current.setClassFilter("K66");
    });
    act(() => {
      result.current.setSortBy("mssv");
    });

    await waitFor(() =>
      expect(
        search.mock.calls.some((c) => c[0]?.sortBy === "mssv" && c[0]?.class === "K66" && c[0]?.page === 1),
      ).toBe(true),
    );
    expect(result.current.filter.page).toBe(1);
  });

  it("xóa sinh viên thành công → invalidation namespace admin.students", async () => {
    search.mockResolvedValue(studentPage([makeStudent("1")], 1));
    vi.mocked(adminStudentsService.delete).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAdminStudentsQuery({ pageSize: 20 }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    const callsBefore = search.mock.calls.length;

    await act(async () => {
      await result.current.deleteStudent("1");
    });

    await waitFor(() => expect(search.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it("API lỗi 500 → isError để UI render RequestErrorState, không hiển thị rỗng", async () => {
    search.mockRejectedValue(new ApiClientError("Máy chủ bận", 500));

    const { result } = renderHook(() => useAdminStudentsQuery({ pageSize: 20 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiClientError);
  });
});
