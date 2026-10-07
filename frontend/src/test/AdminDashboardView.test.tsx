import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardView } from "../features/admin/pages/DashboardView";

vi.mock("../contexts/SemesterContext", () => ({
  toApiDepartmentId: (id?: string) => id,
  toApiSemesterId: (id?: string) => id,
  useSemester: () => ({
    semesters: [
      {
        id: "semester-long",
        name: "Học kỳ mùa xuân năm học 2026-2027",
        academicYear: "2026-2027",
        term: "Học kỳ 2",
        studentsCount: 18,
        placedStudents: 12,
        companiesCount: 7,
      },
    ],
    selectedSemester: {
      id: "semester-long",
      name: "Học kỳ mùa xuân năm học 2026-2027",
      academicYear: "2026-2027",
      term: "Học kỳ 2",
    },
    activeSemesterId: "semester-long",
    departments: [
      {
        id: "department-1",
        name: "Khoa Công nghệ thông tin",
        code: "CNTT",
        isActive: true,
      },
    ],
    selectedDepartmentId: "department-1",
    selectedDepartment: { id: "department-1", name: "Khoa Công nghệ thông tin" },
    selectSemester: vi.fn(),
    selectDepartment: vi.fn(),
  }),
}));

vi.mock("../hooks/useAdminCapabilities", () => ({
  useAdminCapabilities: () => ({
    isSuperAdmin: false,
    roleDisplayLabel: "Quản trị khoa",
  }),
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { name: "Quản trị viên khoa", username: "admin" } }),
}));

vi.mock("../hooks/useAdminDashboardStats", () => ({
  useAdminDashboardStats: () => ({
    stats: {
      lecturerCount: 4,
      lecturersWithStudents: 3,
      studentCount: 18,
      activeStudents: 18,
      pendingStudentAccounts: 0,
      pendingLecturerAccounts: 0,
      companyCount: 7,
      activeCompanies: 7,
      internshipTotal: 18,
      internshipInProgress: 12,
      internshipStats: {
        total: 18,
        notStarted: 1,
        inProgress: 12,
        behindSchedule: 2,
        awaitingFeedback: 1,
        requiresRevision: 1,
        completed: 1,
        graded: 0,
      },
      assignedStudents: 12,
      unassignedStudents: 6,
      avgStudentsPerLecturer: 4.5,
      workloadBreakdown: [],
      actionItems: [],
      recentActivities: [],
    },
    isLoading: false,
    updatedAt: new Date("2026-10-07T10:00:00Z"),
    reload: vi.fn(),
  }),
}));

vi.mock("../services/internshipGrading.service", () => ({
  internshipGradingService: {
    getSummary: vi.fn().mockResolvedValue({
      semesterId: "semester-long",
      semesterName: "Học kỳ mùa xuân năm học 2026-2027",
      students: [],
    }),
  },
}));

vi.mock("../features/admin/components/KpiSection", () => ({
  AdminKpiSection: () => <div data-testid="admin-kpis" />,
}));

vi.mock("../features/admin/components/cards/WorkloadOverviewCard", () => ({
  WorkloadOverviewCard: () => <div />,
}));

vi.mock("../features/admin/components/ActivityTimeline", () => ({
  AdminActivityTimeline: () => <div />,
}));

describe("Admin dashboard chart modes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );
  });

  it("switches between bar, line, and table using the real semester values", async () => {
    const user = userEvent.setup();
    render(<DashboardView onShowToast={vi.fn()} onNavigateTab={vi.fn()} />);

    const barButton = screen.getByRole("button", { name: "Xem biểu đồ cột" });
    const lineButton = screen.getByRole("button", { name: "Xem biểu đồ đường" });
    const tableButton = screen.getByRole("button", { name: "Xem dữ liệu dạng bảng" });

    expect(screen.getByRole("combobox", { name: "Khoa" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Năm học" })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: "Học kỳ" })).toBeEnabled();
    expect(barButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img", {
      name: "So sánh số sinh viên, đã phân công và doanh nghiệp giữa các học kỳ",
    })).toBeInTheDocument();

    await user.click(lineButton);
    expect(lineButton).toHaveAttribute("aria-pressed", "true");
    expect(barButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("img", {
      name: "So sánh số sinh viên, đã phân công và doanh nghiệp giữa các học kỳ",
    })).toBeInTheDocument();

    await user.click(tableButton);
    expect(tableButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(
      screen.getByRole("row", {
        name: /Học kỳ mùa xuân năm học 2026-2027\s+18\s+12\s+7/,
      }),
    ).toBeInTheDocument();
  });
});
