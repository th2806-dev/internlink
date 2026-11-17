import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SmartExcelImportView from "../features/admin/pages/SmartExcelImportView";
import { apiRequestRaw, downloadAuthenticatedFile } from "../lib/apiClient";

vi.mock("../lib/apiClient", () => ({
  apiRequestRaw: vi.fn(),
  downloadAuthenticatedFile: vi.fn(),
  getApiErrorMessage: (error: unknown) => error instanceof Error ? error.message : "API error",
}));

vi.mock("../contexts/SemesterContext", () => ({
  useSemester: () => ({ selectedDepartmentId: "department-cntt" }),
  toApiDepartmentId: (id: string | undefined) => id === "all" ? undefined : id,
}));

const preview = {
  fileId: "file-1",
  headers: [
    { column: "A", title: "Mã số SV (MSSV)" },
    { column: "B", title: "Họ, tên sinh viên" },
    { column: "C", title: "E-mail trường" },
    { column: "D", title: "Số điện thoại liên hệ" },
    { column: "E", title: "Lớp sinh hoạt" },
    { column: "F", title: "Chuyên ngành" },
  ],
  sampleRows: [["SV001", "Nguyễn An", "an@example.edu.vn", "0900000000", "C24A.TH", "Công nghệ thông tin"]],
  validationErrors: [],
  dataRowCount: 1,
  sheetNames: ["Danh sách sinh viên", "Sheet2"],
  selectedSheetName: "Danh sách sinh viên",
  headerRowIndex: 2,
};

const preset = {
  id: "preset-1",
  mappingCode: "C24ATH_STUDENTS",
  mappingName: "Mẫu C24ATH",
  targetEntity: "Students",
  startRowIndex: 4,
  tenantId: null,
  departmentId: "department-cntt",
  notes: null,
  mappings: [
    { systemFieldCode: "StudentCode", excelColumnName: "MSSV", excelColumnIndex: 0, isRequired: true, defaultValue: null, transformRule: "TRIM" },
    { systemFieldCode: "FullName", excelColumnName: "Họ và tên", excelColumnIndex: 1, isRequired: true, defaultValue: null, transformRule: "TRIM" },
  ],
};
const validImport = {
  isValid: true,
  totalRecords: 1,
  validRecordsCount: 1,
  warningRecordsCount: 0,
  errorRecordsCount: 0,
  rows: [{ rowIndex: 4, status: "Valid", issues: [] }],
  errorReportId: null,
  errorReportUrl: null,
};

