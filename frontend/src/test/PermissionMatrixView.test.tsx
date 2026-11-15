import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionMatrixView } from "../features/admin/pages/PermissionMatrixView";
import { systemAdminService } from "../services/systemAdmin.service";
import type { RolePermissionRow, SysRole } from "../types/systemAdmin";

vi.mock("../services/systemAdmin.service", () => ({
  systemAdminService: {
    getRoles: vi.fn(),
    getRolePermissions: vi.fn(),
    saveRolePermissions: vi.fn(),
    resetRolePermissions: vi.fn(),
    getGradingRuleSet: vi.fn(),
    saveGradingRuleSet: vi.fn(),
    getAuditLogs: vi.fn(),
  },
}));

const roles: SysRole[] = [
  { id: 1, code: "SuperAdmin", name: "Quản trị hệ thống", description: null },
];
const permissions: RolePermissionRow[] = [
  {
    moduleCode: "ACCOUNTS",
    featureCode: "ACCOUNTS",
    functionName: "Tài khoản",
    sortOrder: 2,
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canExport: false,
    canImport: false,
    canPrint: false,
    canApprove: false,
  },
];

describe("PermissionMatrixView", () => {
  beforeEach(() => {
    vi.mocked(systemAdminService.getRoles).mockResolvedValue(roles);
    vi.mocked(systemAdminService.getRolePermissions).mockResolvedValue(permissions);
    vi.mocked(systemAdminService.saveRolePermissions).mockImplementation(async (_id, rows) => rows);
    vi.mocked(systemAdminService.resetRolePermissions).mockResolvedValue(permissions);
  });

  it("renders module permissions and saves edited action flags", async () => {
    const onShowToast = vi.fn();
    renderView(<PermissionMatrixView onShowToast={onShowToast} />);

    expect(await screen.findByText("Tài khoản")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Tài khoản: Thêm" }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu ma trận quyền" }));

    await waitFor(() => {
      expect(systemAdminService.saveRolePermissions).toHaveBeenCalledWith(
        1,
        [expect.objectContaining({ moduleCode: "ACCOUNTS", canCreate: true })],
      );
      expect(onShowToast).toHaveBeenCalledWith("Đã lưu ma trận phân quyền.", "success");
    });
  });

  it("toggles the Xem permission column across all modules", async () => {
    vi.mocked(systemAdminService.getRolePermissions).mockResolvedValue([
      ...permissions,
      { ...permissions[0], moduleCode: "CONFIG", featureCode: "CONFIG", functionName: "Cấu hình", sortOrder: 3, canView: false },
    ]);
    renderView(<PermissionMatrixView onShowToast={vi.fn()} />);

    await screen.findByRole("checkbox", { name: "Tài khoản: Xem" });
    const allView = await screen.findByRole("checkbox", {
      name: "Cấp quyền cột Xem cho tất cả phân hệ",
    });
    fireEvent.click(allView);

    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "Tài khoản: Xem" })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Cấu hình: Xem" })).toBeChecked();
    });

    fireEvent.click(screen.getByRole("checkbox", {
      name: "Cấp quyền cột Xuất Excel cho tất cả phân hệ",
    }));
    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "Tài khoản: Xuất Excel" })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Cấu hình: Xuất Excel" })).toBeChecked();
    });
  });

  it("grants every action for a function with one control", async () => {
    renderView(<PermissionMatrixView onShowToast={vi.fn()} />);

    const grantAll = await screen.findByRole("checkbox", {
      name: "Cấp toàn quyền chức năng cho Tài khoản",
    });
    fireEvent.click(grantAll);

    for (const action of ["Xem", "Thêm", "Sửa", "Xóa", "Xuất Excel", "Nhập Excel", "In phiếu", "Phê duyệt"]) {
      expect(screen.getByRole("checkbox", { name: `Tài khoản: ${action}` })).toBeChecked();
    }
  });
});

function renderView(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}
