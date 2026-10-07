import { useState, useEffect } from "react";
import { CalendarPlus, X, Save, PencilLine } from "lucide-react";
import { getApiErrorMessage } from "../../../../lib/apiClient";
import { schoolAcademicTermsService, type SchoolAcademicTermDto } from "../../../../services/schoolAcademicTerms.service";

export interface SemesterModalFormValues {
  name: string;
  term: string;
  academicYear: string;
  startDate: string; // yyyy-MM-dd for <input type="date">
  endDate: string;
  targetStudents: number;
  totalWeeks: number;
  /** Tuần tuyệt đối của học kỳ nơi Tuần thực tập 1 bắt đầu (vd 14 → TT 1..6 = HK 14..19). */
  internshipStartWeek: number;
  description?: string;
}

export const CreateSemesterModal = ({
  isOpen,
  onClose,
  onShowToast,
  onCreate,
  onUpdate,
  editing,
}: {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  onCreate?: (sem: SemesterModalFormValues) => void | Promise<void>;
  onUpdate?: (id: string, sem: SemesterModalFormValues) => void | boolean | Promise<void | boolean>;
  /** When set, the modal edits this semester instead of creating a new one. */
  editing?: {
    id: string;
    name: string;
    term: string;
    academicYear: string;
    /** Display date (dd/MM/yyyy) or "—" — parsed to yyyy-MM-dd. */
    startDate: string;
    endDate: string;
    totalWeeks?: number;
    internshipStartWeek?: number;
    targetStudents?: number;
    description?: string;
  } | null;
}) => {
  const [semesterName, setSemesterName] = useState("");
  const [term, setTerm] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetStudents, setTargetStudents] = useState("");
  const [internshipEndWeek, setInternshipEndWeek] = useState("");
  // Mặc định 1 = kỳ nhập vào CHÍNH LÀ giai đoạn thực tập (tuần thực tập 1 = ngày bắt đầu kỳ).
  // Chỉ tăng lên (vd 14) khi StartDate là đầu CẢ học kỳ của trường chứ không riêng đợt thực tập.
  const [internshipStartWeek, setInternshipStartWeek] = useState("");
  const [academicTerms, setAcademicTerms] = useState<SchoolAcademicTermDto[]>([]);
  /** Đã tự sửa ISW về 1 khi mở modal sửa kỳ ngắn có ISW sai → hiển thị ghi chú giải thích. */
  const [autoFixedIsw, setAutoFixedIsw] = useState(false);
  const isEditing = Boolean(editing?.id);

  // Preload form when opening in edit mode; reset to defaults in create mode.
  useEffect(() => {
    if (!isOpen) return;
    if (editing?.id) {
      setSemesterName(editing.name);
      setTerm(editing.term || "");
      setAcademicYear(editing.academicYear || "");
      setStartDate(parseToInputDate(editing.startDate));
      setEndDate(parseToInputDate(editing.endDate));
      setTargetStudents(
        editing.targetStudents == null ? "" : String(editing.targetStudents),
      );
      const editingStartWeek = Math.min(52, Math.max(1, editing.internshipStartWeek ?? 1));
      const editingWeeks = Math.min(52, Math.max(1, editing.totalWeeks ?? 6));
      setInternshipStartWeek(
        editing.internshipStartWeek == null ? "" : String(editingStartWeek),
      );
      setInternshipEndWeek(
        editing.totalWeeks == null || editing.internshipStartWeek == null
          ? ""
          : String(editingStartWeek + editingWeeks - 1),
      );
      setAutoFixedIsw(false);

      // Kỳ ngắn (≤ 3 tháng) gần như chắc chắn là đợt thực tập thuần túy: StartDate =
      // ngày bắt đầu thực tập → ISW phải = 1. Nếu lưu ISW > 1 gây conflict (giai đoạn
      // thực tập vượt EndDate — lỗi 400 khi lưu), tự sửa về 1 ngay khi mở modal.
      const preStart = parseToInputDate(editing.startDate);
      const preEnd = parseToInputDate(editing.endDate);
      if (preStart && preEnd && editingStartWeek > 1) {
        const durationDays = (new Date(preEnd).getTime() - new Date(preStart).getTime()) / 86400000;
        const periodEndDays = (editingStartWeek - 1) * 7 + editingWeeks * 7 - 1;
        if (durationDays > 0 && durationDays <= 92 && periodEndDays > durationDays) {
          setInternshipStartWeek("1");
          setInternshipEndWeek(String(editingWeeks));
          setAutoFixedIsw(true);
        }
      }
    } else {
      setSemesterName("");
      setTerm("");
      setAcademicYear("");
      setStartDate("");
      setEndDate("");
      setTargetStudents("");
      setInternshipEndWeek("");
      setInternshipStartWeek("");
      setAutoFixedIsw(false);
    }
  }, [isOpen, editing]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void schoolAcademicTermsService
      .getAll()
      .then((terms) => {
        if (cancelled) return;
        setAcademicTerms(terms);
        if (!editing?.id) {
          const firstTerm = terms[0];
          if (firstTerm) {
            setAcademicYear((current) => current || firstTerm.academicYear);
            setTerm((current) => current || firstTerm.term);
          }
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAcademicTerms([]);
          onShowToast(getApiErrorMessage(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, editing?.id, onShowToast]);

  const configuredTerm = academicTerms.find(
    (item) => item.academicYear === academicYear && item.term === term,
  );
  const availableWeeks = configuredTerm?.totalWeeks ?? 0;
  const selectedStartWeek = parseInt(internshipStartWeek) || 0;
  const selectedEndWeek = parseInt(internshipEndWeek) || 0;
  const selectedDuration = selectedEndWeek - selectedStartWeek + 1;
  const weekRangeInvalid = !configuredTerm
    || selectedStartWeek < 1
    || selectedEndWeek < selectedStartWeek
    || selectedEndWeek > availableWeeks
    || selectedDuration > 52;

  useEffect(() => {
    if (!configuredTerm) return;
    setStartDate(configuredTerm.startDate.slice(0, 10));
    setEndDate(configuredTerm.endDate.slice(0, 10));
  }, [configuredTerm]);

  if (!isOpen) return null;

  // ── Preview ngày thực tập thực tế theo cấu hình ──
  // Tuần thực tập 1 bắt đầu = StartDate + (internshipStartWeek - 1) tuần.
  // Nếu toàn bộ giai đoạn thực tập vượt EndDate → cấu hình mâu thuẫn,
  // gần như chắc chắn do đặt InternshipStartWeek > 1 trong khi StartDate là ngày đầu thực tập.
  const parsedStart = startDate ? new Date(startDate) : null;
  const parsedEnd = endDate ? new Date(endDate) : null;
  const effectiveStartWeek = Math.min(52, Math.max(1, selectedStartWeek));
  const effectiveTotalWeeks = Math.min(52, Math.max(1, selectedDuration));
  const internshipPeriodStart = parsedStart && selectedStartWeek > 0
    ? new Date(parsedStart.getTime() + (effectiveStartWeek - 1) * 7 * 86400000)
    : null;
  const internshipPeriodEnd = internshipPeriodStart && selectedDuration > 0
    ? new Date(internshipPeriodStart.getTime() + effectiveTotalWeeks * 7 * 86400000 - 86400000)
    : null;
  const internshipEndExceedsSemesterEnd = weekRangeInvalid;
  const fmtDmy = (d: Date) => d.toLocaleDateString("vi-VN");
  const displayStartDate = parsedStart ? fmtDmy(parsedStart) : "?";
  const displaySemesterEnd = parsedEnd ? fmtDmy(parsedEnd) : "?";
  const displayInternshipEnd = internshipPeriodEnd ? fmtDmy(internshipPeriodEnd) : "?";
  // Kỳ ngắn ≤ 3 tháng (≈ 92 ngày): StartDate hầu như luôn là NGÀY BẮT ĐẦU THỰC TẬP → ISW nên = 1.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (weekRangeInvalid) {
      onShowToast(configuredTerm
        ? `Khoảng tuần phải nằm trong Tuần 1 đến Tuần ${availableWeeks}.`
        : "Superadmin chưa cấu hình thời gian cho học kỳ này.");
      return;
    }
    const values: SemesterModalFormValues = {
      name: semesterName,
      term,
      academicYear,
      startDate,
      endDate,
      targetStudents: parseInt(targetStudents) || 0,
      totalWeeks: Math.min(52, Math.max(1, selectedDuration)),
      internshipStartWeek: Math.min(52, Math.max(1, parseInt(internshipStartWeek) || 1)),
      description: editing?.description,
    };
    if (isEditing && editing && onUpdate) {
      try {
        const updated = await onUpdate(editing.id, values);
        if (updated === false) return;
      } catch (error) {
        onShowToast(getApiErrorMessage(error));
        return;
      }
    } else if (onCreate) {
      try {
        await onCreate(values);
      } catch (error) {
        onShowToast(getApiErrorMessage(error));
        return;
      }
      onShowToast(`Đã tạo thành công đợt thực tập: "${semesterName}"!`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-lg border border-slate-200 shadow-md max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-md border ${isEditing ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-[#026aa7]/5 text-[#026aa7] border-[#026aa7]/15"}`}>
              {isEditing ? <PencilLine className="w-5 h-5" /> : <CalendarPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isEditing ? "Chỉnh sửa Kỳ thực tập" : "Tạo mới Kỳ thực tập"}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isEditing
                  ? `Cập nhật thông tin đợt: ${editing?.name}`
                  : "Thiết lập thông tin học kỳ và mốc thời gian thực tập"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Tên đợt thực tập *
            </label>
            <input
              type="text"
              value={semesterName}
              onChange={(e) => setSemesterName(e.target.value)}
              placeholder="Nhập tên kỳ thực tập"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Học kỳ *
              </label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
              >
                <option value="">Chọn học kỳ</option>
                {[...new Set([
                  ...academicTerms
                    .filter((item) => item.academicYear === academicYear)
                    .map((item) => item.term),
                  ...(isEditing && editing?.academicYear === academicYear && editing.term
                    ? [editing.term]
                    : []),
                ])].map((availableTerm) => (
                  <option key={availableTerm} value={availableTerm}>{availableTerm}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Niên khóa *
              </label>
              <select
                value={academicYear}
                onChange={(e) => {
                  setAcademicYear(e.target.value);
                  const matchingTerm = academicTerms.find((item) => item.academicYear === e.target.value);
                  setTerm(matchingTerm?.term ?? "");
                }}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
              >
                <option value="">Chọn niên khóa</option>
                {[...new Set([
                  ...academicTerms.map((item) => item.academicYear),
                  ...(isEditing && editing?.academicYear ? [editing.academicYear] : []),
                ])].map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Ngày bắt đầu *
              </label>
              <input
                type="date"
                value={startDate}
                readOnly
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!startDate}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Ngày kết thúc *
              </label>
              <input
                type="date"
                value={endDate}
                readOnly
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!endDate}
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Chỉ tiêu sinh viên dự kiến
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={targetStudents}
              onChange={(e) => setTargetStudents(e.target.value)}
              placeholder="Chưa xác định"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tuần HK bắt đầu thực tập *
              </label>
              <input
                type="number"
                min={1}
                max={availableWeeks || 52}
                value={internshipStartWeek}
                onChange={(e) => setInternshipStartWeek(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
              />
              <p className="text-[11px] text-slate-500 mt-1">Khung hiện có: {availableWeeks || "chưa cấu hình"} tuần.</p>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tuần HK kết thúc thực tập *
              </label>
              <input
                type="number"
                min={selectedStartWeek || 1}
                max={availableWeeks || 52}
                value={internshipEndWeek}
                onChange={(e) => setInternshipEndWeek(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {internshipEndExceedsSemesterEnd
                  ? configuredTerm
                    ? `Khoảng tuần vượt khung Tuần 1–${availableWeeks}.`
                    : "Chưa có khung thời gian do Superadmin cấu hình cho học kỳ này."
                    : `Suy ra ${selectedDuration} tuần · Tuần ${selectedStartWeek}–${selectedEndWeek} / ${availableWeeks}`}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md transition-colors"
            >
              Hủy
            </button>

            <button
              type="submit"
              className={`px-5 py-2 text-white font-bold rounded-md shadow-xs transition-colors flex items-center gap-1.5 ${isEditing ? "bg-amber-600 hover:bg-amber-700" : "bg-[#026aa7] hover:bg-[#025a8e]"}`}
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? "Lưu thay đổi" : "Tạo đợt thực tập"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/** Convert a displayed date or ISO date to the value required by date inputs. */
function parseToInputDate(display: string): string {
  if (!display || display === "—") return "";
  // Already yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(display)) return display;
  // dd/MM/yyyy
  const m = display.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(display);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return "";
}
