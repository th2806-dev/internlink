import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Save,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { lecturerExportService } from "../../../services/lecturerExport.service";
import { lecturerInternshipsService } from "../../../services/lecturerInternships.service";
import { attendanceService } from "../../../services/attendance.service";
import { toApiSemesterId, useSemester } from "../../../contexts/SemesterContext";
import type { AttendanceSessionDto, AttendanceSessionStatus, LecturerStudentListItemDto } from "../../../types/api";

type ExportKind = "grades" | "report" | "schedule";

type ExportOption = {
  kind: ExportKind;
  title: string;
  description: string;
  format: string;
  icon: typeof FileSpreadsheet;
  tone: string;
};

const exportOptions: ExportOption[] = [
  { kind: "grades", title: "Bảng điểm nhóm hướng dẫn", description: "Danh sách sinh viên và kết quả đánh giá của nhóm đang phụ trách.", format: "Excel (.xlsx)", icon: FileSpreadsheet, tone: "text-emerald-700 bg-emerald-50 border-emerald-100" },
  { kind: "report", title: "Báo cáo tổng kết công tác", description: "Báo cáo Word tổng hợp công tác thực tập theo kỳ và đơn vị.", format: "Word (.docx)", icon: FileText, tone: "text-blue-700 bg-blue-50 border-blue-100" },
  { kind: "schedule", title: "Lịch hướng dẫn thực tập", description: "Lịch theo mẫu của kỳ hiện hành, sẵn sàng gửi Ban Giám hiệu.", format: "Excel theo mẫu kỳ hiện hành", icon: CalendarDays, tone: "text-amber-700 bg-amber-50 border-amber-100" },
];

