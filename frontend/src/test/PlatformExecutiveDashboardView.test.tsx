import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformExecutiveDashboardView } from "../features/admin/pages/PlatformExecutiveDashboardView";

const mocks = vi.hoisted(() => ({
  tenantsQuery: {} as Record<string, unknown>,
  healthQuery: {} as Record<string, unknown>,
  jobsQuery: {} as Record<string, unknown>,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[1] === "tenants") return mocks.tenantsQuery;
    if (queryKey[0] === "erp3-health") return mocks.healthQuery;
    return mocks.jobsQuery;
  },
}));

const tenant = {
  id: "tenant-1",
  tenantCode: "HCMUT",
  name: "Đại học Bách Khoa",
  logoUrl: null,
  subdomain: "hcmut",
  tenantType: 1,
  domain: null,
  contactEmail: "",
  contactPhone: "",
  status: 1,
  departmentCount: 1,
  activeStudentCount: 75,
  activeLecturerCount: 3,
  licenseTier: 2,
  maxStudentsQuota: 100,
  licenseValidTo: "2030-01-01T00:00:00.000Z",
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <PlatformExecutiveDashboardView />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  mocks.tenantsQuery = {
    data: [tenant],
    isLoading: false,
    isError: false,
    isSuccess: true,
    isFetching: false,
    refetch: vi.fn(),
  };
  mocks.healthQuery = {
    data: { probes: [{ status: "Healthy" }], checkedAt: "2030-01-01T10:00:00.000Z" },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  };
  mocks.jobsQuery = {
    data: { recentExecutions: [] },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PlatformExecutiveDashboardView", () => {
  it("shows source-backed tenant and quota metrics without inventing API request telemetry", () => {
    renderDashboard();

    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent(
      "Quản trị nền tảngTổng Quan",
    );
    expect(screen.queryByText("Chỉ huy nền tảng")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Làm mới" })).toBeInTheDocument();
    expect(screen.getAllByText("1 đơn vị")).toHaveLength(2);
    expect(screen.getByText("Theo dõi quy mô đơn vị, bản quyền, quota và sức khỏe hạ tầng.")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveClass("space-y-3", "px-2", "pt-3");
    expect(screen.getByText("75 / 100")).toBeInTheDocument();
    expect(screen.getByText("Chưa có request telemetry; không suy ra từ thời điểm sử dụng API key.")).toBeInTheDocument();
    expect(screen.getByText("HCMUT")).toBeInTheDocument();
  });

  it("shows explicit empty states instead of rendering charts for an empty tenant directory", () => {
    mocks.tenantsQuery = { ...mocks.tenantsQuery, data: [] };
    renderDashboard();

    expect(screen.getByText("Chưa có dữ liệu bản quyền để phân bổ.")).toBeInTheDocument();
    expect(screen.getByText("Chưa có đơn vị được cấp quota sinh viên.")).toBeInTheDocument();
  });
});
