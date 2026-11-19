import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContextScopeBar } from "../features/admin/components/ContextScopeBar";
import { ADMIN_NAVIGATION_SECTIONS, getAdminPageTitle } from "../config/navigationConfig";

const mocks = vi.hoisted(() => ({
  selectSemester: vi.fn(),
  selectDepartment: vi.fn(),
}));

vi.mock("../contexts/SemesterContext", () => ({
  useSemester: () => ({
    semesters: [{ id: "semester-1", name: "HK1 2026" }],
    selectedSemesterId: "semester-1",
    selectSemester: mocks.selectSemester,
    departments: [{ id: "department-1", name: "Khoa CNTT", code: "CNTT" }],
    selectedDepartmentId: "all",
    selectDepartment: mocks.selectDepartment,
  }),
}));

vi.mock("../hooks/useAdminCapabilities", () => ({
  useAdminCapabilities: () => ({ isSuperAdmin: true }),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("ContextScopeBar", () => {
  it("shows page-level semester and faculty filters and updates their context", () => {
    render(<ContextScopeBar activeTab="admin-students" />);

    fireEvent.change(screen.getByRole("combobox", { name: "Lọc theo học kỳ" }), {
      target: { value: "all" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Lọc theo khoa" }), {
      target: { value: "department-1" },
    });

    expect(mocks.selectSemester).toHaveBeenCalledWith("all");
    expect(mocks.selectDepartment).toHaveBeenCalledWith("department-1");
  });

  it("does not render scope filters on account pages", () => {
    render(<ContextScopeBar activeTab="admin-account" />);

    expect(screen.queryByRole("region", { name: "Phạm vi dữ liệu" })).not.toBeInTheDocument();
  });
});

describe("admin navigation configuration", () => {
  it("resolves breadcrumb titles from configured routes", () => {
    expect(getAdminPageTitle("students")).toBe("Sinh viên");
    expect(getAdminPageTitle("config/field-policies")).toBe("Chính sách trường dữ liệu");
  });

  it("uses the same configured labels for sidebar navigation", () => {
    const studentItem = ADMIN_NAVIGATION_SECTIONS.flatMap((section) => section.items)
      .find((item) => item.id === "admin-students");

    expect(studentItem?.label).toBe(getAdminPageTitle("students"));
  });
});