function getReviewStatus(student: LecturerStudentListItemDto) {
  if (student.isEvaluationFinalized) return { label: "Đã chốt", className: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  if (student.hasEvaluation) return { label: "Đang rà soát", className: "text-blue-700 bg-blue-50 border-blue-200" };
  return { label: "Chưa có điểm", className: "text-amber-700 bg-amber-50 border-amber-200" };
}

export const SummaryView = ({ onShowToast }: { onShowToast?: (msg: string) => void }) => {
  const { selectedSemester, selectedSemesterId } = useSemester();
  const semesterId = toApiSemesterId(selectedSemesterId);
  const [students, setStudents] = useState<LecturerStudentListItemDto[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notesDraft, setNotesDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const [reportContent, setReportContent] = useState({ results: "", difficulties: "", recommendations: "", conclusion: "" });
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [reportSavedAt, setReportSavedAt] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ExportKind>("grades");
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSessionDto[]>([]);
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ weekNumber: 1, title: "", description: "", meetingDate: "", durationMinutes: 60, location: "", isLecturerOnly: false });
  const [savingScheduleId, setSavingScheduleId] = useState<string | null>(null);

  const schedules = attendanceSessions.map((session) => ({
    ...session,
    dueDate: session.meetingDate,
  }));

  useEffect(() => {
    let cancelled = false;
    const loadStudents = async () => {
      if (!semesterId) {
        setStudents([]);
        return;
      }
      setIsLoading(true);
      try {
        const rows = await lecturerInternshipsService.getStudents(semesterId);
        if (!cancelled) {
          setStudents(rows);
          setSelectedStudentId((current) => current && rows.some((row) => row.studentId === current) ? current : rows[0]?.studentId ?? null);
        }
      } catch (error) {
        if (!cancelled) onShowToast?.(getApiErrorMessage(error));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void loadStudents();
    return () => { cancelled = true; };
  }, [onShowToast, semesterId]);

  const loadAttendanceSessions = async () => {
    if (!semesterId) {
      setAttendanceSessions([]);
      return;
    }
    try {
      setAttendanceSessions(await attendanceService.getLecturerSessions(semesterId));
    } catch (error) {
      onShowToast?.(getApiErrorMessage(error));
    }
  };

  useEffect(() => {
    void loadAttendanceSessions();
  }, [onShowToast, semesterId]);

  useEffect(() => {
    let cancelled = false;
    if (!semesterId) {
      setReportContent({ results: "", difficulties: "", recommendations: "", conclusion: "" });
      setReportSavedAt(null);
      return;
    }
    void lecturerInternshipsService.getSemesterSummary(semesterId).then((summary) => {
      if (!cancelled) {
        setReportContent({
          results: summary.results ?? "",
          difficulties: summary.difficulties ?? "",
          recommendations: summary.recommendations ?? "",
          conclusion: summary.conclusion ?? "",
        });
        setReportSavedAt(summary.updatedAt ?? null);
      }
    }).catch((error) => {
      if (!cancelled) onShowToast?.(getApiErrorMessage(error));
    });
    return () => { cancelled = true; };
  }, [onShowToast, semesterId]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesQuery = !query || [student.fullName, student.studentCode, student.class, student.companyName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "finalized" && student.isEvaluationFinalized)
        || (statusFilter === "pending" && !student.isEvaluationFinalized);
      return matchesQuery && matchesStatus;
    });
  }, [search, statusFilter, students]);

  const selectedStudent = students.find((student) => student.studentId === selectedStudentId) ?? null;
  useEffect(() => setNotesDraft(selectedStudent?.notes ?? ""), [selectedStudent]);

  const finalizedCount = students.filter((student) => student.isEvaluationFinalized).length;
  const notesCount = students.filter((student) => student.notes?.trim()).length;

  const handleSaveNotes = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    try {
      const notes = notesDraft.trim();
      await lecturerInternshipsService.updateStudentNotes(selectedStudent.internshipId, notes);
      setStudents((current) => current.map((student) => student.studentId === selectedStudent.studentId ? { ...student, notes } : student));
      onShowToast?.("Đã lưu nội dung bổ sung cho sinh viên.");
    } catch (error) {
      onShowToast?.(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveReport = async () => {
    if (!semesterId) {
      onShowToast?.("Vui lòng chọn học kỳ trước khi lưu nội dung báo cáo.");
      return;
    }
    setIsSavingReport(true);
    try {
      const saved = await lecturerInternshipsService.saveSemesterSummary(semesterId, reportContent);
      setReportSavedAt(saved.updatedAt ?? new Date().toISOString());
      onShowToast?.("Đã lưu nội dung tổng hợp của báo cáo.");
    } catch (error) {
      onShowToast?.(getApiErrorMessage(error));
    } finally {
      setIsSavingReport(false);
    }
  };

  const handleExport = async (kind: ExportKind) => {
    if (!semesterId) {
      onShowToast?.("Vui lòng chọn học kỳ trước khi xuất file.");
      return;
    }
    setExporting(kind);
    try {
      if (kind === "grades") await lecturerExportService.downloadInternshipExcel(semesterId);
      else if (kind === "report") await lecturerExportService.downloadSummaryReportWord(semesterId);
      else await lecturerExportService.downloadGuidanceSchedule(semesterId);
      onShowToast?.("Đã tải file thành công.");
    } catch (error) {
      onShowToast?.(getApiErrorMessage(error));
    } finally {
      setExporting(null);
    }
  };

  const createSchedule = async () => {
    if (!semesterId) return;
    if (!scheduleForm.title.trim() || !scheduleForm.meetingDate) {
      onShowToast?.("Vui lòng nhập nội dung và ngày hướng dẫn.");
      return;
    }
    try {
      await attendanceService.createSession({
        semesterId,
        weekNumber: scheduleForm.weekNumber,
        title: scheduleForm.title.trim(),
        description: scheduleForm.description.trim() || undefined,
        meetingDate: new Date(scheduleForm.meetingDate).toISOString(),
        durationMinutes: scheduleForm.durationMinutes,
        location: scheduleForm.location.trim() || undefined,
        isLecturerOnly: scheduleForm.isLecturerOnly,
      });
      setIsAddingSchedule(false);
      await loadAttendanceSessions();
      onShowToast?.("Đã thêm lịch hướng dẫn vào dữ liệu Điểm danh & Buổi gặp.");
    } catch (error) {
      onShowToast?.(getApiErrorMessage(error));
    }
  };

  const openScheduleForm = () => {
    const maxWeek = Math.max(0, ...attendanceSessions.map((session) => session.weekNumber));
    const nextWeek = Array.from({ length: Math.max(selectedSemester?.totalWeeks ?? 6, maxWeek + 1) }, (_, index) => index + 1)
      .find((week) => !attendanceSessions.some((session) => session.weekNumber === week)) ?? maxWeek + 1;
    const defaultDate = new Date();
    defaultDate.setHours(9, 0, 0, 0);
    setScheduleForm({ weekNumber: nextWeek, title: `Buổi gặp hướng dẫn tuần ${nextWeek}`, description: "", meetingDate: `${defaultDate.getFullYear()}-${String(defaultDate.getMonth() + 1).padStart(2, "0")}-${String(defaultDate.getDate()).padStart(2, "0")}T09:00`, durationMinutes: 60, location: "Phòng làm việc bộ môn", isLecturerOnly: false });
    setIsAddingSchedule(true);
  };

  const updateSchedule = async (session: AttendanceSessionDto, patch: { title?: string; description?: string; dueDate?: string; meetingDate?: string; durationMinutes?: number; location?: string; status?: AttendanceSessionStatus }) => {
    setSavingScheduleId(session.id);
    try {
      const { dueDate, ...attendancePatch } = patch;
      await attendanceService.updateSession(session.id, {
        ...attendancePatch,
        meetingDate: dueDate ? new Date(dueDate).toISOString() : attendancePatch.meetingDate,
      });
      await loadAttendanceSessions();
      onShowToast?.(`Đã lưu lịch tuần ${session.weekNumber}.`);
    } catch (error) {
      onShowToast?.(getApiErrorMessage(error));
    } finally {
      setSavingScheduleId(null);
    }
  };

  const deleteSchedule = async (session: AttendanceSessionDto) => {
    if (!window.confirm(`Xóa lịch hướng dẫn tuần ${session.weekNumber}?`)) return;
    try {
      await attendanceService.deleteSession(session.id);
      setAttendanceSessions((current) => current.filter((item) => item.id !== session.id));
      onShowToast?.("Đã xóa lịch hướng dẫn.");
    } catch (error) {
      onShowToast?.(getApiErrorMessage(error));
    }
  };

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto animate-in fade-in duration-200">
      <PageHeader icon={ClipboardList} title="Tổng kết" subtitle="Rà soát, bổ sung nội dung và chuẩn bị hồ sơ cuối kỳ của nhóm sinh viên đang hướng dẫn." badge={selectedSemester?.name || "Chưa chọn học kỳ"} badgeColor="bg-blue-50 text-blue-800 border-blue-200" />

      <nav className="grid grid-cols-1 sm:grid-cols-3 gap-2" aria-label="Các mẫu tổng kết">
        {exportOptions.map((option) => {
          const Icon = option.icon;
          const active = activeModule === option.kind;
          return <button key={option.kind} type="button" onClick={() => setActiveModule(option.kind)} className={`text-left p-3 rounded-md border transition-colors ${active ? "border-blue-300 bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}><span className="flex items-center gap-2"><Icon className="w-4 h-4" /><span className="text-xs font-bold">{option.title}</span></span><span className="block text-[10px] mt-1 ml-6 opacity-75">Chỉnh sửa mẫu {option.format}</span></button>;
        })}
      </nav>

      {activeModule === "schedule" && <div className="rounded-md border border-amber-100 bg-amber-50/50 p-3 text-xs text-amber-900"><label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={scheduleForm.isLecturerOnly} onChange={(event) => setScheduleForm((current) => ({ ...current, isLecturerOnly: event.target.checked }))} /> Công tác riêng của giảng viên</label><p className="mt-1 ml-6 text-[11px] text-amber-800">Dùng cho chuẩn bị hồ sơ, tổng hợp, đánh giá sau thực tập và các nhiệm vụ nội bộ; không tạo dòng điểm danh sinh viên.</p></div>}

      {activeModule === "grades" && <section className="grid grid-cols-2 lg:grid-cols-4 il-panel overflow-hidden">
        <div className="p-4 border-r border-b lg:border-b-0 border-slate-100"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sinh viên</p><p className="text-2xl font-bold text-slate-900 mt-1">{students.length}</p><p className="text-[11px] text-slate-500 mt-1">Trong nhóm hướng dẫn</p></div>
        <div className="p-4 border-r border-b lg:border-b-0 border-slate-100 border-l-4 border-l-emerald-500"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Đã chốt điểm</p><p className="text-2xl font-bold text-slate-900 mt-1">{finalizedCount}</p><p className="text-[11px] text-slate-500 mt-1">Có thể rà soát lần cuối</p></div>
        <div className="p-4 border-r border-slate-100 border-l-4 border-l-amber-500"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Chưa hoàn tất</p><p className="text-2xl font-bold text-slate-900 mt-1">{students.length - finalizedCount}</p><p className="text-[11px] text-slate-500 mt-1">Cần kiểm tra thêm</p></div>
        <div className="p-4 border-l-4 border-l-blue-500"><p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Đã bổ sung</p><p className="text-2xl font-bold text-slate-900 mt-1">{notesCount}</p><p className="text-[11px] text-slate-500 mt-1">Có nội dung ghi chú</p></div>
      </section>}

      {activeModule === "grades" && <Panel padding="none" className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div><div className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-700" /><h2 className="text-sm font-bold text-slate-900">Rà soát hồ sơ sinh viên</h2></div><p className="text-xs text-slate-500 mt-1">Chọn từng sinh viên để kiểm tra điểm và bổ sung nhận xét trước khi xuất hồ sơ.</p></div>
          <div className="flex flex-wrap gap-2"><div className="relative"><Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, MSSV, lớp..." className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-md outline-none focus:border-blue-500 w-52" /></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="px-3 py-2 text-xs border border-slate-200 rounded-md"><option value="all">Tất cả trạng thái</option><option value="finalized">Đã chốt điểm</option><option value="pending">Chưa hoàn tất</option></select></div>
        </div>
        <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <div className="overflow-x-auto lg:border-r border-slate-100">
            {isLoading ? <div className="p-10 text-center text-xs text-slate-500">Đang tải hồ sơ...</div> : filteredStudents.length === 0 ? <div className="p-10 text-center text-xs text-slate-500">Không có sinh viên phù hợp.</div> : <table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3 font-bold">Sinh viên</th><th className="px-4 py-3 font-bold">Doanh nghiệp</th><th className="px-4 py-3 font-bold">Điểm</th><th className="px-4 py-3 font-bold">Trạng thái</th><th className="px-4 py-3" /></tr></thead><tbody>{filteredStudents.map((student) => { const status = getReviewStatus(student); const active = student.studentId === selectedStudentId; return <tr key={student.studentId} className={`border-t border-slate-100 ${active ? "bg-blue-50/60" : "hover:bg-slate-50"}`}><td className="px-4 py-3"><p className="font-bold text-slate-800">{student.fullName}</p><p className="text-[11px] text-slate-500">{student.studentCode} · {student.class || "Chưa có lớp"}</p></td><td className="px-4 py-3 text-slate-600">{student.companyName || "Chưa có doanh nghiệp"}</td><td className="px-4 py-3 font-bold text-slate-800">{student.finalGrade == null ? "—" : student.finalGrade.toFixed(2)}</td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-bold ${status.className}`}>{student.isEvaluationFinalized ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}{status.label}</span></td><td className="px-4 py-3 text-right"><button type="button" onClick={() => setSelectedStudentId(student.studentId)} className="text-blue-700 font-bold hover:text-blue-900">Rà soát</button></td></tr>; })}</tbody></table>}
          </div>
          <aside className="p-4 bg-slate-50/60 min-h-[300px]">
            {selectedStudent ? <div className="space-y-4"><div><p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Đang rà soát</p><h3 className="text-base font-bold text-slate-900 mt-1">{selectedStudent.fullName}</h3><p className="text-xs text-slate-500">{selectedStudent.studentCode} · {selectedStudent.major || "Chưa có ngành"}</p></div><div className="grid grid-cols-2 gap-2"><div className="p-3 bg-white border border-slate-200 rounded-md"><p className="text-[10px] text-slate-500">Tiến độ</p><p className="text-lg font-bold text-slate-900">{selectedStudent.progressPercent}%</p></div><div className="p-3 bg-white border border-slate-200 rounded-md"><p className="text-[10px] text-slate-500">Báo cáo tuần</p><p className="text-lg font-bold text-slate-900">{selectedStudent.weeklyReportCount}</p></div></div><label className="block"><span className="text-xs font-bold text-slate-800">Nội dung bổ sung / nhận xét tổng kết</span><textarea value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} rows={6} placeholder="Bổ sung nhận xét, lưu ý hồ sơ hoặc nội dung cần thể hiện khi tổng kết..." className="mt-2 w-full resize-y rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 outline-none focus:border-blue-500" /></label><button type="button" onClick={() => void handleSaveNotes()} disabled={isSaving} className="il-btn il-btn-primary w-full justify-center disabled:opacity-50">{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{isSaving ? "Đang lưu..." : "Lưu nội dung bổ sung"}</button></div> : <div className="h-full flex items-center justify-center text-center text-xs text-slate-500">Chọn một sinh viên để bắt đầu rà soát.</div>}
          </aside>
        </div>
      </Panel>}

      {activeModule === "report" && <Panel className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-blue-700" /><h2 className="text-sm font-bold text-slate-900">Tổng hợp nội dung báo cáo</h2></div>
            <p className="text-xs text-slate-500 mt-1">Soạn phần diễn giải của cả kỳ trước khi tạo báo cáo Word gửi Ban Giám hiệu.</p>
          </div>
          {reportSavedAt && <span className="text-[11px] text-emerald-700 font-medium">Đã lưu lúc {new Date(reportSavedAt).toLocaleString("vi-VN")}</span>}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {([
            ["results", "Kết quả thực hiện", "Tổng hợp tiến độ hướng dẫn, số sinh viên hoàn thành, kết quả nổi bật..."],
            ["difficulties", "Khó khăn, vướng mắc", "Nêu các vấn đề trong quá trình hướng dẫn, phối hợp doanh nghiệp, tiến độ..."],
            ["recommendations", "Kiến nghị, đề xuất", "Đề xuất với Khoa, Phòng Đào tạo hoặc Ban Giám hiệu cho kỳ tiếp theo..."],
            ["conclusion", "Kết luận", "Nhận định chung và xác nhận mức độ hoàn thành công tác hướng dẫn..."],
          ] as const).map(([key, label, placeholder]) => (
            <label key={key} className="block">
              <span className="text-xs font-bold text-slate-800">{label}</span>
              <textarea value={reportContent[key]} onChange={(event) => setReportContent((current) => ({ ...current, [key]: event.target.value }))} rows={5} placeholder={placeholder} className="mt-2 w-full resize-y rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 outline-none focus:border-blue-500" />
            </label>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <p className="text-[11px] text-slate-500">Nội dung được lưu theo học kỳ và giảng viên, sau đó được dùng khi xuất Word.</p>
          <button type="button" onClick={() => void handleSaveReport()} disabled={isSavingReport || !semesterId} className="il-btn il-btn-primary justify-center disabled:opacity-50">{isSavingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{isSavingReport ? "Đang lưu..." : "Lưu nội dung báo cáo"}</button>
        </div>
        <div className="rounded-md border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-900 space-y-1">
          <p className="font-bold">Xem trước phần tổng hợp</p>
          <p><strong>Kết quả:</strong> {reportContent.results || "Chưa nhập"}</p>
          <p><strong>Khó khăn:</strong> {reportContent.difficulties || "Chưa nhập"}</p>
          <p><strong>Kiến nghị:</strong> {reportContent.recommendations || "Chưa nhập"}</p>
          <p><strong>Kết luận:</strong> {reportContent.conclusion || "Chưa nhập"}</p>
        </div>
      </Panel>}

      {activeModule === "schedule" && <Panel className="space-y-4"><div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3"><div><div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-amber-700" /><h2 className="text-sm font-bold text-slate-900">Chỉnh sửa lịch của kỳ hiện hành</h2></div><p className="text-xs text-slate-500 mt-1">Rà soát các mốc hướng dẫn theo dữ liệu học kỳ đang chọn trước khi xuất gửi Ban Giám hiệu.</p></div><div className="flex gap-2"><button type="button" className="il-btn il-btn-secondary" onClick={openScheduleForm}><CalendarDays className="w-4 h-4" /> Thêm lịch thủ công</button><button type="button" className="il-btn il-btn-primary" disabled={Boolean(exporting) || !semesterId} onClick={() => void handleExport("schedule")}>{exporting === "schedule" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Xuất lịch theo mẫu kỳ này</button></div></div>{isAddingSchedule && <div className="grid gap-3 md:grid-cols-5 rounded-md border border-blue-100 bg-blue-50/40 p-3"><label><span className="text-[10px] font-bold text-slate-500">Tuần</span><input type="number" min={1} value={scheduleForm.weekNumber} onChange={(event) => setScheduleForm((current) => ({ ...current, weekNumber: Number(event.target.value) }))} className="mt-1 w-full px-2.5 py-2 text-xs border border-slate-200 rounded-md" /></label><label><span className="text-[10px] font-bold text-slate-500">Ngày</span><input type="datetime-local" value={scheduleForm.meetingDate} onChange={(event) => setScheduleForm((current) => ({ ...current, meetingDate: event.target.value }))} className="mt-1 w-full px-2.5 py-2 text-xs border border-slate-200 rounded-md" /></label><label className="md:col-span-2"><span className="text-[10px] font-bold text-slate-500">Nội dung làm việc</span><input value={scheduleForm.title} onChange={(event) => setScheduleForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ví dụ: Kiểm tra sinh viên thực tập" className="mt-1 w-full px-2.5 py-2 text-xs border border-slate-200 rounded-md" /></label><label><span className="text-[10px] font-bold text-slate-500">Số tiết</span><input type="number" min={1} value={scheduleForm.durationMinutes} onChange={(event) => setScheduleForm((current) => ({ ...current, durationMinutes: Number(event.target.value) }))} className="mt-1 w-full px-2.5 py-2 text-xs border border-slate-200 rounded-md" /></label><label className="md:col-span-2"><span className="text-[10px] font-bold text-slate-500">Ghi chú / địa điểm</span><input value={scheduleForm.location} onChange={(event) => setScheduleForm((current) => ({ ...current, location: event.target.value }))} placeholder="Phòng học / Văn phòng Khoa" className="mt-1 w-full px-2.5 py-2 text-xs border border-slate-200 rounded-md" /></label><label className="md:col-span-2"><span className="text-[10px] font-bold text-slate-500">Mô tả</span><input value={scheduleForm.description} onChange={(event) => setScheduleForm((current) => ({ ...current, description: event.target.value }))} className="mt-1 w-full px-2.5 py-2 text-xs border border-slate-200 rounded-md" /></label><div className="flex items-end"><button type="button" onClick={() => void createSchedule()} className="il-btn il-btn-primary w-full justify-center"><Save className="w-4 h-4" /> Lưu lịch</button></div></div>}{schedules.length === 0 ? <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">Chưa có buổi hướng dẫn trong dữ liệu Điểm danh & Buổi gặp.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-3 py-3">STT</th><th className="px-3 py-3">Ngày</th><th className="px-3 py-3">Tuần</th><th className="px-3 py-3">Số tiết</th><th className="px-3 py-3">Nội dung làm việc</th><th className="px-3 py-3">Ghi chú</th><th className="px-3 py-3">Thao tác</th></tr></thead><tbody>{schedules.map((schedule, index) => <tr key={schedule.id} className="border-t border-slate-100 align-top"><td className="px-3 py-3">{index + 1}</td><td className="px-3 py-3 whitespace-nowrap">{new Date(schedule.dueDate).toLocaleDateString("vi-VN")}</td><td className="px-3 py-3">{schedule.weekNumber}</td><td className="px-3 py-3">{((schedule.durationMinutes ?? 60) / 60).toFixed(1)}</td><td className="px-3 py-3 min-w-[320px]"><input defaultValue={schedule.title} onBlur={(event) => { if (event.target.value !== schedule.title) void updateSchedule(schedule, { title: event.target.value }); }} className="w-full px-2 py-1.5 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded" /></td><td className="px-3 py-3 min-w-[180px]"><input defaultValue={schedule.location ?? schedule.description ?? ""} onBlur={(event) => { if (event.target.value !== (schedule.location ?? schedule.description ?? "")) void updateSchedule(schedule, { location: event.target.value }); }} className="w-full px-2 py-1.5 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded" /></td><td className="px-3 py-3 whitespace-nowrap"><span className="text-[10px] text-emerald-700 mr-2">{savingScheduleId === schedule.id ? "Đang lưu" : "Đã đồng bộ"}</span><button type="button" onClick={() => void deleteSchedule(schedule)} className="text-rose-700 hover:text-rose-900" title="Xóa lịch"><XCircle className="w-4 h-4" /></button></td></tr>)}</tbody></table></div>}</Panel>}

      {activeModule === "grades" && <Panel className="space-y-4"><div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-emerald-700" /><h2 className="text-sm font-bold text-slate-900">Xuất mẫu bảng điểm</h2></div><p className="text-xs text-slate-500 mt-1">Xuất bảng điểm sau khi đã rà soát từng sinh viên.</p></div><button type="button" className="il-btn il-btn-primary" disabled={Boolean(exporting) || !semesterId} onClick={() => void handleExport("grades")}>{exporting === "grades" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Xuất bảng điểm</button></div></Panel>}

      {activeModule === "report" && <Panel className="space-y-4"><div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-blue-700" /><h2 className="text-sm font-bold text-slate-900">Xuất mẫu báo cáo Word</h2></div><p className="text-xs text-slate-500 mt-1">Nội dung đã lưu sẽ được đưa vào các placeholder tương ứng trong mẫu Word.</p></div><button type="button" className="il-btn il-btn-primary" disabled={Boolean(exporting) || !semesterId} onClick={() => void handleExport("report")}>{exporting === "report" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Xuất báo cáo Word</button></div></Panel>}
    </div>
  );
};
