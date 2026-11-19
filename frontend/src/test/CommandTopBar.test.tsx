import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommandTopBar } from "../features/admin/components/CommandTopBar";

const mocks = vi.hoisted(() => ({
  selectSemester: vi.fn(),
  selectDepartment: vi.fn(),
  startImpersonation: vi.fn(),
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

vi.mock("../contexts/ImpersonationContext", () => ({
  useImpersonation: () => ({
    impersonation: null,
    startImpersonation: mocks.startImpersonation,
  }),
}));

vi.mock("../hooks/useAdminCapabilities", () => ({
  useAdminCapabilities: () => ({
    isSuperAdmin: true,
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
});

describe("CommandTopBar", () => {
  it("places semester and department scope selectors in the top bar", () => {
    render(
      <CommandTopBar
        activeTab="admin-dashboard"
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
  });

  it("exposes the mobile drawer toggle and profile menu", () => {
    const onMenuOpen = vi.fn();
    render(
      <CommandTopBar
        activeTab="admin-dashboard"
        onNavigate={vi.fn()}
        onShowToast={vi.fn()}
        onMenuOpen={onMenuOpen}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mở menu điều hướng" }));
    fireEvent.click(screen.getByRole("button", { name: "Mở menu tài khoản" }));

    expect(onMenuOpen).toHaveBeenCalledOnce();
    expect(screen.getByText("Mô phỏng góc nhìn")).toBeInTheDocument();
  });

  it("shows the screen function code in parentheses instead of the module code", () => {
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

    expect(screen.getByText("(GRID_CONFIG)")).toBeInTheDocument();
  });
});
