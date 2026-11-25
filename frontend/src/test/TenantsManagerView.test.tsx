import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TenantsManagerView } from "../features/admin/pages/TenantsManagerView";
import type { TenantDirectoryItem, TenantDirectoryPage } from "../services/systemTenants.service";

const mocks = vi.hoisted(() => ({
  getTenants: vi.fn(),
  getTenant: vi.fn(),
  getLicense: vi.fn(),
  getInvoices: vi.fn(),
  getSsoConfiguration: vi.fn(),
  startTenantSupport: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock("../contexts/ActiveTenantContext", () => ({
  useActiveTenant: () => ({
    selectedTenantId: "",
    selectTenant: vi.fn(),
  }),
}));

vi.mock("../contexts/ImpersonationContext", () => ({
  useImpersonation: () => ({ startTenantSupport: mocks.startTenantSupport }),
}));

vi.mock("../services/systemTenants.service", () => ({
  licenseTierLabel: () => "Tiêu chuẩn",
  systemTenantsService: {
    getTenants: mocks.getTenants,
    getTenant: mocks.getTenant,
    getLicense: mocks.getLicense,
  },
  tenantStatusLabel: () => "Đang hoạt động",
  tenantTypeLabel: () => "Trường học",
}));

vi.mock("../services/systemBilling.service", () => ({
  billingStatusLabel: (status: string) => status,
  systemBillingService: { getInvoices: mocks.getInvoices },
}));

vi.mock("../services/systemTenantSso.service", () => ({
  systemTenantSsoService: { getConfiguration: mocks.getSsoConfiguration },
}));

const tenant: TenantDirectoryItem = {
  id: "tenant-1",
  tenantCode: "UNI01",
  name: "Đại học thử nghiệm",
  logoUrl: null,
  subdomain: "uni01",
  tenantType: 1,
  domain: null,
  contactEmail: "admin@example.edu.vn",
  contactPhone: "",
  status: 1,
  departmentCount: 1,
  activeStudentCount: 10,
  activeLecturerCount: 2,
  licenseTier: 1,
  maxStudentsQuota: 100,
  licenseValidTo: null,
};

const page: TenantDirectoryPage = {
  items: [tenant],
  page: 1,
  pageSize: 25,
  totalCount: 1,
};

const tenantDetails = {
  tenant,
  legalName: "Đại học thử nghiệm",
  createdAt: "2026-01-01T00:00:00Z",
  departmentNames: ["CNTT — Khoa Công nghệ Thông tin"],
  administratorContacts: [{ displayName: "Nguyễn An", email: "nguyen.an@example.edu.vn" }],
};

function renderView() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <TenantsManagerView onShowToast={vi.fn()} />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.getTenants.mockResolvedValue(page);
  mocks.getTenant.mockResolvedValue(tenantDetails);
  mocks.getLicense.mockResolvedValue({
    tenantId: tenant.id,
    tenantName: tenant.name,
    licenseId: "license-1",
    licenseTier: 1,
    activeStudents: 10,
    maxStudentsQuota: 100,
    activeLecturers: 2,
    maxLecturersQuota: 20,
    currentStorageBytes: 1024,
    storageQuotaBytes: 1024 * 1024,
    validFrom: "2026-01-01T00:00:00Z",
    validTo: "2027-01-01T00:00:00Z",
    autoRenew: false,
    isActive: true,
    history: [],
  });
  mocks.getInvoices.mockResolvedValue({ items: [], page: 1, pageSize: 10, totalCount: 0 });
  mocks.getSsoConfiguration.mockResolvedValue({
    tenantId: tenant.id,
    isConfigured: true,
    providerType: "GoogleWorkspace",
    clientId: "tenant-client-id",
    maskedClientSecret: "••••••••",
    hasClientSecret: true,
    discoveryUrl: "https://accounts.google.com/.well-known/openid-configuration",
    allowedEmailDomains: ["example.edu.vn"],
    isEnforced: true,
    updatedAt: "2026-01-02T00:00:00Z",
  });
  mocks.startTenantSupport.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TenantsManagerView support session", () => {
  it("loads the tenant 360 drawer tabs from tenant-scoped APIs", async () => {
    renderView();

    fireEvent.click(await screen.findByRole("button", {
      name: "Xem chi tiết Đại học thử nghiệm",
    }));

    expect(await screen.findByRole("dialog", { name: "Đại học thử nghiệm" })).toBeInTheDocument();
    expect(await screen.findByText("CNTT — Khoa Công nghệ Thông tin")).toBeInTheDocument();
    expect(await screen.findByText("Nguyễn An")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "nguyen.an@example.edu.vn" })).toHaveAttribute(
      "href",
      "mailto:nguyen.an@example.edu.vn",
    );

    fireEvent.click(screen.getByRole("tab", { name: "Gói dịch vụ & quota" }));
    expect(await screen.findByRole("progressbar", { name: "Sinh viên" })).toBeInTheDocument();
    expect(mocks.getLicense).toHaveBeenCalledWith(tenant.id, expect.anything());

    fireEvent.click(screen.getByRole("tab", { name: "Lịch sử hóa đơn" }));
    expect(await screen.findByText("Đơn vị chưa có hóa đơn.")).toBeInTheDocument();
    expect(mocks.getInvoices.mock.calls[0][0]).toMatchObject({ tenantId: tenant.id, page: 1 });

    fireEvent.click(screen.getByRole("tab", { name: "Tích hợp định danh" }));
    expect(await screen.findByText("Google Workspace")).toBeInTheDocument();
    expect(mocks.getSsoConfiguration).toHaveBeenCalledWith(tenant.id, expect.anything());
    expect(screen.getByText("••••••••")).toBeInTheDocument();
  });

  it("opens a reason dialog and starts support without relying on a browser prompt", async () => {
    renderView();

    const supportButton = await screen.findByRole("button", {
      name: "Hỗ trợ kỹ thuật Đại học thử nghiệm",
    });
    fireEvent.click(supportButton);

    expect(await screen.findByRole("dialog", { name: "Mở phiên hỗ trợ kỹ thuật" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: /Lý do hỗ trợ/ }), {
      target: { value: "Điều tra lỗi đăng nhập" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu hỗ trợ" }));

    await waitFor(() => {
      expect(mocks.startTenantSupport).toHaveBeenCalledWith("tenant-1", "Điều tra lỗi đăng nhập");
      expect(mocks.navigate).toHaveBeenCalledWith("/admin/dashboard");
    });
  });

  it("does not offer a support session for a suspended tenant", async () => {
    mocks.getTenants.mockResolvedValue({
      ...page,
      items: [{ ...tenant, status: 3 }],
    });
    renderView();

    expect(await screen.findByRole("button", {
      name: "Hỗ trợ kỹ thuật Đại học thử nghiệm",
    })).toBeDisabled();
  });
});
