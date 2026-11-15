import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GridConfigStudioView } from "../features/admin/pages/GridConfigStudioView";
import { systemService } from "../services/system.service";
import { systemAdminService } from "../services/systemAdmin.service";

const mocks = vi.hoisted(() => ({
  useGridConfig: vi.fn(),
}));

vi.mock("../hooks/useSystemMenu", () => ({
  useGridConfig: mocks.useGridConfig,
}));

vi.mock("../services/systemAdmin.service", () => ({
  systemAdminService: {
    getRoles: vi.fn(),
  },
}));

describe("GridConfigStudioView", () => {
  beforeEach(() => {
    mocks.useGridConfig.mockReset();
    mocks.useGridConfig.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    vi.mocked(systemAdminService.getRoles).mockResolvedValue([
      { id: 7, code: "Lecturer", name: "Giảng viên hướng dẫn", description: null },
    ]);
  });

  it("provides defaults for all supported screens and updates live preview", async () => {
    renderStudio();
    expect(screen.getByRole("heading", { name: "Xem trước trực tiếp" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "MSSV" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Màn hình cần cấu hình"), {
      target: { value: "LECTURERS_LIST" },
    });
    await waitFor(() => {
      expect(screen.getByRole("columnheader", { name: "Mã giảng viên" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Màn hình cần cấu hình"), {
      target: { value: "GRADING_SUMMARY" },
    });
    await waitFor(() => {
      expect(screen.getByRole("columnheader", { name: "MSSV" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Tiêu đề hiển thị cho studentCode"), {
      target: { value: "Mã sinh viên" },
    });
    await waitFor(() => {
      expect(screen.getByRole("columnheader", { name: "Mã sinh viên" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("checkbox", { name: "Ẩn cột Mã sinh viên" }));
    await waitFor(() => {
      expect(screen.queryByRole("columnheader", { name: "Mã sinh viên" })).not.toBeInTheDocument();
    });
  }, 15000);

  it("saves the adjusted grid configuration through the system API", async () => {
    const saveSpy = vi.spyOn(systemService, "saveGridConfig").mockResolvedValue([]);
    const onShowToast = vi.fn();
    renderStudio(onShowToast);

    fireEvent.click(screen.getByRole("button", { name: "Lưu cấu hình" }));

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledWith("GRADING_SUMMARY", expect.arrayContaining([
        expect.objectContaining({ fieldCode: "studentCode", headerTitle: "MSSV" }),
      ]), undefined);
      expect(onShowToast).toHaveBeenCalledWith("Đã lưu cấu hình bảng thành công.", "success");
    });

    saveSpy.mockRestore();
  }, 15000);

  it("loads and saves configurations for the selected role", async () => {
    const saveSpy = vi.spyOn(systemService, "saveGridConfig").mockResolvedValue([]);
    renderStudio();

    await screen.findByRole(
      "option",
      { name: "Giảng viên hướng dẫn" },
      { timeout: 15000 },
    );
    fireEvent.change(await screen.findByLabelText("Vai trò áp dụng"), {
      target: { value: "7" },
    });
    await waitFor(() => {
      expect(mocks.useGridConfig).toHaveBeenCalledWith("GRADING_SUMMARY", true, 7);
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu cấu hình" }));

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledWith(
        "GRADING_SUMMARY",
        expect.arrayContaining([expect.objectContaining({ fieldCode: "studentCode" })]),
        7,
      );
    });
    saveSpy.mockRestore();
  }, 15000);

  it("pins a column to the selected side in the live preview", () => {
    renderStudio();

    fireEvent.change(screen.getByLabelText("Vị trí ghim MSSV"), {
      target: { value: "right" },
    });

    expect(screen.getByRole("columnheader", { name: "MSSV" })).toHaveStyle({ right: "0px" });
  });
});

function renderStudio(onShowToast = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GridConfigStudioView onShowToast={onShowToast} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
