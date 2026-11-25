import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ProfileAuditPanel,
  ProfileStudioHeader,
  type ProfileStudioTab,
  type ProfileTabItem,
} from "../components/common/ProfileStudio";
import { AccountView as StudentAccountView } from "../features/student/pages/AccountView";
import { authService } from "../services/auth.service";
import { systemService } from "../services/system.service";

const mocks = vi.hoisted(() => ({
  onTabChange: vi.fn<(tab: ProfileStudioTab) => void>(),
  refresh: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  profile: {
    name: "Nguyen Van A",
    mssv: "SV001",
    class: "CNTT1",
    semester: "HK1",
    major: "Công nghệ thông tin",
    company: "Công ty ABC",
    companyLogo: "",
    position: "Intern",
    statusBadge: "Đang thực tập",
    overallProgress: 50,
    currentGrade: 0,
    reportsSubmitted: 1,
    totalReports: 4,
    lecturerName: "GV A",
    supervisorName: "Mentor A",
    supervisorEmail: "mentor@example.com",
    supervisorPhone: "0900000000",
    companyAddress: "Hà Nội",
    currentPhase: "Đang thực tập",
  },
  portalData: {
    student: {
      fullName: "Nguyen Van A",
      studentCode: "SV001",
      email: "sv@example.com",
      phone: "0900000000",
      class: "CNTT1",
      major: "Công nghệ thông tin",
      department: "Khoa CNTT",
    },
    internship: { companyId: "company-1", status: "InProgress" },
    progressPercent: 50,
    progressBreakdown: {
      accountPercent: 100,
      profilePercent: 100,
      companyPercent: 100,
      reportPercent: 25,
      evaluationPercent: 0,
      totalPercent: 50,
      submittedReportsCount: 1,
      requiredWeeksCount: 4,
      summaryText: "Đang thực tập",
    },
  },
}));

vi.mock("../contexts/StudentPortalContext", () => ({
  useStudentPortal: () => ({
    profile: mocks.profile,
    portalData: mocks.portalData,
    refresh: mocks.refresh,
    isArchiveReadOnly: false,
  }),
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "student-1", username: "sv001", name: "Nguyen Van A", role: "student" },
    logout: mocks.logout,
  }),
}));

vi.mock("../services/auth.service", () => ({
  authService: {
    changePassword: vi.fn(),
    getMe: vi.fn().mockResolvedValue({
      id: "student-1",
      username: "sv001",
      createdAt: "2025-01-01T00:00:00Z",
    }),
    getSessions: vi.fn().mockResolvedValue([]),
    getActivity: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../services/system.service", () => ({
  systemService: {
    getMyMenu: vi.fn().mockResolvedValue([]),
  },
}));

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("Profile Studio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authService.getMe).mockResolvedValue({
      id: "student-1",
      username: "sv001",
      role: "Student",
      isActive: true,
      mustChangePassword: false,
      createdAt: "2025-01-01T00:00:00Z",
    });
    vi.mocked(authService.getSessions).mockResolvedValue([]);
    vi.mocked(authService.getActivity).mockResolvedValue([]);
    vi.mocked(systemService.getMyMenu).mockResolvedValue([]);
  });

  it("renders the profile hero and exposes the three accessible tabs", () => {
    render(
      <ProfileStudioHeader
        name="Nguyen Van A"
        identifier="SV001"
        role="Sinh viên"
        email="sv@example.com"
        activeTab="overview"
        onTabChange={mocks.onTabChange}
      />,
    );

    expect(screen.getByRole("heading", { name: "Nguyen Van A" })).toBeInTheDocument();
    expect(screen.getByText("SV001", { exact: false })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    fireEvent.click(screen.getByRole("tab", { name: "Nhật ký đăng nhập" }));
    expect(mocks.onTabChange).toHaveBeenCalledWith("login-history");
  });

  it("supports a customized two-tab profile navigation", () => {
    const tabs: ProfileTabItem<"overview" | "login-history">[] = [
      { id: "overview", label: "Tổng quan hồ sơ", icon: UserRound },
      { id: "login-history", label: "Nhật ký đăng nhập & Thiết bị", icon: UserRound },
    ];

    render(
      <ProfileStudioHeader
        name="Nguyen Van A"
        role="Quản trị khoa"
        activeTab="overview"
        onTabChange={mocks.onTabChange}
        tabs={tabs}
      />,
    );

    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.queryByRole("tab", { name: /Lịch sử thao tác/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Nhật ký đăng nhập & Thiết bị" }));
    expect(mocks.onTabChange).toHaveBeenCalledWith("login-history");
  });

  it("renders a custom profile banner image", () => {
    const { container } = render(
      <ProfileStudioHeader
        name="Nguyen Van A"
        role="Quản trị khoa"
        activeTab="overview"
        onTabChange={mocks.onTabChange}
        bannerUrl="https://example.com/banner.jpg"
      />,
    );

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://example.com/banner.jpg",
    );
    expect(container.querySelector("img")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows active devices and login history in the login-history tab", async () => {
    vi.mocked(authService.getSessions).mockResolvedValue([
      {
        id: "session-1",
        device: "Windows",
        browser: "Chrome",
        ip: "192.0.2.10",
        location: "Hà Nội",
        lastActive: "2026-11-20T08:30:00Z",
        createdAt: "2026-11-20T08:00:00Z",
        isCurrent: true,
      },
    ]);
    vi.mocked(authService.getActivity).mockResolvedValue([
      {
        id: "activity-1",
        module: "Tài khoản",
        action: "Đăng nhập hệ thống",
        ip: "192.0.2.10",
        time: "2026-11-20T08:00:00Z",
      },
    ]);

    renderWithQueryClient(<ProfileAuditPanel tab="login-history" userId="admin-1" />);

    expect(await screen.findByText("Windows · Chrome")).toBeInTheDocument();
    expect(screen.getByText("Phiên hiện tại")).toBeInTheDocument();
    expect(screen.getByText(/Hoạt động gần nhất/)).toBeInTheDocument();
    expect(screen.getByText("Đăng nhập hệ thống", { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText(/192\.0\.2\.10/)).toHaveLength(2);
    expect(systemService.getMyMenu).not.toHaveBeenCalled();
  });

  it("keeps the existing password-change flow available in the overview", async () => {
    vi.mocked(authService.changePassword).mockResolvedValue(undefined);
    renderWithQueryClient(<StudentAccountView onShowToast={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Mật khẩu hiện tại *"), {
      target: { value: "current-pass" },
    });
    fireEvent.change(screen.getByLabelText("Mật khẩu mới *"), {
      target: { value: "new-pass-123" },
    });
    fireEvent.change(screen.getByLabelText("Xác nhận mật khẩu mới *"), {
      target: { value: "new-pass-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cập nhật mật khẩu" }));

    await waitFor(() => {
      expect(authService.changePassword).toHaveBeenCalledWith({
        currentPassword: "current-pass",
        newPassword: "new-pass-123",
      });
    });
    expect(await screen.findByText("Mật khẩu tài khoản đã được cập nhật thành công!")).toBeInTheDocument();
  });
});
