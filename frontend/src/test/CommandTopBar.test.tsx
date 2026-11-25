import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommandTopBar } from "../features/admin/components/CommandTopBar";

const mocks = vi.hoisted(() => ({
  selectSemester: vi.fn(),
  selectDepartment: vi.fn(),
  startImpersonation: vi.fn(),
  selectTenant: vi.fn(),
  isSuperAdmin: true,
  menu: [] as unknown[],
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQuery: () => ({ data: [], isPending: false, isError: false }),
}));

vi.mock("../contexts/SemesterContext", () => ({
  useSemester: () => ({
    semesters: [{ id: "semester-1", name: "Kỳ 1" }],
    selectedSemesterId: "all",
    selectSemester: mocks.selectSemester,
    departments: [{ id: "department-1", name: "Khoa CNTT" }],
    selectedDepartmentId: "all",
    selectDepartment: mocks.selectDepartment,
  }),
}));

vi.mock("../contexts/ActiveTenantContext", () => ({
  useActiveTenant: () => ({
    tenants: [
      { id: "tenant-1", name: "Đại học Bách Khoa", tenantCode: "HCMUT" },
      { id: "tenant-2", name: "Đại học Mẫu", tenantCode: "DEFAULT" },
    ],
    selectedTenant: { id: "tenant-1", name: "Đại học Bách Khoa", tenantCode: "HCMUT" },
    selectedTenantId: "tenant-1",
    selectTenant: mocks.selectTenant,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("../contexts/ImpersonationContext", () => ({
  useImpersonation: () => ({
    impersonation: null,
    startImpersonation: mocks.startImpersonation,
  }),
}));

vi.mock("../hooks/useAdminCapabilities", () => ({
  useAdminCapabilities: () => ({
    isSuperAdmin: mocks.isSuperAdmin,
    roleDisplayLabel: "Super Admin",
  }),
}));

vi.mock("../hooks/useSystemMenu", () => ({
  useSystemMenu: () => ({ data: mocks.menu, isPending: false, isError: false }),
}));

vi.mock("../services/systemAdmin.service", () => ({
  systemAdminService: { getImpersonationTargets: vi.fn() },
}));

vi.mock("../components/common/NotificationDropdown", () => ({
  NotificationDropdown: () => <button type="button">Notifications</button>,
}));

afterEach(() => {
  vi.clearAllMocks();
  mocks.menu = [];
  mocks.isSuperAdmin = true;
});

describe("CommandTopBar", () => {
  it("labels the SuperAdmin dashboard as Tổng Quan", () => {
    mocks.menu = [{
      code: "DASHBOARD",
      name: "Tổng quan",
      moduleCode: "DASHBOARD",
      sortOrder: 1,
      funcUrl: "/admin/dashboard",
      iconName: "LayoutDashboard",
      badgeText: null,
      groupName: "Dashboard",
      children: [],
    }];

    render(
      <CommandTopBar
        activeTab="admin-dashboard"
        onNavigate={vi.fn()}
        onShowToast={vi.fn()}
      />,
    );

    expect(screen.getByText("Tổng Quan")).toBeInTheDocument();
  });

  it("shows platform scope instead of semester and department selectors on platform modules", () => {
    render(
      <CommandTopBar
        activeTab="admin-dashboard"
        onNavigate={vi.fn()}
        onLogout={vi.fn()}
        onShowToast={vi.fn()}
      />,
    );

    expect(screen.getByText("QUẢN TRỊ NỀN TẢNG TOÀN SÀN")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Chọn kỳ thực tập" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Chọn khoa" })).not.toBeInTheDocument();
  });

  it("shows operational selectors only for a SuperAdmin route classified as school operations", () => {
    mocks.menu = [{
      code: "STUDENTS",
      name: "Sinh viên",
      moduleCode: "STUDENTS",
      sortOrder: 1,
      funcUrl: "/admin/students",
      iconName: "Users",
      badgeText: null,
      groupName: "GIAI ĐOẠN 1 · CHUẨN BỊ KỲ",
      children: [],
    }];
    render(
      <CommandTopBar
        activeTab="admin-students"
        onNavigate={vi.fn()}
        onShowToast={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Chọn kỳ thực tập" }), {
      target: { value: "semester-1" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Chọn khoa" }), {
      target: { value: "department-1" },
    });

    expect(mocks.selectSemester).toHaveBeenCalledWith("semester-1");
    expect(mocks.selectDepartment).toHaveBeenCalledWith("department-1");
    expect(screen.queryByText("QUẢN TRỊ NỀN TẢNG TOÀN SÀN")).not.toBeInTheDocument();
  });

  it("uses the active tenant selector for tenant-scoped platform modules", () => {
    mocks.menu = [{
      code: "API_GATEWAY",
      name: "API Gateway",
      moduleCode: "API_GATEWAY",
      sortOrder: 1,
      funcUrl: "/admin/api-gateway",
      iconName: "Webhook",
      badgeText: null,
      groupName: "KẾT NỐI & TÍCH HỢP",
      children: [],
    }];
    render(
      <CommandTopBar
        activeTab="admin-api-gateway"
        onNavigate={vi.fn()}
        onShowToast={vi.fn()}
      />,
    );

    expect(screen.getByText("KẾT NỐI & TÍCH HỢP")).toBeInTheDocument();
    expect(screen.queryByText("API Gateway")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Đổi đơn vị đang cấu hình" }), {
      target: { value: "tenant-2" },
    });

    expect(screen.getByText("Đang cấu hình:")).toBeInTheDocument();
    expect(mocks.selectTenant).toHaveBeenCalledWith("tenant-2");
    expect(screen.queryByRole("combobox", { name: "Chọn kỳ thực tập" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Chọn khoa" })).not.toBeInTheDocument();
  });

  it("keeps the semester selector for DepartmentAdmin without showing a department selector", () => {
    mocks.isSuperAdmin = false;
    render(
      <CommandTopBar
        activeTab="admin-dashboard"
        onNavigate={vi.fn()}
        onShowToast={vi.fn()}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Chọn kỳ thực tập" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Chọn khoa" })).not.toBeInTheDocument();
  });

  it("exposes the mobile drawer toggle and profile menu", () => {
    const onMenuOpen = vi.fn();
    render(
      <CommandTopBar
        activeTab="admin-dashboard"
        onNavigate={vi.fn()}
        onShowToast={vi.fn()}
        onLogout={vi.fn()}
        onMenuOpen={onMenuOpen}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mở menu điều hướng" }));
    fireEvent.click(screen.getByRole("button", { name: "Mở menu tài khoản" }));

    expect(onMenuOpen).toHaveBeenCalledOnce();
    expect(screen.getByText("Hồ sơ tài khoản")).toBeInTheDocument();
    expect(screen.getByText("Đăng xuất")).toBeInTheDocument();
  });

  it("does not show internal function codes in the top bar", () => {
    mocks.menu = [
      {
        code: "GRID_CONFIG",
        name: "Cấu hình bảng",
        moduleCode: "GRID_CONFIG",
        sortOrder: 1,
        funcUrl: "/admin/config/grid",
        iconName: "Columns3",
        badgeText: null,
        groupName: "Cấu hình",
        children: [],
      },
    ];

    render(
      <CommandTopBar
        activeTab="admin-config/grid"
        onNavigate={vi.fn()}
        onShowToast={vi.fn()}
      />,
    );

    expect(screen.queryByText("(GRID_CONFIG)")).not.toBeInTheDocument();
  });
});
