import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SemestersView } from "../features/admin/pages/SemestersView";

vi.mock("../contexts/SemesterContext", () => ({
  useSemester: () => ({
    semesters: [],
    selectedSemesterId: "",
    selectSemester: vi.fn(),
    createSemester: vi.fn(),
    updateSemester: vi.fn(),
    closeSemester: vi.fn(),
    startSemester: vi.fn(),
    duplicateSemester: vi.fn(),
    refreshApiCounts: vi.fn(),
  }),
}));

vi.mock("../hooks/useAdminCapabilities", () => ({
  useAdminCapabilities: () => ({
    isSuperAdmin: false,
    isDepartmentAdmin: true,
  }),
}));

vi.mock("../components/modals/CreateSemesterModal", () => ({
  CreateSemesterModal: () => null,
}));
vi.mock("../components/SchoolAcademicTermsPanel", () => ({
  SchoolAcademicTermsPanel: () => null,
}));
vi.mock("../components/EvidenceDeadlinePanel", () => ({
  EvidenceDeadlinePanel: () => null,
}));
vi.mock("../components/modals/AssignLecturerModal", () => ({
  AssignLecturerModal: () => null,
}));
vi.mock("../components/modals/ImportStudentsModal", () => ({
  ImportStudentsModal: () => null,
}));
vi.mock("../components/modals/ImportLecturersModal", () => ({
  ImportLecturersModal: () => null,
}));

describe("Admin semesters page", () => {
  it("uses the branded subpage header and honest empty states when there is no semester data", () => {
    const { container } = render(
      <SemestersView onShowToast={vi.fn()} onNavigateTab={vi.fn()} />,
    );

    expect(
      screen.getByRole("heading", { name: "Quản lý kỳ thực tập" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tạo kỳ thực tập mới" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Chưa có kỳ thực tập")).toHaveLength(3);
    expect(screen.getByText("Chưa cập nhật")).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Lọc kỳ theo trạng thái" }),
    ).toBeInTheDocument();
    expect(container.querySelector(".max-w-\\[1300px\\]")).not.toBeNull();
    expect(screen.queryByText(/0 SV/)).not.toBeInTheDocument();
  });
});
