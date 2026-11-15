import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminMegaMenu } from "../features/admin/components/AdminMegaMenu";
import { systemService } from "../services/system.service";

describe("AdminMegaMenu", () => {
  beforeEach(() => {
    vi.spyOn(systemService, "getMyMenu").mockRejectedValue(new Error("offline"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens six module columns and routes implemented admin screens", () => {
    const onNavigate = vi.fn();
    const onShowToast = vi.fn();

    render(
      <MemoryRouter>
        <AdminMegaMenu onNavigate={onNavigate} onShowToast={onShowToast} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Hệ Thống & Cấu Hình/ }));

    expect(screen.getByRole("navigation", { name: "Menu hệ thống và cấu hình" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "Phân quyền chức năng" }));
    expect(onNavigate).toHaveBeenCalledWith("admin-system/permissions");

    fireEvent.click(screen.getByRole("button", { name: /Hệ Thống & Cấu Hình/ }));
    fireEvent.click(screen.getByRole("button", { name: "Điều chỉnh độ rộng cột" }));
    expect(onNavigate).toHaveBeenCalledWith("admin-config/grid");
    expect(onShowToast).not.toHaveBeenCalled();
  });

  it("shows a clear development notice for future functions and closes on Escape", () => {
    const onShowToast = vi.fn();

    render(
      <MemoryRouter>
        <AdminMegaMenu onNavigate={vi.fn()} onShowToast={onShowToast} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Hệ Thống & Cấu Hình/ }));
    fireEvent.click(screen.getByRole("button", { name: "Nhóm thành viên" }));
    expect(onShowToast).toHaveBeenCalledWith(
      "Tính năng đang được phát triển theo cấu hình đơn vị.",
    );

    fireEvent.click(screen.getByRole("button", { name: /Hệ Thống & Cấu Hình/ }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("navigation", { name: "Menu hệ thống và cấu hình" })).not.toBeInTheDocument();
  });

  it("uses configured routes from the backend menu when available", async () => {
    vi.mocked(systemService.getMyMenu).mockResolvedValue([
      {
        code: "SYSTEM",
        name: "Hệ thống",
        moduleCode: "SYSTEM",
        sortOrder: 1,
        funcUrl: null,
        iconName: "Folder",
        badgeText: null,
        children: [{
          code: "FUNCTIONS",
          name: "Quản lý chức năng",
          moduleCode: "SYSTEM",
          sortOrder: 1,
          funcUrl: "/admin/functions",
          iconName: "Settings",
          badgeText: null,
          children: [],
        }],
      },
    ]);
    const onNavigate = vi.fn();
    render(
      <MemoryRouter>
        <AdminMegaMenu onNavigate={onNavigate} onShowToast={vi.fn()} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Hệ Thống & Cấu Hình/ }));
    await screen.findByRole("heading", { name: "HỆ THỐNG" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Quản lý chức năng" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Quản lý chức năng" }));

    expect(onNavigate).toHaveBeenCalledWith("admin-functions");
  });
});
