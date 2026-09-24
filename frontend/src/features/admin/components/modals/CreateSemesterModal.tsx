import { useState, useEffect } from "react";
import { CalendarPlus, X, Save, PencilLine } from "lucide-react";

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
  onCreate?: (sem: SemesterModalFormValues) => void;
  onUpdate?: (id: string, sem: SemesterModalFormValues) => void;
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
    description?: string;
  } | null;
}) => {
  const [semesterName, setSemesterName] = useState("Thực tập Tốt nghiệp K21 (2026 - 2027)");
  const [term, setTerm] = useState("Học kỳ I");
  const [academicYear, setAcademicYear] = useState("2026 - 2027");
  const [startDate, setStartDate] = useState("2026-09-01");
  const [endDate, setEndDate] = useState("2026-12-15");
  const [targetStudents, setTargetStudents] = useState("1350");
  const [totalWeeks, setTotalWeeks] = useState("6");
  const [internshipStartWeek, setInternshipStartWeek] = useState("14");
  const isEditing = Boolean(editing?.id);

  // Preload form when opening in edit mode; reset to defaults in create mode.
  useEffect(() => {
    if (!isOpen) return;
    if (editing?.id) {
      setSemesterName(editing.name);
      setTerm(editing.term || "Học kỳ I");
      setAcademicYear(editing.academicYear || "");
      setStartDate(parseToInputDate(editing.startDate));
      setEndDate(parseToInputDate(editing.endDate));
      setTotalWeeks(String(editing.totalWeeks ?? 6));
      setInternshipStartWeek(String(editing.internshipStartWeek ?? 1));
    } else {
      setSemesterName("Thực tập Tốt nghiệp K21 (2026 - 2027)");
      setTerm("Học kỳ I");
      setAcademicYear("2026 - 2027");
      setStartDate("2026-09-01");
      setEndDate("2026-12-15");
      setTotalWeeks("6");
      setInternshipStartWeek("14");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editing?.id, editing?.name, editing?.startDate, editing?.endDate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const values: SemesterModalFormValues = {
      name: semesterName,
      term,
      academicYear,
      startDate,
      endDate,
      targetStudents: parseInt(targetStudents) || 0,
      totalWeeks: Math.min(52, Math.max(1, parseInt(totalWeeks) || 6)),
      internshipStartWeek: Math.min(52, Math.max(1, parseInt(internshipStartWeek) || 1)),
      description: editing?.description,
    };
    if (isEditing && editing && onUpdate) {
      onUpdate(editing.id, values);
    } else if (onCreate) {
      onCreate(values);
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
            <div className={`p-2 rounded-md border ${isEditing ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-blue-50 text-blue-600 border-blue-100"}`}>
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
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500"
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="Học kỳ I">Học kỳ I</option>
                <option value="Học kỳ II">Học kỳ II</option>
                <option value="Học kỳ Hè">Học kỳ Hè</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Niên khóa *
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              />
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
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Ngày kết thúc *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          {!isEditing && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Chỉ tiêu Sinh viên dự kiến
              </label>
              <input
                type="number"
                value={targetStudents}
                onChange={(e) => setTargetStudents(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Số tuần thực tập *
              </label>
              <input
                type="number"
                min={1}
                max={52}
                value={totalWeeks}
                onChange={(e) => setTotalWeeks(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Theo quy định của kỳ.</p>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tuần HK bắt đầu thực tập *
              </label>
              <input
                type="number"
                min={1}
                max={52}
                value={internshipStartWeek}
                onChange={(e) => setInternshipStartWeek(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {Math.min(52, Math.max(1, parseInt(internshipStartWeek) || 1)) + Math.min(52, Math.max(1, parseInt(totalWeeks) || 6)) - 1 > 52
                  ? "Vượt 52 tuần học kỳ — kiểm tra lại."
                  : `Thực tập 1..${Math.min(52, Math.max(1, parseInt(totalWeeks) || 6))} = HK tuần ${Math.min(52, Math.max(1, parseInt(internshipStartWeek) || 1))}..${Math.min(52, Math.max(1, parseInt(internshipStartWeek) || 1)) + Math.min(52, Math.max(1, parseInt(totalWeeks) || 6)) - 1}`}
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
              className={`px-5 py-2 text-white font-bold rounded-md shadow-xs transition-colors flex items-center gap-1.5 ${isEditing ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"}`}
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

/** "01/09/2026" (vi-VN display) or ISO → "2026-09-01" for <input type="date">. */
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
