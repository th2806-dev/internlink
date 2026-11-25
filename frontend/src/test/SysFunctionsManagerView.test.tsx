import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SysFunctionsManagerView } from "../features/admin/pages/SysFunctionsManagerView";
import { systemService } from "../services/system.service";
import type { SysFunction } from "../types/system";

const menuFunction: SysFunction = {
  id: "function-1",
  autoId: 1,
  code: "SYSTEM.PERMISSIONS",
  name: "Phân quyền",
  description: null,
  parentAutoId: 0,
  parentId: "root-1",
  moduleCode: "SYSTEM",
  sortOrder: 1,
  isAction: false,
  isActive: true,
  funcUrl: "/admin/system/permissions",
  iconName: "Shield",
  badgeText: null,
  isVisibleInMenu: true,
  isView: true,
  isNew: true,
  isEdit: true,
  isDelete: true,
  isExport: true,
  children: [],
};

const rootFunction: SysFunction = {
  ...menuFunction,
  id: "root-1",
  autoId: 0,
  code: "SYSTEM",
  name: "Hệ thống",
  parentAutoId: null,
  parentId: null,
  funcUrl: null,
  children: [menuFunction],
};

describe("SysFunctionsManagerView", () => {
  afterEach(() => vi.restoreAllMocks());

  it("edits a menu entry and persists its URL and visibility", async () => {
    vi.spyOn(systemService, "getFunctionTree").mockResolvedValue([rootFunction]);
    vi.spyOn(systemService, "updateFunction").mockResolvedValue({
      ...menuFunction,
      name: "Quản lý quyền",
    });

    renderView(<SysFunctionsManagerView onShowToast={vi.fn()} />);
    expect(await screen.findByRole("heading", {
      name: "Quản lý chức năng hệ thống",
    })).toBeInTheDocument();
    expect(screen.queryByText("F1001")).not.toBeInTheDocument();
    const expandSystemGroup = await screen.findByRole("button", {
      name: "Mở nhóm Hệ thống",
    });
    expect(expandSystemGroup).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(expandSystemGroup);
    const functionCode = await screen.findByText("SYSTEM.PERMISSIONS");
    fireEvent.click(functionCode.closest("button")!);

    fireEvent.change(await screen.findByLabelText("Tên chức năng *"), {
      target: { value: "Quản lý quyền" },
    });
    fireEvent.change(screen.getByLabelText("Đường dẫn (URL)"), {
      target: { value: "/admin/permissions" },
    });
    fireEvent.click(screen.getByLabelText("Hiển thị trong menu điều hướng"));
    fireEvent.click(screen.getByRole("button", { name: "Lưu chức năng" }));

    await waitFor(() => {
      expect(systemService.updateFunction).toHaveBeenCalledWith(
        "function-1",
        expect.objectContaining({
          name: "Quản lý quyền",
          funcUrl: "/admin/permissions",
          isVisibleInMenu: false,
        }),
      );
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
