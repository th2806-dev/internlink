import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GradingRulesConfigView } from "../features/admin/pages/GradingRulesConfigView";
import { systemAdminService } from "../services/systemAdmin.service";
import type { GradingRuleSet } from "../types/systemAdmin";

vi.mock("../contexts/SemesterContext", () => ({
  useSemester: () => ({
    semesters: [{
      id: "semester-1",
      name: "Học kỳ I",
      academicYear: "2025-2026",
      totalWeeks: 6,
    }],
    departments: [{ id: "department-1", name: "Khoa Công nghệ", code: "CNTT", isActive: true }],
    selectedSemesterId: "semester-1",
  }),
}));

vi.mock("../hooks/useAdminCapabilities", () => ({
  useAdminCapabilities: () => ({ isDepartmentAdmin: false, isSuperAdmin: true }),
}));

vi.mock("../services/systemAdmin.service", () => ({
  systemAdminService: {
    getRoles: vi.fn(),
    getRolePermissions: vi.fn(),
    saveRolePermissions: vi.fn(),
    resetRolePermissions: vi.fn(),
    getGradingRuleSet: vi.fn(),
    saveGradingRuleSet: vi.fn(),
    getEmployerRubric: vi.fn(),
    saveEmployerRubric: vi.fn(),
    getAuditLogs: vi.fn(),
  },
}));

const rules: GradingRuleSet = {
  id: null,
  semesterId: "semester-1",
  departmentId: null,
  ruleSetName: "Quy chế thực tập",
  processScoreWeight: 0.4,
  examScoreWeight: 0.6,
  employerScoreWeight: 0,
  requiredWeeklyReportsCount: 6,
  stepPenaltyPerLateReport: 0.5,
  stepPenaltyPerMissingReport: 2,
  requireFinalReportForExamEligibility: true,
  weeklyDeadlineDay: 5,
  latePenaltyPointsPerDay: 0,
  minimumPassingScore: 5,
};

describe("GradingRulesConfigView", () => {
  beforeEach(() => {
    vi.mocked(systemAdminService.getGradingRuleSet).mockResolvedValue(rules);
    vi.mocked(systemAdminService.saveGradingRuleSet).mockImplementation(async (value) => value);
    vi.mocked(systemAdminService.getEmployerRubric).mockResolvedValue(null);
  });

  it("loads the selected semester rule and saves valid weights and deadline settings", async () => {
    const onShowToast = vi.fn();
    renderView(<GradingRulesConfigView onShowToast={onShowToast} />);

    expect(await screen.findByLabelText("Deadline mỗi tuần")).toHaveValue("5");
    await waitFor(() => {
      expect(screen.getByLabelText("Trừ điểm mỗi ngày trễ")).not.toBeDisabled();
    });
    fireEvent.change(screen.getByLabelText("Trừ điểm mỗi ngày trễ"), {
      target: { value: "0.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng mặc định toàn trường" }));

    await waitFor(() => {
      expect(systemAdminService.saveGradingRuleSet).toHaveBeenCalledWith(
        expect.objectContaining({
          semesterId: "semester-1",
          departmentId: null,
          processScoreWeight: 0.4,
          examScoreWeight: 0.6,
          latePenaltyPointsPerDay: 0.5,
        }),
      );
      expect(onShowToast).toHaveBeenCalledWith(
        "Đã lưu quy chế điểm và lịch deadline tuần.",
        "success",
      );
    });
  });

  it("prevents saving when score weights do not total 100 percent", async () => {
    renderView(<GradingRulesConfigView onShowToast={vi.fn()} />);
    await screen.findByLabelText("Điểm quá trình (%)");
    await waitFor(() => {
      expect(screen.getByLabelText("Điểm quá trình (%)")).not.toBeDisabled();
    });

    fireEvent.change(screen.getByLabelText("Điểm quá trình (%)"), {
      target: { value: "30" },
    });

    expect(screen.getByText(/Cần bằng 100%/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Áp dụng mặc định toàn trường" })).toBeDisabled();
  });

  it("loads the rubric editor with eight configurable criteria and five scale levels", async () => {
    renderView(<GradingRulesConfigView onShowToast={vi.fn()} />);

    expect(await screen.findByLabelText("Tên rubric")).toHaveValue("Rubric đánh giá doanh nghiệp");
    expect(screen.getAllByLabelText(/Tiêu chí \d+/)).toHaveLength(8);
    expect(screen.getAllByLabelText("Nhãn")).toHaveLength(5);
    expect(screen.getAllByLabelText("Mô tả hành vi")).toHaveLength(5);
    expect(await screen.findByText("Cần 8–10 tiêu chí có tên, trọng số tổng đúng 100% và đủ mô tả cho 5 mức đánh giá.")).toBeInTheDocument();
  });
});

function renderView(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}
