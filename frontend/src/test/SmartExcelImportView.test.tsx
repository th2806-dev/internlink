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

const lecturerPreview = {
  ...preview,
  headers: [
    { column: "A", title: "Mã GV" },
    { column: "B", title: "Họ và tên" },
    { column: "C", title: "Email" },
    { column: "D", title: "Điện thoại" },
    { column: "E", title: "Học vị" },
    { column: "F", title: "Khoa" },
  ],
  sampleRows: [["GV001", "Nguyễn An", "an@example.edu.vn", "0900000000", "Thạc sĩ", "CNTT"]],
  sheetNames: ["Danh sách giảng viên"],
  selectedSheetName: "Danh sách giảng viên",
};

const companyPreview = {
  ...preview,
  headers: [
    { column: "A", title: "Mã doanh nghiệp" },
    { column: "B", title: "Tên doanh nghiệp" },
    { column: "C", title: "MST" },
    { column: "D", title: "Địa chỉ" },
    { column: "E", title: "Người liên hệ" },
    { column: "F", title: "Email liên hệ" },
    { column: "G", title: "Điện thoại liên hệ" },
    { column: "H", title: "Ngành nghề" },
    { column: "I", title: "Website" },
  ],
  sampleRows: [["CTY001", "Công ty An", "0123456789", "Quận 1", "Nguyễn An", "an@example.com", "0900000000", "Công nghệ", "https://example.com"]],
  sheetNames: ["Danh sách doanh nghiệp"],
  selectedSheetName: "Danh sách doanh nghiệp",
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
    expect(await screen.findByText("Đã nạp thành công 1/1 dòng.")).toBeInTheDocument();
    expect(apiRequestRaw).toHaveBeenNthCalledWith(4, "/api/v1/system/excel/execute-import", expect.objectContaining({
      method: "POST",
      body: expect.objectContaining({ fileId: "file-1", confirmImport: true }),
    }));
  });

  it("maps lecturer-specific columns and sends Lecturers to validation", async () => {
    vi.mocked(apiRequestRaw)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(lecturerPreview)
      .mockResolvedValueOnce(validImport);
    render(<SmartExcelImportView />);
    await uploadFile(createFile("lecturers.xlsx"));
    await goToMappingStep();
    const entitySelector = screen.getByRole("combobox", { name: "Loại dữ liệu cần nạp" });
    await waitFor(() => expect(entitySelector).toBeEnabled());
    fireEvent.change(entitySelector, {
      target: { value: "Lecturers" },
    });

    expect(screen.getByRole("combobox", { name: "Ghép cột Mã giảng viên" })).toHaveValue("A");
    expect(screen.getByRole("combobox", { name: "Ghép cột Họ và tên" })).toHaveValue("B");
    expect(screen.getByRole("combobox", { name: "Ghép cột Học hàm / học vị" })).toHaveValue("E");
    expect(screen.getByRole("combobox", { name: "Ghép cột Khoa / đơn vị" })).toHaveValue("F");
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu" }));

    expect(await screen.findByRole("region", { name: "Kết quả kiểm tra dữ liệu" })).toBeInTheDocument();
    expect(apiRequestRaw).toHaveBeenNthCalledWith(3, "/api/v1/system/excel/validate", expect.objectContaining({
      body: expect.objectContaining({
        mappingConfig: expect.objectContaining({
          targetEntity: "Lecturers",
          mappings: expect.arrayContaining([
            expect.objectContaining({ systemFieldCode: "StaffCode", excelColumnIndex: 0 }),
            expect.objectContaining({ systemFieldCode: "AcademicTitle", excelColumnIndex: 4 }),
            expect.objectContaining({ systemFieldCode: "DepartmentName", excelColumnIndex: 5 }),
          ]),
        }),
      }),
    }));
  });

  it("maps company fields and preserves Companies through validation and commit", async () => {
    vi.mocked(apiRequestRaw)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(companyPreview)
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
    await uploadFile(createFile("companies.xlsx"));
    await goToMappingStep();
    const entitySelector = screen.getByRole("combobox", { name: "Loại dữ liệu cần nạp" });
    await waitFor(() => expect(entitySelector).toBeEnabled());
    fireEvent.change(entitySelector, {
      target: { value: "Companies" },
    });

    expect(screen.getByRole("combobox", { name: "Ghép cột Tên doanh nghiệp" })).toHaveValue("B");
    expect(screen.getByRole("combobox", { name: "Ghép cột Mã doanh nghiệp" })).toHaveValue("A");
    expect(screen.getByRole("combobox", { name: "Ghép cột Mã số thuế" })).toHaveValue("C");
    expect(screen.getByRole("combobox", { name: "Ghép cột Điện thoại liên hệ" })).toHaveValue("G");
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu" }));

    expect(await screen.findByRole("region", { name: "Kết quả kiểm tra dữ liệu" })).toBeInTheDocument();
    expect(apiRequestRaw).toHaveBeenNthCalledWith(3, "/api/v1/system/excel/validate", expect.objectContaining({
      body: expect.objectContaining({
        mappingConfig: expect.objectContaining({
          targetEntity: "Companies",
          mappings: expect.arrayContaining([
            expect.objectContaining({ systemFieldCode: "CompanyName", excelColumnIndex: 1 }),
            expect.objectContaining({ systemFieldCode: "TaxCode", excelColumnIndex: 2 }),
          ]),
        }),
      }),
    }));

    fireEvent.click(screen.getByRole("button", { name: "Xác nhận nạp vào hệ thống" }));
    await screen.findByText("Đã nạp thành công 1/1 dòng.");
    expect(apiRequestRaw).toHaveBeenNthCalledWith(4, "/api/v1/system/excel/execute-import", expect.objectContaining({
      body: expect.objectContaining({
        mappingConfig: expect.objectContaining({ targetEntity: "Companies" }),
      }),
    }));
  });

  it("commits valid rows when validation reports row errors and offers an error workbook", async () => {
    vi.mocked(apiRequestRaw)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce({
        ...validImport,
        isValid: false,
        totalRecords: 2,
        validRecordsCount: 1,
        errorRecordsCount: 1,
        rows: [
          { rowIndex: 4, status: "Valid", issues: [] },
          {
            rowIndex: 5,
            status: "Error",
            issues: [{ rowIndex: 5, fieldCode: "Email", errorMessage: "Email không đúng định dạng.", rawValue: "bad", severity: "Error" }],
          },
        ],
        errorReportId: "report-1",
        errorReportUrl: "/api/v1/system/excel/error-reports/report-1",
      })
      .mockResolvedValueOnce({
        totalProcessed: 2,
        successCount: 1,
        updatedCount: 0,
        errorCount: 1,
        errorReportId: "report-1",
        errorReportUrl: "/api/v1/system/excel/error-reports/report-1",
      });
    vi.mocked(downloadAuthenticatedFile).mockResolvedValue({ blob: new Blob(), filename: "errors.xlsx" });
    render(<SmartExcelImportView />);
    await uploadFile();
    await goToMappingStep();
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu" }));

    const importButton = await screen.findByRole("button", { name: "Nạp 1 dòng hợp lệ" });
    expect(importButton).toBeEnabled();
    expect(screen.getByText("Email: Email không đúng định dạng.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tải báo cáo lỗi Excel" }));
    await waitFor(() => expect(downloadAuthenticatedFile).toHaveBeenCalledWith(
      "/api/v1/system/excel/error-reports/report-1",
      "bao-cao-loi-nap-excel.xlsx",
    ));
    fireEvent.click(importButton);
    expect(await screen.findByText("Đã nạp thành công 1/2 dòng. 1 dòng lỗi.")).toBeInTheDocument();
    expect(apiRequestRaw).toHaveBeenCalledWith("/api/v1/system/excel/execute-import", expect.objectContaining({
      method: "POST",
      body: expect.objectContaining({ fileId: "file-1", confirmImport: true }),
    }));
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

  it("keeps preset-list failures separate from workbook upload errors and supports retry", async () => {
    vi.mocked(apiRequestRaw)
      .mockRejectedValueOnce(new Error("HTTP 403"))
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce([]);
    render(<SmartExcelImportView />);
    await uploadFile();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await goToMappingStep();
    expect(screen.getByRole("status")).toHaveTextContent("Không tải được cấu hình mẫu đã lưu: HTTP 403");
    expect(screen.getByRole("status")).toHaveTextContent("Bạn vẫn có thể ghép cột thủ công.");

    fireEvent.click(screen.getByRole("button", { name: "Thử tải lại" }));
    await waitFor(() => expect(screen.queryByText(/Không tải được cấu hình mẫu đã lưu/)).not.toBeInTheDocument());
    expect(apiRequestRaw).toHaveBeenCalledTimes(3);
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
