import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  LoaderCircle,
  Save,
  UploadCloud,
} from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { useSemester, toApiDepartmentId } from "../../../contexts/SemesterContext";
import { apiRequestRaw, getApiErrorMessage } from "../../../lib/apiClient";

type ImportHeader = { column: string; title: string };
type ImportPreview = {
  headers: ImportHeader[];
  sampleRows: string[][];
  validationErrors: ImportError[];
  dataRowCount: number;
  sheetNames?: string[];
  selectedSheetName?: string;
  headerRowIndex?: number;
};
type ImportError = { rowNumber: number; field: string; message: string };
type MappingPreset = {
  id: string;
  mappingCode: string;
  mappingName: string;
  targetEntity: string;
  startRowIndex: number;
  tenantId: string | null;
  departmentId: string | null;
  notes: string | null;
  mappings: PresetColumnMapping[];
};
type PresetColumnMapping = {
  systemFieldCode: string;
  excelColumnName: string;
  excelColumnIndex: number;
  isRequired: boolean;
  defaultValue: string | null;
  transformRule: string | null;
};
type FieldCode = "StudentCode" | "FullName" | "Email" | "PhoneNumber" | "ClassName" | "MajorName";
type MappingState = Record<FieldCode, string>;
type ImportField = {
  code: FieldCode;
  label: string;
  required: boolean;
  aliases: string[];
};

const PREVIEW_ENDPOINT = "/api/v1/system/excel/preview";
const PRESETS_ENDPOINT = "/api/v1/system/excel/mappings";
const EMPTY_MAPPING: MappingState = {
  StudentCode: "",
  FullName: "",
  Email: "",
  PhoneNumber: "",
  ClassName: "",
  MajorName: "",
};
const FIELDS: ImportField[] = [
  {
    code: "StudentCode",
    label: "Mã số sinh viên",
    required: true,
    aliases: ["mssv", "ma sv", "ma sinh vien", "ma so sinh vien", "student code", "student id"],
  },
  {
    code: "FullName",
    label: "Họ và tên",
    required: true,
    aliases: ["ho va ten", "ho ten", "ten sinh vien", "ten sv", "full name", "fullname"],
  },
  { code: "Email", label: "Email", required: false, aliases: ["email", "e mail", "thu dien tu"] },
  {
    code: "PhoneNumber",
    label: "Điện thoại",
    required: false,
    aliases: ["dien thoai", "so dien thoai", "sdt", "mobile", "phone", "phone number"],
  },
  { code: "ClassName", label: "Lớp", required: false, aliases: ["lop", "lop sinh hoat", "class", "class name"] },
  { code: "MajorName", label: "Ngành", required: false, aliases: ["nganh", "chuyen nganh", "major", "major name"] },
];
const STEPS = [
  { number: 1, title: "Tải tệp & chọn sheet" },
  { number: 2, title: "Ghép cột dữ liệu" },
  { number: 3, title: "Xem trước" },
];

function createFormData(file: File, sheetName?: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (sheetName) formData.append("sheetName", sheetName);
  return formData;
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    let diagonal = previous[0];
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const above = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

function suggestMappings(headers: ImportHeader[]): MappingState {
  const candidates = FIELDS.flatMap((field) =>
    headers.flatMap((header) => {
      const normalized = normalizeHeader(header.title);
      const score = field.aliases.reduce((best, alias) => {
        const normalizedAlias = normalizeHeader(alias);
        if (normalized === normalizedAlias) return Math.max(best, 100);
        if (normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized)) return Math.max(best, 80);
        if (normalized.length < 4 || normalizedAlias.length < 4) return best;
        const distance = editDistance(normalized, normalizedAlias);
        const similarity = 1 - distance / Math.max(normalized.length, normalizedAlias.length);
        return similarity >= 0.82 ? Math.max(best, 65) : best;
      }, 0);
      return score > 0 ? [{ field: field.code, column: header.column, score }] : [];
    }),
  ).sort((left, right) => right.score - left.score);
  const result = { ...EMPTY_MAPPING };
  const usedColumns = new Set<string>();

  for (const candidate of candidates) {
    if (result[candidate.field] || usedColumns.has(candidate.column)) continue;
    result[candidate.field] = candidate.column;
    usedColumns.add(candidate.column);
  }
  return result;
}

