import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SummaryView } from "../features/lecturer/pages/SummaryView";

vi.mock("../contexts/SemesterContext", () => ({
  useSemester: () => ({
    selectedSemester: { id: "semester-1", name: "Học kỳ 1" },
    selectedDepartment: { id: "department-1", name: "Khoa Công nghệ thông tin" },
  }),
}));

vi.mock("../hooks/useEnsureSpecificSemester", () => ({
  useEnsureSpecificSemester: () => ({
    semesterId: "semester-1",
    needsSemesterChoice: false,
  }),
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "lecturer-1", username: "lecturer" } }),
}));

vi.mock("../hooks/useSystemMenu", () => ({
  useSystemMenu: () => ({
    isPending: false,
    data: [{ children: [{ code: "LECTURER.EXPORT" }] }],
  }),
}));

vi.mock("../services/lecturerInternships.service", () => ({
  lecturerInternshipsService: {
    getStudents: vi.fn().mockResolvedValue([]),
    getSemesterSummary: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("../services/internshipGrading.service", () => ({
  internshipGradingService: {
    getSummary: vi.fn().mockResolvedValue({ students: [] }),
  },
}));

vi.mock("../services/attendance.service", () => ({
  attendanceService: {
    getLecturerSessions: vi.fn().mockResolvedValue([]),
  },
}));

function renderSummaryView() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<SummaryView />, { wrapper });
}

describe("SummaryView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows all three export actions for lecturers with export permission", async () => {
    renderSummaryView();

    expect(await screen.findByRole("button", { name: /Hồ sơ sinh viên \(ZIP\)/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Bảng tổng hợp \(Excel\)/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Báo cáo tổng kết \(Word\)/ })).toBeEnabled();
  });
});
