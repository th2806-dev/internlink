import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveTenantProvider, useActiveTenant } from "../contexts/ActiveTenantContext";
import type { TenantDirectoryItem } from "../services/systemTenants.service";

const mocks = vi.hoisted(() => ({
  getAllTenants: vi.fn(),
  isSuperAdmin: true,
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { backendRole: mocks.isSuperAdmin ? "SuperAdmin" : "DepartmentAdmin" } }),
}));

vi.mock("../services/systemTenants.service", () => ({
  systemTenantsService: { getAllTenants: mocks.getAllTenants },
}));

const tenants: TenantDirectoryItem[] = [
  {
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
    departmentCount: 0,
    activeStudentCount: 0,
    activeLecturerCount: 0,
    licenseTier: 1,
    maxStudentsQuota: 100,
    licenseValidTo: null,
  },
  {
    id: "tenant-2",
    tenantCode: "UIT",
    name: "Đại học Công nghệ",
    logoUrl: null,
    subdomain: "uit",
    tenantType: 1,
    domain: null,
    contactEmail: "",
    contactPhone: "",
    status: 1,
    departmentCount: 0,
    activeStudentCount: 0,
    activeLecturerCount: 0,
    licenseTier: 1,
    maxStudentsQuota: 100,
    licenseValidTo: null,
  },
];

function TenantContextConsumer() {
  const { selectedTenant, selectTenant, tenants } = useActiveTenant();
  return (
    <>
      <output data-testid="selected-tenant">{selectedTenant?.id ?? "none"}</output>
      <output data-testid="tenant-count">{tenants.length}</output>
      <button type="button" onClick={() => selectTenant("tenant-2")}>Select second</button>
    </>
  );
}

function renderProvider() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ActiveTenantProvider>
        <TenantContextConsumer />
      </ActiveTenantProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.getAllTenants.mockResolvedValue(tenants);
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.clearAllMocks();
  mocks.isSuperAdmin = true;
});

describe("ActiveTenantProvider", () => {
  it("restores a saved tenant ID after validating it against the tenant directory", async () => {
    sessionStorage.setItem("internlink.activeTenantId", "tenant-2");
    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("selected-tenant")).toHaveTextContent("tenant-2");
    });
    expect(mocks.getAllTenants).toHaveBeenCalledOnce();
  });

  it("clears an invalid stored ID without silently selecting another tenant", async () => {
    sessionStorage.setItem("internlink.activeTenantId", "deleted-tenant");
    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("tenant-count")).toHaveTextContent("2");
      expect(screen.getByTestId("selected-tenant")).toHaveTextContent("none");
    });
    expect(sessionStorage.getItem("internlink.activeTenantId")).toBeNull();
  });

  it("persists only the selected tenant ID", async () => {
    renderProvider();
    await waitFor(() => {
      expect(screen.getByTestId("tenant-count")).toHaveTextContent("2");
      expect(screen.getByTestId("selected-tenant")).toHaveTextContent("none");
    });

    fireEvent.click(screen.getByRole("button", { name: "Select second" }));

    expect(sessionStorage.length).toBe(1);
    expect(sessionStorage.getItem("internlink.activeTenantId")).toBe("tenant-2");
  });

  it("removes a stored tenant selection when the current role cannot use tenant context", async () => {
    sessionStorage.setItem("internlink.activeTenantId", "tenant-1");
    mocks.isSuperAdmin = false;
    renderProvider();

    await waitFor(() => {
      expect(sessionStorage.getItem("internlink.activeTenantId")).toBeNull();
    });
    expect(mocks.getAllTenants).not.toHaveBeenCalled();
  });
});
