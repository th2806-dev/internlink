import { useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, FileUp, LoaderCircle, UploadCloud } from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { apiRequestRaw } from "../../../lib/apiClient";

type ImportHeader = { column: string; title: string };
type ImportPreview = {
  headers: ImportHeader[];
  sampleRows: string[][];
  validationErrors: ImportError[];
  dataRowCount: number;
};
type ImportError = { rowNumber: number; field: string; message: string };
type ImportMapping = { mssv: string; name: string; class: string; email: string; phone: string };
type ImportResult = { successCount: number; errors: ImportError[] };

const EMPTY_MAPPING: ImportMapping = { mssv: "", name: "", class: "", email: "", phone: "" };
const FIELDS: Array<{ key: keyof ImportMapping; label: string; required?: boolean }> = [
  { key: "mssv", label: "Mã số sinh viên (MSSV)", required: true },
  { key: "name", label: "Họ và tên", required: true },
  { key: "class", label: "Lớp" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Số điện thoại" },
];

function createFormData(file: File, mapping?: ImportMapping) {
  const formData = new FormData();
  formData.append("file", file);
  if (mapping) formData.append("mapping", JSON.stringify(mapping));
  return formData;
}

export default function SmartExcelImportView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState(EMPTY_MAPPING);
  const [validationErrors, setValidationErrors] = useState<ImportError[]>([]);
  const [hasValidated, setHasValidated] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState<"preview" | "validate" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const mappingIsValid = Boolean(mapping.mssv && mapping.name);
  const importBlocked = !file || !mappingIsValid || !hasValidated || busy !== null || validationErrors.length > 0;
  const mappedColumns = useMemo(
    () => new Map(Object.entries(mapping).filter(([, value]) => value).map(([field, value]) => [value, field])),
    [mapping],
  );

  const loadFile = async (selectedFile: File | undefined) => {
    if (!selectedFile) return;
    if (!/\.(xlsx|xls)$/i.test(selectedFile.name)) {
      setError("Vui lòng chọn tệp .xlsx hoặc .xls.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("Dung lượng tệp không được vượt quá 10 MB.");
      return;
    }

    setFile(selectedFile);
    setPreview(null);
    setValidationErrors([]);
    setHasValidated(false);
    setResult(null);
    setMapping(EMPTY_MAPPING);
    setError(null);
    setBusy("preview");
    try {
      const data = await apiRequestRaw<ImportPreview>("/api/v1/system/excel/preview", {
        method: "POST",
        body: createFormData(selectedFile),
      });
      setPreview(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không đọc được tệp Excel.");
    } finally {
      setBusy(null);
    }
  };

  const validateFile = async () => {
    if (!file || !mappingIsValid) return;
    setBusy("validate");
    setError(null);
    setResult(null);
    try {
      const data = await apiRequestRaw<ImportPreview>("/api/v1/system/excel/preview", {
        method: "POST",
        body: createFormData(file, mapping),
      });
      setPreview(data);
      setValidationErrors(data.validationErrors);
      setHasValidated(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể kiểm tra dữ liệu.");
    } finally {
      setBusy(null);
    }
  };

  const importFile = async () => {
    if (importBlocked || !file) return;
    setBusy("import");
    setError(null);
    try {
      const formData = createFormData(file, mapping);
      const data = await apiRequestRaw<ImportResult>("/api/v1/system/excel/import-students", {
        method: "POST",
        body: formData,
      });
      setResult(data);
      setValidationErrors(data.errors);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể nạp dữ liệu.");
    } finally {
      setBusy(null);
    }
  };

  const hasRowError = (sampleIndex: number, field: string) => {
    const rowNumber = sampleIndex + 2;
    return validationErrors.some((item) => item.rowNumber === rowNumber && item.field === field);
  };

  return (
    <main className="mx-auto max-w-[1300px] space-y-4 animate-in fade-in duration-200 font-sans pb-12">
      <PageHeader
        icon={FileSpreadsheet}
        title="Smart Excel Import Studio"
        subtitle="Tải bảng danh sách, ánh xạ cột linh hoạt và kiểm tra lỗi trước khi thêm sinh viên."
        badge="IMPORT STUDIO"
        badgeColor="border-blue-200 bg-blue-50 text-[#026aa7]"
      />

      <section
        onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => { event.preventDefault(); setIsDragging(false); void loadFile(event.dataTransfer.files[0]); }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors sm:p-10 ${isDragging ? "border-[#026aa7] bg-blue-50/40" : "border-slate-300 bg-white"}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="sr-only"
          aria-label="Chọn tệp Excel"
          onChange={(event) => void loadFile(event.target.files?.[0])}
        />
        <UploadCloud aria-hidden="true" className="mx-auto h-9 w-9 text-[#026aa7]" />
        <h2 className="mt-3 font-semibold text-slate-900">Kéo thả tệp Excel vào đây</h2>
        <p className="mt-1 text-sm text-slate-600">Hỗ trợ .xlsx, .xls · Tối đa 10 MB</p>
        <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]">
          <FileUp aria-hidden="true" className="h-4 w-4" />
          Chọn tệp
        </button>
        {file && <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700"><FileSpreadsheet aria-hidden="true" className="h-4 w-4 text-[#7bc043]" />{file.name}</p>}
      </section>

      {busy === "preview" && <p className="flex items-center gap-2 text-sm text-slate-600"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />Đang đọc dữ liệu...</p>}

      {preview && (
        <>
          <section className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">1. Ánh xạ cột dữ liệu</h2>
                <p className="mt-1 text-sm text-slate-600">Tệp có {preview.dataRowCount.toLocaleString("vi-VN")} dòng dữ liệu. MSSV và họ tên là bắt buộc.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map(({ key, label, required }) => (
                <label key={key} className="block text-sm font-medium text-slate-800">
                  {label}{required && <span className="ml-1 text-rose-700" aria-label="bắt buộc">*</span>}
                  <select
                    value={mapping[key]}
                    onChange={(event) => { setMapping((current) => ({ ...current, [key]: event.target.value })); setValidationErrors([]); setHasValidated(false); setResult(null); }}
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                  >
                    <option value="">Không ánh xạ</option>
                    {preview.headers.map((header) => <option key={header.column} value={header.column}>{header.column} · {header.title}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <button type="button" disabled={!mappingIsValid || busy !== null} onClick={() => void validateFile()} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 font-semibold text-[#026aa7] hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50">
              {busy === "validate" ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
              2. Kiểm tra toàn bộ dữ liệu
            </button>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-900">Xem trước dữ liệu</h2>
                <p className="mt-1 text-sm text-slate-600">Hiển thị 5 dòng đầu tiên của tệp.</p>
              </div>
              {validationErrors.length > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-800"><AlertCircle aria-hidden="true" className="h-4 w-4" />{validationErrors.length} lỗi cần xử lý</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>{preview.headers.map((header) => <th key={header.column} className="px-4 py-3">{header.column} · {header.title}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.sampleRows.length === 0 ? <tr><td colSpan={preview.headers.length} className="px-4 py-8 text-center text-slate-500">Không có dữ liệu xem trước.</td></tr> : preview.sampleRows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {preview.headers.map((header, columnIndex) => {
                        const field = mappedColumns.get(header.column);
                        const invalid = field ? hasRowError(rowIndex, field) : false;
                        const message = validationErrors.find((item) => item.rowNumber === rowIndex + 2 && item.field === field)?.message;
                        return <td key={header.column} className={`max-w-64 px-4 py-3 ${invalid ? "bg-rose-50 text-rose-900" : "text-slate-700"}`} title={message}>{row[columnIndex] || "—"}{invalid && <span className="sr-only">Lỗi: {message}</span>}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {validationErrors.length > 0 && (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <h2 className="font-bold text-rose-950">Các dòng cần sửa trước khi nhập</h2>
          <ul className="mt-3 max-h-60 space-y-2 overflow-auto text-sm text-rose-900">
            {validationErrors.map((item, index) => <li key={`${item.rowNumber}-${item.field}-${index}`}>Dòng {item.rowNumber} · {FIELDS.find((field) => field.key === item.field)?.label ?? item.field}: {item.message}</li>)}
          </ul>
        </section>
      )}

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      {preview && (
        <section className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">3. Xác nhận nạp dữ liệu</h2>
            <p className="mt-1 text-sm text-slate-600">Các MSSV đã tồn tại và dòng không hợp lệ sẽ không được thêm.</p>
          </div>
          <button type="button" onClick={() => void importFile()} disabled={importBlocked} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#026aa7] px-4 text-xs font-bold text-white hover:bg-[#025a8e] disabled:cursor-not-allowed disabled:opacity-50">
            {busy === "import" ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <FileUp aria-hidden="true" className="h-4 w-4" />}
            {busy === "import" ? "Đang nạp dữ liệu..." : "Xác nhận nạp dữ liệu"}
          </button>
        </section>
      )}

      {result && <p role="status" className="rounded-xl border border-[#7bc043]/40 bg-[#7bc043]/10 p-4 text-sm font-medium text-slate-800">Đã nạp thành công {result.successCount.toLocaleString("vi-VN")} sinh viên. {result.errors.length ? `${result.errors.length} dòng có lỗi.` : "Không có dòng lỗi."}</p>}
    </main>
  );
}