function createFile(name = "students.xlsx") {
  return new File(["excel"], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

async function uploadFile(file = createFile()) {
  fireEvent.change(screen.getByLabelText("Chọn tệp Excel"), { target: { files: [file] } });
  expect(await screen.findByText(file.name)).toBeInTheDocument();
}

async function goToMappingStep() {
  fireEvent.click(await screen.findByRole("button", { name: /Tiếp tục: ghép cột/ }));
  expect(await screen.findByRole("heading", { name: /Ghép cột Excel với trường hệ thống/ })).toBeInTheDocument();
}

describe("SmartExcelImportView", () => {
  beforeEach(() => {
    vi.mocked(apiRequestRaw).mockReset();
    vi.mocked(downloadAuthenticatedFile).mockReset();
    vi.mocked(apiRequestRaw).mockResolvedValue([]);
  });

  it("uploads a workbook, chooses a sheet, and requests a fresh preview", async () => {
    vi.mocked(apiRequestRaw)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce({ ...preview, selectedSheetName: "Sheet2" });
    render(<SmartExcelImportView />);
    await uploadFile();

    expect(apiRequestRaw).toHaveBeenNthCalledWith(2, "/api/v1/system/excel/preview", expect.objectContaining({
      method: "POST",
      body: expect.any(FormData),
    }));
    expect(await screen.findByRole("combobox", { name: "Chọn sheet" })).toHaveValue("Danh sách sinh viên");
    const requestBody = vi.mocked(apiRequestRaw).mock.calls[1][1]?.body as FormData;
    expect(requestBody.get("file")).toBeInstanceOf(File);

    fireEvent.change(screen.getByRole("combobox", { name: "Chọn sheet" }), { target: { value: "Sheet2" } });
    await waitFor(() => expect(apiRequestRaw).toHaveBeenCalledTimes(3));
    const sheetRequestBody = vi.mocked(apiRequestRaw).mock.calls[2][1]?.body as FormData;
    expect(sheetRequestBody.get("sheetName")).toBe("Sheet2");
    expect(screen.getByRole("combobox", { name: "Chọn sheet" })).toHaveValue("Sheet2");
  });

  it("validates the mapped workbook and commits only after confirmation", async () => {
    vi.mocked(apiRequestRaw)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce(validImport)
      .mockResolvedValueOnce({
        totalProcessed: 1,
        successCount: 1,
        updatedCount: 0,
        errorCount: 0,
        errorReportId: null,
        errorReportUrl: null,
      });
    render(<SmartExcelImportView />);
    await uploadFile();
    await goToMappingStep();

    expect(screen.getByRole("combobox", { name: "Ghép cột Mã số sinh viên" })).toHaveValue("A");
    expect(screen.getByRole("combobox", { name: "Ghép cột Họ và tên" })).toHaveValue("B");
    expect(screen.getByRole("combobox", { name: "Ghép cột Điện thoại" })).toHaveValue("D");
    expect(screen.getByRole("combobox", { name: "Ghép cột Lớp" })).toHaveValue("E");
    expect(screen.getByRole("combobox", { name: "Ghép cột Ngành" })).toHaveValue("F");

    fireEvent.change(screen.getByRole("combobox", { name: "Ghép cột Mã số sinh viên" }), { target: { value: "" } });
    expect(screen.getByRole("button", { name: "Kiểm tra dữ liệu" })).toBeDisabled();
    fireEvent.change(screen.getByRole("combobox", { name: "Ghép cột Mã số sinh viên" }), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu" }));

    expect(await screen.findByRole("region", { name: "Kết quả kiểm tra dữ liệu" })).toBeInTheDocument();
    const table = screen.getAllByRole("table")[0];
    expect(within(table).getByRole("columnheader", { name: /Mã số sinh viên/ })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: /Điện thoại/ })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "SV001" })).toBeInTheDocument();
    const importButton = screen.getByRole("button", { name: "Xác nhận nạp vào hệ thống" });
    expect(importButton).toBeEnabled();
    expect(apiRequestRaw).toHaveBeenNthCalledWith(3, "/api/v1/system/excel/validate", expect.objectContaining({
      method: "POST",
      body: expect.objectContaining({
        fileId: "file-1",
        mappingConfig: expect.objectContaining({
          targetEntity: "Students",
          mappings: expect.arrayContaining([
            expect.objectContaining({ systemFieldCode: "StudentCode", excelColumnIndex: 0 }),
            expect.objectContaining({ systemFieldCode: "FullName", excelColumnIndex: 1 }),
          ]),
        }),
      }),
    }));

    fireEvent.click(importButton);
    expect(await screen.findByText("Nạp dữ liệu thành công.")).toBeInTheDocument();
    expect(apiRequestRaw).toHaveBeenNthCalledWith(4, "/api/v1/system/excel/execute-import", expect.objectContaining({
      method: "POST",
      body: expect.objectContaining({ fileId: "file-1", confirmImport: true }),
    }));
  });

  it("keeps commit disabled when validation reports errors and offers an error workbook", async () => {
    vi.mocked(apiRequestRaw)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce({
        ...validImport,
        isValid: false,
        validRecordsCount: 0,
        errorRecordsCount: 1,
        rows: [{
          rowIndex: 4,
          status: "Error",
          issues: [{ rowIndex: 4, fieldCode: "Email", errorMessage: "Email không đúng định dạng.", rawValue: "bad", severity: "Error" }],
        }],
        errorReportId: "report-1",
        errorReportUrl: "/api/v1/system/excel/error-reports/report-1",
      });
    vi.mocked(downloadAuthenticatedFile).mockResolvedValue({ blob: new Blob(), filename: "errors.xlsx" });
    render(<SmartExcelImportView />);
    await uploadFile();
    await goToMappingStep();
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu" }));

    expect(await screen.findByRole("button", { name: "Xác nhận nạp vào hệ thống" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Tải báo cáo lỗi Excel" }));
    await waitFor(() => expect(downloadAuthenticatedFile).toHaveBeenCalledWith(
      "/api/v1/system/excel/error-reports/report-1",
      "bao-cao-loi-nap-excel.xlsx",
    ));
    expect(apiRequestRaw).not.toHaveBeenCalledWith("/api/v1/system/excel/execute-import", expect.anything());
  });

  it("loads a department preset into the mapping studio", async () => {
    vi.mocked(apiRequestRaw)
      .mockResolvedValueOnce([preset])
      .mockResolvedValueOnce(preview);
    render(<SmartExcelImportView />);
    await uploadFile();
    await goToMappingStep();

    expect(apiRequestRaw).toHaveBeenCalledWith(
      "/api/v1/system/excel/mappings?departmentId=department-cntt",
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Chọn cấu hình mẫu" }), { target: { value: preset.id } });
    expect(screen.getByRole("combobox", { name: "Ghép cột Mã số sinh viên" })).toHaveValue("A");
    expect(screen.getByRole("combobox", { name: "Ghép cột Họ và tên" })).toHaveValue("B");
    expect(screen.getByRole("button", { name: "Kiểm tra dữ liệu" })).toBeEnabled();
  });

  it("saves the selected mappings as a reusable preset", async () => {
    vi.mocked(apiRequestRaw)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce({ ...preset, mappingName: "Mẫu import C24ATH" });
    render(<SmartExcelImportView />);
    await uploadFile();
    await goToMappingStep();
    fireEvent.click(screen.getByRole("button", { name: "Lưu cấu hình mẫu" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Tên cấu hình mẫu" }), {
      target: { value: "Mẫu import C24ATH" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu cấu hình" }));

    await waitFor(() => expect(apiRequestRaw).toHaveBeenCalledTimes(3));
    expect(apiRequestRaw).toHaveBeenLastCalledWith("/api/v1/system/excel/mappings", expect.objectContaining({
      method: "POST",
      body: expect.objectContaining({
        mappingCode: "MAU_IMPORT_C24ATH",
        mappingName: "Mẫu import C24ATH",
        targetEntity: "Students",
        departmentId: "department-cntt",
        mappings: expect.arrayContaining([
          expect.objectContaining({ systemFieldCode: "StudentCode", excelColumnIndex: 0, isRequired: true }),
          expect.objectContaining({ systemFieldCode: "FullName", excelColumnIndex: 1, isRequired: true }),
        ]),
      }),
    }));
    expect(await screen.findByRole("option", { name: "Mẫu import C24ATH" })).toBeInTheDocument();
  });

  it("rejects unsupported files and explains how to recover", async () => {
    render(<SmartExcelImportView />);
    fireEvent.change(screen.getByLabelText("Chọn tệp Excel"), { target: { files: [createFile("students.csv")] } });

    expect(await screen.findByRole("alert")).toHaveTextContent("Vui lòng chọn tệp .xlsx hoặc .xls.");
    expect(apiRequestRaw).toHaveBeenCalledTimes(1);
  });
});
