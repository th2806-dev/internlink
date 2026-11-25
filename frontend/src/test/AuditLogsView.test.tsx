import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLogsView } from "../features/admin/pages/AuditLogsView";
import { systemAdminService } from "../services/systemAdmin.service";
import type { AuditLogPage } from "../types/systemAdmin";

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

vi.mock("../hooks/useAdminCapabilities", () => ({
  useAdminCapabilities: () => ({ isSuperAdmin: true }),
}));

const result: AuditLogPage = {
  items: [{
    id: 9,
    createdAt: "2026-11-08T10:00:00Z",
    actionType: "UPDATE",
    tableName: "Sys_GradingRuleSets",
    recordId: "rule-1",
    username: "admin",
    userId: null,
    functionCode: "CONFIG.UPDATE",
    ipAddress: "127.0.0.1",
    oldValuesJson: "{\"ProcessScoreWeight\":0.4}",
    newValuesJson: "{\"ProcessScoreWeight\":0.5}",
  }],
  totalCount: 1,
  page: 1,
  pageSize: 50,
};

describe("AuditLogsView", () => {
  beforeEach(() => {
    vi.mocked(systemAdminService.getAuditLogs).mockResolvedValue(result);
  });

  it("filters and opens a side-by-side JSON diff", async () => {
    renderView(<AuditLogsView />);

    expect(screen.getByRole("heading", { name: "Nhật ký kiểm toán" })).toBeInTheDocument();
    expect(screen.getByLabelText("Breadcrumb")).toHaveTextContent("Quản trị & tuân thủ");
    expect(await screen.findByRole("cell", { name: "Cập nhật" })).toBeInTheDocument();
    expect(await screen.findByText("Sys_GradingRuleSets")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Loại thao tác"), {
      target: { value: "UPDATE" },
    });
    await waitFor(() => {
      expect(systemAdminService.getAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ actionType: "UPDATE", page: 1 }),
      );
    });

    fireEvent.click(await screen.findByRole("button", { name: "Xem thay đổi" }));
    expect(screen.getByRole("dialog", { name: "Chi tiết thay đổi" })).toBeInTheDocument();
    expect(screen.getByText(/"ProcessScoreWeight": 0.4/)).toBeInTheDocument();
    expect(screen.getByText(/"ProcessScoreWeight": 0.5/)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});

function renderView(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  );
}