function columnLetterToIndex(column: string) {
  return [...column.toUpperCase()].reduce((index, character) => index * 26 + character.charCodeAt(0) - 64, 0) - 1;
}

function columnIndexToLetter(index: number) {
  let column = index + 1;
  let result = "";
  while (column > 0) {
    column--;
    result = String.fromCharCode(65 + (column % 26)) + result;
    column = Math.floor(column / 26);
  }
  return result;
}

function toMappingCode(value: string) {
  return normalizeHeader(value).replace(/\s+/g, "_").toUpperCase().slice(0, 50);
}

export default function SmartExcelImportView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const { selectedDepartmentId } = useSemester();
  const departmentId = toApiDepartmentId(selectedDepartmentId);
  const presetsUrl = departmentId
    ? `${PRESETS_ENDPOINT}?departmentId=${encodeURIComponent(departmentId)}`
    : PRESETS_ENDPOINT;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [mapping, setMapping] = useState<MappingState>(EMPTY_MAPPING);
  const [presets, setPresets] = useState<MappingPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [presetName, setPresetName] = useState("");
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState<"preview" | "presets" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const mappingIsValid = Boolean(mapping.StudentCode && mapping.FullName);
  const presetCode = toMappingCode(presetName);
  const mappedColumns = useMemo(
    () => new Map(Object.entries(mapping).filter(([, column]) => column)),
    [mapping],
  );
  const mappedFields = FIELDS.filter((field) => mapping[field.code]);

  const loadPresets = useCallback(async () => {
    setBusy("presets");
    try {
      const result = await apiRequestRaw<MappingPreset[]>(presetsUrl);
      setPresets(result);
      setError(null);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy((current) => current === "presets" ? null : current);
    }
  }, [presetsUrl]);

  useEffect(() => {
    void loadPresets();
  }, [loadPresets]);

  const analyzeFile = useCallback(async (
    selectedFile: File,
    sheetName?: string,
    previousSheetName?: string,
  ) => {
    const currentRequestId = ++requestId.current;
    let fallbackPreview: ImportPreview | undefined;
    let fallbackSheetName: string | undefined;
    setBusy("preview");
    setError(null);
    try {
      const result = await apiRequestRaw<ImportPreview>(PREVIEW_ENDPOINT, {
        method: "POST",
        body: createFormData(selectedFile, sheetName),
      });
      if (currentRequestId !== requestId.current) return;

      const firstSheet = result.sheetNames?.[0] ?? result.selectedSheetName ?? "";
      if (!sheetName && firstSheet && firstSheet !== result.selectedSheetName) {
        fallbackPreview = result;
        fallbackSheetName = result.selectedSheetName;
        setPreview(result);
        setSelectedSheet(firstSheet);
        const firstSheetPreview = await apiRequestRaw<ImportPreview>(PREVIEW_ENDPOINT, {
          method: "POST",
          body: createFormData(selectedFile, firstSheet),
        });
        if (currentRequestId !== requestId.current) return;
        setPreview(firstSheetPreview);
        setSelectedSheet(firstSheetPreview.selectedSheetName ?? firstSheet);
        setMapping(suggestMappings(firstSheetPreview.headers));
      } else {
        setPreview(result);
        setSelectedSheet(result.selectedSheetName ?? sheetName ?? firstSheet);
        setMapping(suggestMappings(result.headers));
      }
      setSelectedPresetId("");
      setStep(1);
    } catch (cause) {
      if (currentRequestId === requestId.current) {
        if (fallbackPreview) {
          setPreview(fallbackPreview);
          setSelectedSheet(fallbackSheetName ?? "");
        } else if (sheetName && previousSheetName) {
          setSelectedSheet(previousSheetName);
        }
        setError(getApiErrorMessage(cause));
      }
    } finally {
      if (currentRequestId === requestId.current) setBusy(null);
    }
  }, []);

  const loadFile = (selectedFile?: File) => {
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
    setSelectedSheet("");
    setMapping(EMPTY_MAPPING);
    setStep(1);
    void analyzeFile(selectedFile);
  };

  const changeSheet = (sheetName: string) => {
    if (!file || !sheetName || sheetName === selectedSheet) return;
    const previousSheetName = selectedSheet;
    setSelectedSheet(sheetName);
    setMapping(EMPTY_MAPPING);
    void analyzeFile(file, sheetName, previousSheetName);
  };

  const loadPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = presets.find((item) => item.id === presetId);
    if (!preset || !preview) return;

    const nextMapping = { ...EMPTY_MAPPING };
    for (const item of preset.mappings) {
      const field = FIELDS.find((candidate) => candidate.code.toLowerCase() === item.systemFieldCode.toLowerCase());
      const column = columnIndexToLetter(item.excelColumnIndex);
      if (field && preview.headers.some((header) => header.column === column)) nextMapping[field.code] = column;
    }
    setMapping(nextMapping);
  };

  const changeMapping = (fieldCode: FieldCode, column: string) => {
    setMapping((current) => {
      const next = { ...current, [fieldCode]: column };
      if (column) {
        for (const field of FIELDS) {
          if (field.code !== fieldCode && next[field.code] === column) next[field.code] = "";
        }
      }
      return next;
    });
    setSelectedPresetId("");
  };

  const savePreset = async () => {
    if (!preview || !presetName.trim() || !presetCode) return;
    setBusy("save");
    setError(null);
    const body = {
      mappingCode: presetCode,
      mappingName: presetName.trim(),
      targetEntity: "Students",
      startRowIndex: (preview.headerRowIndex ?? 0) + 2,
      departmentId: departmentId ?? null,
      mappings: mappedFields.map((field) => {
        const column = mapping[field.code];
        const header = preview.headers.find((item) => item.column === column);
        return {
          systemFieldCode: field.code,
          excelColumnName: header?.title ?? column,
          excelColumnIndex: columnLetterToIndex(column),
          isRequired: field.required,
          defaultValue: null,
          transformRule: "TRIM",
        };
      }),
    };

    try {
      const saved = await apiRequestRaw<MappingPreset>(PRESETS_ENDPOINT, { method: "POST", body });
      setPresets((current) => [...current.filter((item) => item.id !== saved.id), saved]);
      setSelectedPresetId(saved.id);
      setShowSavePreset(false);
      setPresetName("");
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto max-w-[1300px] space-y-5 animate-in fade-in duration-200 font-sans pb-12">
      <PageHeader
        icon={FileSpreadsheet}
        title="Smart Excel Import Studio"
        subtitle="Tải dữ liệu, ghép cột theo biểu mẫu của khoa và kiểm tra trước khi nhập."
        badge="IMPORT STUDIO"
        badgeColor="border-blue-200 bg-blue-50 text-[#026aa7]"
      />

      <nav aria-label="Các bước nhập dữ liệu" className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((item) => {
          const complete = item.number < step;
          const active = item.number === step;
          return (
            <button
              key={item.number}
              type="button"
              onClick={() => item.number < step && setStep(item.number)}
              disabled={item.number > step || item.number === step}
              aria-current={active ? "step" : undefined}
              className={`flex min-h-16 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-default ${
                active
                  ? "border-[#026aa7] bg-blue-50 text-[#025a8e]"
                  : complete
                    ? "border-[#7bc043]/50 bg-[#7bc043]/10 text-slate-800"
                    : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                complete ? "bg-[#7bc043] text-white" : active ? "bg-[#026aa7] text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {complete ? <Check aria-hidden="true" className="h-4 w-4" /> : item.number}
              </span>
              <span>
                <span className="block text-xs font-semibold uppercase tracking-wide opacity-75">Bước {item.number}</span>
                <span className="font-semibold">{item.title}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {step === 1 && (
        <section className="space-y-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tải tệp Excel</h2>
            <p className="mt-1 text-sm text-slate-600">Hỗ trợ .xlsx và .xls, dung lượng tối đa 10 MB.</p>
          </div>
          <div
            onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => { event.preventDefault(); setIsDragging(false); loadFile(event.dataTransfer.files[0]); }}
            className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors sm:p-10 ${
              isDragging ? "border-[#026aa7] bg-blue-50/40" : "border-slate-300 bg-slate-50/60"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="sr-only"
              aria-label="Chọn tệp Excel"
              onChange={(event) => loadFile(event.target.files?.[0])}
            />
            <UploadCloud aria-hidden="true" className="mx-auto h-9 w-9 text-[#026aa7]" />
            <h3 className="mt-3 font-semibold text-slate-900">Kéo thả tệp Excel vào đây</h3>
            <p className="mt-1 text-sm text-slate-600">Hoặc chọn tệp từ thiết bị của bạn.</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
            >
              <FileUp aria-hidden="true" className="h-4 w-4" />
              Chọn tệp
            </button>
            {file && (
              <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <FileSpreadsheet aria-hidden="true" className="h-4 w-4 text-[#7bc043]" />
                {file.name}
              </p>
            )}
          </div>

          {busy === "preview" && (
            <p role="status" className="flex items-center gap-2 text-sm text-slate-600">
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
              Đang phân tích workbook...
            </p>
          )}

          {preview && (
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block text-sm font-semibold text-slate-800">
                Sheet cần nhập
                <select
                  aria-label="Chọn sheet"
                  value={selectedSheet}
                  onChange={(event) => changeSheet(event.target.value)}
                  disabled={busy !== null}
                  className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                >
                  {(preview.sheetNames ?? [preview.selectedSheetName ?? "Sheet1"]).map((sheetName) => (
                    <option key={sheetName} value={sheetName}>{sheetName}</option>
                  ))}
                </select>
              </label>
              <p className="text-sm text-slate-600">
                Tìm thấy <strong className="text-slate-900">{preview.headers.length}</strong> cột và{" "}
                <strong className="text-slate-900">{preview.dataRowCount.toLocaleString("vi-VN")}</strong> dòng dữ liệu.
              </p>
            </div>
          )}
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={!preview || busy !== null}
              onClick={() => setStep(2)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#026aa7] px-4 font-semibold text-white hover:bg-[#025a8e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Tiếp tục: ghép cột
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {step === 2 && preview && (
        <section className="space-y-5 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ghép cột Excel với trường hệ thống</h2>
              <p className="mt-1 text-sm text-slate-600">Gợi ý tự động dựa trên tên cột; bạn có thể thay đổi bất kỳ ánh xạ nào.</p>
            </div>
            <label className="block text-sm font-semibold text-slate-800 sm:min-w-64">
              Cấu hình mẫu đã lưu
              <select
                aria-label="Chọn cấu hình mẫu"
                value={selectedPresetId}
                onChange={(event) => loadPreset(event.target.value)}
                disabled={busy === "presets" || presets.length === 0}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
              >
                <option value="">{busy === "presets" ? "Đang tải cấu hình..." : "Chọn cấu hình mẫu"}</option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>{preset.mappingName}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {FIELDS.map((field) => {
              const selectedColumn = mapping[field.code];
              const alreadyUsedColumns = new Set(
                Object.entries(mapping)
                  .filter(([code, column]) => code !== field.code && column)
                  .map(([, column]) => column),
              );
              return (
                <label key={field.code} className="block rounded-lg border border-slate-200 p-4 text-sm font-semibold text-slate-800">
                  <span className="flex items-center justify-between gap-2">
                    {field.label}
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      field.required ? "bg-rose-50 text-rose-800" : "bg-slate-100 text-slate-600"
                    }`}>
                      {field.required ? "Bắt buộc" : "Tùy chọn"}
                    </span>
                  </span>
                  <select
                    aria-label={`Ghép cột ${field.label}`}
                    value={selectedColumn}
                    onChange={(event) => changeMapping(field.code, event.target.value)}
                    className="mt-3 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                  >
                    <option value="">Không ghép cột</option>
                    {preview.headers.map((header) => (
                      <option key={header.column} value={header.column} disabled={alreadyUsedColumns.has(header.column)}>
                        {header.column} · {header.title}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>

          {showSavePreset && (
            <div className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <label className="block text-sm font-semibold text-slate-800">
                Tên cấu hình
                <input
                  aria-label="Tên cấu hình mẫu"
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                  maxLength={200}
                  className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-800">
                Mã cấu hình
                <input
                  aria-label="Mã cấu hình mẫu"
                  value={presetCode}
                  readOnly
                  className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 font-mono font-normal text-slate-700"
                />
              </label>
              <button
                type="button"
                onClick={() => void savePreset()}
                disabled={!presetName.trim() || !presetCode || !mappedFields.length || busy !== null}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#026aa7] px-4 font-semibold text-white hover:bg-[#025a8e] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "save" ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}
                Lưu cấu hình
              </button>
            </div>
          )}

          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setShowSavePreset((current) => !current)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              {showSavePreset ? "Đóng lưu cấu hình mẫu" : "Lưu cấu hình mẫu"}
            </button>
            <div className="flex gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Quay lại
              </button>
              <button
                type="button"
                disabled={!mappingIsValid}
                onClick={() => setStep(3)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#026aa7] px-4 font-semibold text-white hover:bg-[#025a8e] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Xem trước dữ liệu
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>
          {!mappingIsValid && (
            <p className="flex items-center gap-2 text-sm text-amber-800">
              <AlertCircle aria-hidden="true" className="h-4 w-4" />
              Hãy ghép đủ Mã số sinh viên và Họ và tên để tiếp tục.
            </p>
          )}
        </section>
      )}

      {step === 3 && preview && (
        <section className="space-y-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Xem trước dữ liệu đã ghép</h2>
              <p className="mt-1 text-sm text-slate-600">
                {file?.name} · {selectedSheet} · Tối đa 5 dòng mẫu trên tổng {preview.dataRowCount.toLocaleString("vi-VN")} dòng.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {mappedFields.map((field) => (
                <span
                  key={field.code}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    field.required ? "bg-rose-50 text-rose-800" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {field.label} · {field.required ? "Bắt buộc" : "Tùy chọn"}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th scope="col" className="whitespace-nowrap px-4 py-3">Dòng</th>
                  {mappedFields.map((field) => {
                    const header = preview.headers.find((item) => item.column === mapping[field.code]);
                    return (
                      <th scope="col" key={field.code} className="min-w-40 px-4 py-3">
                        <span className="flex flex-col gap-1.5">
                          <span>{field.label}</span>
                          <span className="normal-case font-normal text-slate-500">
                            {mapping[field.code]} · {header?.title}
                          </span>
                          <span className={`w-fit rounded-full px-2 py-0.5 normal-case ${
                            field.required ? "bg-rose-50 text-rose-800" : "bg-slate-100 text-slate-600"
                          }`}>
                            {field.required ? "Bắt buộc" : "Tùy chọn"}
                          </span>
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.sampleRows.length === 0 ? (
                  <tr>
                    <td colSpan={mappedFields.length + 1} className="px-4 py-8 text-center text-slate-500">
                      Sheet này chưa có dòng dữ liệu mẫu.
                    </td>
                  </tr>
                ) : preview.sampleRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <th scope="row" className="whitespace-nowrap px-4 py-3 font-medium text-slate-500">
                      {(preview.headerRowIndex ?? 0) + rowIndex + 2}
                    </th>
                    {mappedFields.map((field) => {
                      const columnIndex = columnLetterToIndex(mapping[field.code]);
                      return (
                        <td key={field.code} className="max-w-64 px-4 py-3 text-slate-700">
                          {row[columnIndex] || "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-[#7bc043]/40 bg-[#7bc043]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm text-slate-800">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#4f8d20]" />
              Cấu hình đã sẵn sàng. Bước xác thực và nạp dữ liệu sẽ được bổ sung trong Sprint 5.3.
            </p>
            <button
              type="button"
              disabled
              title="Execute Commit sẽ được triển khai trong Sprint 5.3."
              className="inline-flex min-h-11 shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-[#026aa7] px-4 font-semibold text-white opacity-50"
            >
              <FileUp aria-hidden="true" className="h-4 w-4" />
              Nạp dữ liệu (Sprint 5.3)
            </button>
          </div>
          <div className="flex justify-start border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Quay lại chỉnh mapping
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
