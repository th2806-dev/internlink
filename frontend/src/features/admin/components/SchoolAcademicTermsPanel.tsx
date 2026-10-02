import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, CalendarRange, PencilLine, Save, X } from "lucide-react";
import { Panel } from "../../../components/common/Panel";
import { getApiErrorMessage } from "../../../lib/apiClient";
import {
  schoolAcademicTermsService,
  type SchoolAcademicTermDto,
} from "../../../services/schoolAcademicTerms.service";

const EMPTY_FORM = { academicYear: "", term: "Học kỳ I", startDate: "", endDate: "" };

const EMPTY_YEAR_FORM = {
  academicYear: "",
  term1Start: "",
  term1End: "",
  term2Start: "",
  term2End: "",
  summerStart: "",
  summerEnd: "",
};

/** Số tuần suy ra từ khoảng ngày: chia block 7 ngày (cùng logic backend). */
function computeWeeks(start: string, end: string): number {
  if (!start || !end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(ms) || ms < 0) return 0;
  return Math.floor((Math.floor(ms / 86400000) + 1 + 6) / 7);
}

function nextDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

const WEEK_CHIP = "rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200";

export function SchoolAcademicTermsPanel({ onShowToast }: { onShowToast: (message: string) => void }) {
  const [terms, setTerms] = useState<SchoolAcademicTermDto[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [yearForm, setYearForm] = useState(EMPTY_YEAR_FORM);
  const [showYearForm, setShowYearForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingYear, setIsSavingYear] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    try {
      setTerms(await schoolAcademicTermsService.getAll());
      setError("");
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const editTerm = (term: SchoolAcademicTermDto) => {
    setEditingId(term.id);
    setForm({
      academicYear: term.academicYear,
      term: term.term,
      startDate: term.startDate.slice(0, 10),
      endDate: term.endDate.slice(0, 10),
    });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const saved = editingId
        ? await schoolAcademicTermsService.update(editingId, form)
        : await schoolAcademicTermsService.create(form);
      setTerms((current) => [saved, ...current.filter((term) => term.id !== saved.id)]);
      resetForm();
      onShowToast(editingId ? "Đã cập nhật khung học kỳ." : "Đã tạo khung học kỳ.");
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const saveAcademicYear = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingYear(true);
    setError("");
    try {
      const result = await schoolAcademicTermsService.createAcademicYear({
        academicYear: yearForm.academicYear.trim(),
        term1Start: yearForm.term1Start,
        term1End: yearForm.term1End,
        term2Start: yearForm.term2Start,
        term2End: yearForm.term2End,
        summerStart: yearForm.summerStart,
        summerEnd: yearForm.summerEnd,
      });
      setTerms((current) => [...result.terms.slice().reverse(), ...current]);
      setYearForm(EMPTY_YEAR_FORM);
      setShowYearForm(false);
      onShowToast(
        `Đã tạo năm học ${result.academicYear} với ${result.terms.length} học kỳ: ` +
          result.terms.map((t) => `${t.term} (${t.totalWeeks} tuần)`).join(", "),
      );
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setIsSavingYear(false);
    }
  };

  // Preview số tuần suy ra realtime trong form tạo nhanh năm học.
  const yearPreview = useMemo(
    () => ({
      term1: computeWeeks(yearForm.term1Start, yearForm.term1End),
      term2: computeWeeks(yearForm.term2Start, yearForm.term2End),
      summer: computeWeeks(yearForm.summerStart, yearForm.summerEnd),
    }),
    [yearForm],
  );
  const yearOrderInvalid =
    (yearForm.term1Start !== "" && yearForm.term1End !== "" && yearForm.term1End < yearForm.term1Start) ||
    (yearForm.term2Start !== "" && yearForm.term2End !== "" && yearForm.term2End < yearForm.term2Start) ||
    (yearForm.summerStart !== "" && yearForm.summerEnd !== "" && yearForm.summerEnd < yearForm.summerStart) ||
    (yearForm.term1End !== "" && yearForm.term2Start !== "" && yearForm.term2Start <= yearForm.term1End) ||
    (yearForm.term2End !== "" && yearForm.summerStart !== "" && yearForm.summerStart <= yearForm.term2End);
  const yearFilled =
    yearForm.academicYear.trim() !== "" &&
    yearForm.term1Start && yearForm.term1End &&
    yearForm.term2Start && yearForm.term2End &&
    yearForm.summerStart && yearForm.summerEnd;

  const inputCls = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
  const dateInput = (
    key: keyof typeof yearForm,
    label: string,
    minKey?: keyof typeof yearForm,
    minExclusive = false,
  ) => (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-slate-500">{label}</span>
      <input
        type="date"
        required
        aria-label={label}
        value={yearForm[key]}
        min={minKey && yearForm[minKey]
          ? (minExclusive ? nextDate(yearForm[minKey]) : yearForm[minKey])
          : undefined}
        onChange={(e) => setYearForm({ ...yearForm, [key]: e.target.value })}
        className={inputCls}
      />
    </label>
  );

  return (
    <Panel className="space-y-4 border-emerald-200 bg-emerald-50/30">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <CalendarPlus className="h-4 w-4 text-emerald-700" /> Cấu hình thời gian học kỳ
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Khung ngày và số tuần chuẩn áp dụng toàn trường. Admin khoa chỉ được chọn tuần trong khung này.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowYearForm((v) => !v)}
          className="il-btn il-btn-secondary flex items-center gap-1.5 text-xs"
        >
          <CalendarRange className="h-3.5 w-3.5" />
          {showYearForm ? "Thu gọn" : "Tạo nhanh cả năm học (3 học kỳ)"}
        </button>
      </div>

      {showYearForm && (
        <form onSubmit={saveAcademicYear} className="rounded-md border border-emerald-300 bg-white p-3 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-500">Niên khóa *</span>
              <input
                required
                placeholder="2026 - 2027"
                aria-label="Niên khóa"
                value={yearForm.academicYear}
                onChange={(e) => setYearForm({ ...yearForm, academicYear: e.target.value })}
                className={`${inputCls} w-40`}
              />
            </label>
            {dateInput("term1Start", "HK I bắt đầu")}
            {dateInput("term1End", "HK I kết thúc", "term1Start")}
            {dateInput("term2Start", "HK II bắt đầu", "term1End", true)}
            {dateInput("term2End", "HK II kết thúc", "term2Start")}
            {dateInput("summerStart", "Hè bắt đầu", "term2End", true)}
            {dateInput("summerEnd", "Hè kết thúc", "summerStart")}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-bold text-slate-500">Số tuần suy ra:</span>
            <span className={WEEK_CHIP}>HK I: {yearPreview.term1 || "—"} tuần</span>
            <span className={WEEK_CHIP}>HK II: {yearPreview.term2 || "—"} tuần</span>
            <span className={WEEK_CHIP}>Hè: {yearPreview.summer || "—"} tuần</span>
            <span className="font-bold text-slate-500">
              Tổng: {yearPreview.term1 + yearPreview.term2 + yearPreview.summer} tuần
            </span>
          </div>

          {yearOrderInvalid && (
            <p role="alert" className="text-xs font-medium text-rose-700">
              Thứ tự ngày không hợp lệ: HK II phải bắt đầu sau khi HK I kết thúc, Hè phải bắt đầu sau khi HK II kết thúc.
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              disabled={isSavingYear || yearOrderInvalid || !yearFilled}
              className="il-btn il-btn-primary flex items-center gap-1.5 text-xs"
            >
              <Save className="h-3.5 w-3.5" /> Tạo cả 3 học kỳ
            </button>
            <span className="text-[11px] text-slate-500">
              Tạo 1 lần duy nhất (Học kỳ I, Học kỳ II, Học kỳ Hè). Không được chồng lấn giữa các học kỳ.
            </span>
          </div>
        </form>
      )}

      <form onSubmit={save} className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <input
          aria-label="Niên khóa"
          required
          placeholder="2026 - 2027"
          value={form.academicYear}
          onChange={(event) => setForm({ ...form, academicYear: event.target.value })}
          className={inputCls}
        />
        <select
          aria-label="Học kỳ"
          value={form.term}
          onChange={(event) => setForm({ ...form, term: event.target.value })}
          className={inputCls}
        >
          <option>Học kỳ I</option>
          <option>Học kỳ II</option>
          <option>Học kỳ Hè</option>
        </select>
        <input
          aria-label="Ngày bắt đầu học kỳ"
          type="date"
          required
          value={form.startDate}
          onChange={(event) => setForm({ ...form, startDate: event.target.value })}
          className={inputCls}
        />
        <input
          aria-label="Ngày kết thúc học kỳ"
          type="date"
          required
          min={form.startDate || undefined}
          value={form.endDate}
          onChange={(event) => setForm({ ...form, endDate: event.target.value })}
          className={inputCls}
        />
        <div className="flex gap-2">
          <button disabled={isSaving} className="il-btn il-btn-primary flex flex-1 items-center justify-center gap-1.5 text-xs">
            <Save className="h-3.5 w-3.5" /> {editingId ? "Lưu" : "Tạo khung"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} title="Hủy chỉnh sửa" className="il-btn il-btn-secondary px-2">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {error && <p role="alert" className="text-xs font-medium text-rose-700">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-xs">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-2 py-2">Niên khóa</th>
              <th className="px-2 py-2">Học kỳ</th>
              <th className="px-2 py-2">Thời gian</th>
              <th className="px-2 py-2 text-center">Số tuần</th>
              <th className="px-2 py-2 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {terms.map((term) => (
              <tr key={term.id}>
                <td className="px-2 py-2 font-semibold text-slate-800">{term.academicYear}</td>
                <td className="px-2 py-2">{term.term}</td>
                <td className="px-2 py-2">{new Date(term.startDate).toLocaleDateString("vi-VN")} – {new Date(term.endDate).toLocaleDateString("vi-VN")}</td>
                <td className="px-2 py-2 text-center">{term.totalWeeks}</td>
                <td className="px-2 py-2 text-right">
                  <button type="button" onClick={() => editTerm(term)} aria-label={`Sửa ${term.term} ${term.academicYear}`} title="Sửa khung học kỳ" className="rounded p-1.5 text-slate-500 hover:bg-white hover:text-emerald-700">
                    <PencilLine className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {terms.length === 0 && <tr><td colSpan={5} className="px-2 py-5 text-center text-slate-500">Chưa có khung học kỳ.</td></tr>}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
