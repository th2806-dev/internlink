import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminMenuRouteGuard } from "../features/admin/components/AdminMenuRouteGuard";
import { Sidebar } from "../features/admin/components/Sidebar";
import { findSystemMenuRoute, getSystemMenuRoutes } from "../lib/systemMenu";
import type { SystemMenuItem } from "../types/system";

const mocks = vi.hoisted(() => ({ useSystemMenu: vi.fn() }));

vi.mock("../hooks/useSystemMenu", () => ({
  useSystemMenu: mocks.useSystemMenu,
}));

vi.mock("../hooks/useAdminCapabilities", () => ({
  useAdminCapabilities: () => ({ roleDisplayLabel: "Quản trị viên" }),
}));

const menu: SystemMenuItem[] = [
  {
    code: "STUDENTS",
    name: "Sinh viên",
    moduleCode: "STUDENTS",
    sortOrder: 1,
    funcUrl: null,
    iconName: "Users",
    badgeText: null,
    groupName: "GIAI ĐOẠN 1 · CHUẨN BỊ KỲ",
    children: [
      {
        code: "STUDENTS.LIST",
        name: "Sinh viên",
        moduleCode: "STUDENTS",
        sortOrder: 1,
        funcUrl: "/admin/students",
        iconName: "Users",
        badgeText: null,
        children: [],
      },
    ],
  },
];

function setMenuData(data: SystemMenuItem[]) {
  mocks.useSystemMenu.mockReturnValue({
    data,
    isPending: false,
    isError: false,
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("database-driven admin navigation", () => {
  it("uses API function metadata for sections, labels, and route matching", () => {
    const route = findSystemMenuRoute(menu, "/admin/students/42");

    expect(route?.item.name).toBe("Sinh viên");
    expect(route?.groupName).toBe("GIAI ĐOẠN 1 · CHUẨN BỊ KỲ");
    expect(getSystemMenuRoutes(menu)).toHaveLength(1);
  });

  it("lets a menu route override its inherited group using API metadata", () => {
    const groupedMenu: SystemMenuItem[] = [
      {
        ...menu[0],
        children: [{
          ...menu[0].children[0],
          groupName: "PHÂN QUYỀN F1005",
        }],
      },
    ];

    expect(getSystemMenuRoutes(groupedMenu)[0].groupName).toBe("PHÂN QUYỀN F1005");
  });

  it("renders only the routes present in the role's returned menu", () => {
    setMenuData(menu);
    const onNavigate = vi.fn();
    render(
      <Sidebar
        activeTab="admin-dashboard"
        onNavigate={onNavigate}
        user={{ id: "admin", username: "admin", name: "Admin", backendRole: "DepartmentAdmin" } as never}
        isOpen
      />,
    );

    expect(screen.getByText("GIAI ĐOẠN 1 · CHUẨN BỊ KỲ")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sinh viên" }));
    expect(onNavigate).toHaveBeenCalledWith("admin-students");
    expect(screen.queryByRole("button", { name: "Phân quyền chức năng" })).not.toBeInTheDocument();
  });

  it("blocks routes that do not appear in the database-derived menu", () => {
    setMenuData(menu);
    render(
      <MemoryRouter initialEntries={["/admin/config/grid"]}>
        <AdminMenuRouteGuard>
          <span>Protected page</span>
        </AdminMenuRouteGuard>
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Bạn không có quyền truy cập");
    expect(screen.queryByText("Protected page")).not.toBeInTheDocument();
  });

  it("renders permitted route content when VIEW is present in the returned menu", () => {
    setMenuData(menu);
    render(
      <MemoryRouter initialEntries={["/admin/students"]}>
        <AdminMenuRouteGuard>
          <span>Students page</span>
        </AdminMenuRouteGuard>
      </MemoryRouter>,
    );

    expect(screen.getByText("Students page")).toBeInTheDocument();
  });
});
