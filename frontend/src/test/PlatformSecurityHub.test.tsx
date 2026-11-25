import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PlatformAnnouncementBanner } from "../features/admin/components/PlatformAnnouncementBanner";
import { PlatformAnnouncementView } from "../features/admin/pages/PlatformAnnouncementView";
import { SecuritySessionsView } from "../features/admin/pages/SecuritySessionsView";
import { SystemObservabilityView } from "../features/admin/pages/SystemObservabilityView";
import type {
  AdministrativeSession,
  PlatformAnnouncement,
  PlatformAnnouncementBanner as AnnouncementBanner,
} from "../services/platformOperations.service";

const mocks = vi.hoisted(() => ({
  getAnnouncements: vi.fn(),
  createAnnouncement: vi.fn(),
  toggleAnnouncement: vi.fn(),
  getActiveBanners: vi.fn(),
  getActiveSessions: vi.fn(),
  revokeSession: vi.fn(),
  getHealth: vi.fn(),
  getJobs: vi.fn(),
  getCatalog: vi.fn(),
}));

vi.mock("../contexts/ActiveTenantContext", () => ({
  useActiveTenant: () => ({
    tenants: [],
    selectedTenant: null,
    selectedTenantId: "",
    selectTenant: vi.fn(),
    isLoading: false,
    error: null,
  }),
}));

vi.mock("../services/platformOperations.service", () => ({
  platformOperationsService: {
    getAnnouncements: mocks.getAnnouncements,
    createAnnouncement: mocks.createAnnouncement,
    toggleAnnouncement: mocks.toggleAnnouncement,
    getActiveBanners: mocks.getActiveBanners,
    getActiveSessions: mocks.getActiveSessions,
    revokeSession: mocks.revokeSession,
  },
}));

vi.mock("../services/systemCatalog.service", () => ({
  systemCatalogService: {
    getCatalog: mocks.getCatalog,
  },
}));

vi.mock("../services/systemApiGateway.service", () => ({
  systemApiGatewayService: {
    getHealth: mocks.getHealth,
    getJobs: mocks.getJobs,
  },
}));

vi.mock("../features/admin/pages/BackupsView", () => ({
  BackupsView: () => <div>Backups tab content</div>,
}));

const announcement: PlatformAnnouncement = {
  id: "announcement-1",
  title: "Bảo trì hệ thống",
  content: "Dịch vụ tạm gián đoạn.",
  type: "Maintenance",
  targetAudience: "AllUsers",
  targetTenantId: null,
  targetTenantName: null,
  startsAt: "2026-11-23T09:00:00Z",
  endsAt: "2026-11-23T10:00:00Z",
  isActive: true,
  showBanner: true,
  createdAt: "2026-11-23T08:00:00Z",
};

const activeSession: AdministrativeSession = {
  tokenId: "session-1",
  userId: "user-1",
  userName: "Campus Admin",
  email: "admin@example.test",
  role: "DepartmentAdmin",
  tenantId: "tenant-1",
  tenantName: "Target Campus",
  ipAddress: "192.0.2.10",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/131.0",
  createdAt: "2026-11-23T08:00:00Z",
  expiresAt: "2026-11-24T08:00:00Z",
};

function renderWithProviders(
  children: React.ReactNode,
  initialEntries = ["/admin"],
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.getCatalog.mockResolvedValue({
    vietQrBanks: [],
    billingPlans: [],
    billingCycles: [12, 24, 36],
    paymentMethods: [],
    announcementTypes: [
      { value: "Maintenance", label: "Bảo trì" },
      { value: "ReleaseNote", label: "Bản phát hành" },
      { value: "SecurityAlert", label: "Khẩn cấp / bảo mật" },
      { value: "General", label: "Thông báo chung" },
    ],
    announcementAudiences: [
      { value: "AllUsers", label: "Tất cả người dùng" },
      { value: "TenantAdminsOnly", label: "Quản trị viên đơn vị" },
    ],
  });
  mocks.getAnnouncements.mockResolvedValue([announcement]);
  mocks.createAnnouncement.mockResolvedValue(announcement);
  mocks.toggleAnnouncement.mockResolvedValue(announcement);
  mocks.getActiveBanners.mockResolvedValue([]);
  mocks.getActiveSessions.mockResolvedValue([activeSession]);
  mocks.revokeSession.mockResolvedValue({ tokenId: activeSession.tokenId, isRevoked: true });
  mocks.getHealth.mockResolvedValue({ checkedAt: "", probes: [] });
  mocks.getJobs.mockResolvedValue({ jobs: [], recentExecutions: [] });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Platform announcement hub", () => {
  it("creates an announcement from the management form", async () => {
    renderWithProviders(<PlatformAnnouncementView onShowToast={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Tạo thông báo mới" }));

    fireEvent.change(screen.getByLabelText("Tiêu đề *"), {
      target: { value: "Bảo trì định kỳ" },
    });
    fireEvent.change(screen.getByLabelText("Nội dung *"), {
      target: { value: "Cập nhật hệ thống lúc 22:00." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tạo thông báo" }));

    await waitFor(() => {
      expect(mocks.createAnnouncement).toHaveBeenCalled();
    });
    expect(mocks.createAnnouncement.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        title: "Bảo trì định kỳ",
        content: "Cập nhật hệ thống lúc 22:00.",
        type: "Maintenance",
        targetAudience: "AllUsers",
        targetTenantId: null,
        showBanner: true,
      }),
    );
  });

  it("allows a user to temporarily dismiss the active banner", async () => {
    const activeBanner: AnnouncementBanner = {
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      endsAt: announcement.endsAt,
    };
    mocks.getActiveBanners.mockResolvedValue([activeBanner]);
    renderWithProviders(<PlatformAnnouncementBanner />);

    expect(await screen.findByRole("status")).toHaveTextContent("Bảo trì hệ thống");
    fireEvent.click(screen.getByRole("button", { name: "Đóng tạm thông báo: Bảo trì hệ thống" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("Platform security sessions", () => {
  it("requires confirmation before revoking an administrative session", async () => {
    renderWithProviders(<SecuritySessionsView onShowToast={vi.fn()} />);
    expect(await screen.findByText("admin@example.test")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cưỡng chế đăng xuất Campus Admin" }));
    expect(screen.getByRole("alertdialog", { name: "Cưỡng chế đăng xuất phiên này?" })).toBeInTheDocument();
    expect(mocks.revokeSession).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Thu hồi phiên" }));
    await waitFor(() => {
      expect(mocks.revokeSession).toHaveBeenCalled();
    });
    expect(mocks.revokeSession.mock.calls[0]?.[0]).toBe(activeSession.tokenId);
  });
});

describe("Observability backups tab", () => {
  it("renders backups from the deep link without requesting overview metrics", async () => {
    renderWithProviders(
      <SystemObservabilityView onShowToast={vi.fn()} />,
      ["/admin/observability?tab=backups"],
    );

    expect(await screen.findByText("Backups tab content")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sao lưu dữ liệu" })).toHaveAttribute("aria-selected", "true");
    expect(mocks.getHealth).not.toHaveBeenCalled();
    expect(mocks.getJobs).not.toHaveBeenCalled();
  });
});
