import { useState } from "react";
import { CalendarPlus, X, Save } from "lucide-react";
export const CreateSemesterModal = ({ isOpen, onClose, onShowToast, onCreate }: {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  onCreate?: (sem: {
    name: string;
    term: string;
    academicYear: string;
    startDate: string;
    endDate: string;
    targetStudents: number;
    totalWeeks: number;
  }) => void;
}) => {
  const [semesterName, setSemesterName] = useState(
    "Thực tập Tốt nghiệp K21 (2026 - 2027)",
  );
  const [term, setTerm] = useState("Học kỳ I");
  const [academicYear, setAcademicYear] = useState("2026 - 2027");
  const [startDate, setStartDate] = useState("2026-09-01");
  const [endDate, setEndDate] = useState("2026-12-15");
  const [targetStudents, setTargetStudents] = useState("1350");
  const [totalWeeks, setTotalWeeks] = useState("6");
  if (!isOpen) return null;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onCreate) {
      onCreate({
        name: semesterName,
        term,
        academicYear,
        startDate,
        endDate,
        targetStudents: parseInt(targetStudents) || 0,
        totalWeeks: Math.min(52, Math.max(1, parseInt(totalWeeks) || 6)),
      });
    }
    onShowToast(
      `Đã tạo thành công đợt thực tập: "${semesterName}"!`,
    );
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-lg border border-slate-200 shadow-md max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-md border border-blue-100">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Tạo mới Kỳ thực tập
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Thiết lập thông tin học kỳ và mốc thời gian thực tập
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
            <p className="text-[11px] text-slate-500 mt-1">Cấu hình theo quy định của từng kỳ.</p>
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Tạo đợt thực tập</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
