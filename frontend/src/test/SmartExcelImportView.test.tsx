import { fireEvent, render, screen } from "@testing-library/react";
import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SmartExcelImportView from "../features/admin/pages/SmartExcelImportView";
import { apiRequestRaw } from "../lib/apiClient";

vi.mock("../lib/apiClient", () => ({
  apiRequestRaw: vi.fn(),
}));

const preview = {
  headers: [{ column: "A", title: "MSSV" }, { column: "B", title: "Họ tên" }],
  sampleRows: [["SV001", "Nguyễn An"]],
  validationErrors: [],
  dataRowCount: 1,
};

describe("SmartExcelImportView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("previews, validates, maps columns and imports the spreadsheet", async () => {
    vi.mocked(apiRequestRaw)
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce({ successCount: 1, errors: [] });
    render(<SmartExcelImportView />);

    const file = new File(["excel"], "students.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    fireEvent.change(screen.getByLabelText("Chọn tệp Excel"), { target: { files: [file] } });

    expect(await screen.findByText("students.xlsx")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Mã số sinh viên/), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: "B" } });
    fireEvent.click(screen.getByRole("button", { name: /Kiểm tra toàn bộ dữ liệu/ }));
    await waitFor(() => expect(apiRequestRaw).toHaveBeenCalledTimes(2));
    fireEvent.click(await screen.findByRole("button", { name: /Xác nhận nạp dữ liệu/ }));

    expect(await screen.findByRole("status")).toHaveTextContent("Đã nạp thành công 1 sinh viên");
    expect(apiRequestRaw).toHaveBeenLastCalledWith("/api/v1/system/excel/import-students", expect.objectContaining({
      method: "POST",
      body: expect.any(FormData),
    }));
  });
});
