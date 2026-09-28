import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useAdminUsersQuery,
  USERS_SEARCH_DEBOUNCE_MS,
} from "../hooks/useAdminUsersQuery";
import { adminUsersService } from "../services/adminUsers.service";
import { useAuth } from "../hooks/useAuth";
import { ApiClientError } from "../lib/apiClient";
import type { PaginatedResponse, UserDto } from "../types/api";

vi.mock("../services/adminUsers.service", () => ({
  adminUsersService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

const getAll = vi.mocked(adminUsersService.getAll);
const mockedUseAuth = vi.mocked(useAuth);

function makeUser(id: string, overrides: Partial<UserDto> = {}): UserDto {
  return {
    id,
    username: `user${id}`,
    fullName: `User ${id}`,
    email: `${id}@uni.edu.vn`,
    role: "Student",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-09-01T00:00:00Z",
    lastLoginAt: null,
    linkedStudentCode: `SV${id}`,
    linkedStaffCode: null,
    ...overrides,
  };
}

const page = (items: UserDto[], total: number): PaginatedResponse<UserDto> => ({
  items,
  total,
  skip: 0,
  take: items.length,
});

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
  mockedUseAuth.mockReturnValue({
    user: { id: "a1", username: "admin", name: "Admin", role: "admin", backendRole: "DepartmentAdmin" },
    isLoggedIn: true,
    isBootstrapping: false,
    role: "admin",
    mustChangePassword: false,
    login: vi.fn(),
    logout: vi.fn(),
    switchRole: vi.fn(),
    refreshMe: vi.fn(),
    clearMustChangePassword: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>);
});

describe("useAdminUsersQuery (slice Users — GĐ 3)", () => {
  it("server-side: gửi skip/take/role/searchTerm/isActive và map về AdminUser", async () => {
    getAll.mockImplementation(async (params) => {
      if (params?.isActive === false) return page([], 3);
      return page([makeUser("1"), makeUser("2")], 25);
    });

    const { result } = renderHook(
      () => useAdminUsersQuery({ pageSize: 10 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.users.map((u) => u.id)).toEqual(["1", "2"]);
    expect(result.current.pagination).toMatchObject({
      total: 25,
      page: 1,
      from: 1,
      to: 10,
      totalPages: 3,
      hasNext: true,
    });
    expect(getAll).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10 }),
      "DepartmentAdmin",
    );
    // KPI counts gọi riêng với take=1
    expect(getAll).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 1 }),
      "DepartmentAdmin",
    );
  });

  it("lọc role=admin → gửi 'SuperAdmin,DepartmentAdmin' lên backend", async () => {
    getAll.mockImplementation(async (params) => {
      if (params?.isActive === false) return page([], 0);
      return page([], 0);
    });

    const { result } = renderHook(() => useAdminUsersQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    act(() => {
      result.current.setRole("admin");
    });
    await waitFor(() =>
      expect(
        getAll.mock.calls.some((c) => c[0]?.role === "SuperAdmin,DepartmentAdmin"),
      ).toBe(true),
    );
  });

  it("chuyển trang 2: keepPreviousData giữ dữ liệu cũ + đổi key", async () => {
    let resolvePage2!: (value: PaginatedResponse<UserDto>) => void;

    getAll.mockImplementation(async (params) => {
      if (params?.isActive === false) return page([], 0);
      if ((params?.skip ?? 0) >= 10) {
        return new Promise<PaginatedResponse<UserDto>>((resolve) => {
          resolvePage2 = resolve;
        });
      }
      return page([makeUser("p1")], 20);
    });

    const { result } = renderHook(() => useAdminUsersQuery({ pageSize: 10 }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    act(() => {
      result.current.goToPage(2);
    });

    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.users.map((u) => u.id)).toEqual(["p1"]);

    await act(async () => {
      resolvePage2(page([makeUser("p2")], 20));
    });
    await waitFor(() =>
      expect(result.current.users.map((u) => u.id)).toEqual(["p2"]),
    );
    expect(result.current.isPlaceholderData).toBe(false);
    const page2Call = getAll.mock.calls
      .map((c) => c[0])
      .filter((p) => (p?.take ?? 0) > 1 && (p?.skip ?? 0) === 10);
    expect(page2Call.length).toBeGreaterThan(0);
  });

  it("debounce 350ms: gõ liên tục chỉ tạo 1 searchTerm cuối cùng", async () => {
    getAll.mockImplementation(async (params) => {
      if (params?.isActive === false) return page([], 0);
      return page([], 0);
    });

    const { result } = renderHook(() => useAdminUsersQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    act(() => {
      result.current.setSearch("a");
      result.current.setSearch("ab");
      result.current.setSearch("abc");
    });

    const searches = () =>
      getAll.mock.calls
        .map((c) => c[0]?.searchTerm)
        .filter((t): t is string => Boolean(t));

    await waitFor(() => expect(searches()).toEqual(["abc"]), { timeout: 2000 });
    await new Promise((r) => setTimeout(r, 400));
    expect(searches()).toEqual(["abc"]);
    expect(USERS_SEARCH_DEBOUNCE_MS).toBe(350);
  });

  it("xóa user thành công → invalidation làm mới danh sách + counts", async () => {
    getAll.mockImplementation(async (params) => {
      if (params?.isActive === false) return page([], 0);
      return page([makeUser("1")], 1);
    });
    vi.mocked(adminUsersService.delete).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAdminUsersQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    const callsBefore = getAll.mock.calls.length;

    await act(async () => {
      await result.current.deleteUser("1");
    });

    await waitFor(() => expect(getAll.mock.calls.length).toBeGreaterThan(callsBefore));
    expect(adminUsersService.delete).toHaveBeenCalledWith("1", "DepartmentAdmin");
  });

  it("lỗi 5xx nổi lên qua isError để UI render RequestErrorState", async () => {
    getAll.mockImplementation(async () => {
      throw new ApiClientError("Máy chủ bận", 500);
    });

    const { result } = renderHook(() => useAdminUsersQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiClientError);
  });
});
