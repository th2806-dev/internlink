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
import { adminStudentsService } from "../../../services/adminStudents.service";
import { toApiSemesterId, useSemester } from "../../../contexts/SemesterContext";
import type { AttendanceSessionDto, LecturerStudentListItemDto } from "../../../types/api";
import { buildWordReportPreviewData, formatWordDate } from "./summaryWordTemplate";

type ExportKind = "grades" | "report" | "schedule";

type ExportOption = {
  kind: ExportKind;
  title: string;
  description: string;
  format: string;
  icon: typeof FileSpreadsheet;
  tone: string;
};

function getReviewStatus(student: LecturerStudentListItemDto) {
  if (student.isEvaluationFinalized) return { label: "Đã chốt", className: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  if (student.hasEvaluation) return { label: "Đang rà soát", className: "text-blue-700 bg-blue-50 border-blue-200" };
  return { label: "Chưa có điểm", className: "text-amber-700 bg-amber-50 border-amber-200" };
}

type SummaryScope = "lecturer" | "admin";

export const SummaryView = ({ onShowToast, scope = "lecturer" }: { onShowToast?: (msg: string) => void; scope?: SummaryScope }) => {
  const { selectedSemester, selectedSemesterId } = useSemester();
  const semesterId = toApiSemesterId(selectedSemesterId);
  const isAdminScope = scope === "admin";
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
  const [activeModule, setActiveModule] = useState<ExportKind>(isAdminScope ? "report" : "grades");
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSessionDto[]>([]);

  const exportOptions: ExportOption[] = [
    {
      kind: "grades",
      title: isAdminScope ? "Bảng điểm toàn khóa" : "Bảng điểm nhóm hướng dẫn",
      description: isAdminScope ? "Danh sách sinh viên trong kỳ đang chọn, phục vụ xem tổng quan và xuất báo cáo khoa." : "Danh sách sinh viên và kết quả đánh giá của nhóm đang phụ trách.",
      format: "Excel (.xlsx)",
      icon: FileSpreadsheet,
      tone: "text-emerald-700 bg-emerald-50 border-emerald-100",
    },
    {
      kind: "report",
      title: "Báo cáo tổng kết công tác",
      description: isAdminScope ? "Báo cáo Word tổng hợp công tác thực tập của toàn khoa theo kỳ đang chọn." : "Báo cáo Word tổng hợp công tác thực tập theo kỳ và đơn vị.",
      format: "Word (.docx)",
      icon: FileText,
      tone: "text-blue-700 bg-blue-50 border-blue-100",
    },
    ...(isAdminScope ? [] : [{
      kind: "schedule",
      title: "Lịch hướng dẫn thực tập",
      description: "Lịch theo mẫu của kỳ hiện hành, sẵn sàng gửi Ban Giám hiệu.",
      format: "Excel theo mẫu kỳ hiện hành",
      icon: CalendarDays,
      tone: "text-amber-700 bg-amber-50 border-amber-100",
    }] as ExportOption[]),
  ];

  useEffect(() => {
    if (isAdminScope && activeModule === "schedule") {
      setActiveModule("report");
      return;
    }
    if (!isAdminScope && activeModule === "report") {
      setActiveModule("grades");
    }
  }, [activeModule, isAdminScope]);

  useEffect(() => {
    let cancelled = false;
    const loadStudents = async () => {
      if (!semesterId) {
        setStudents([]);
        return;
      }
      setIsLoading(true);
      try {
        const rows = isAdminScope
          ? (await adminStudentsService.getAll(0, 500, semesterId)).map((student) => ({
              studentId: student.id,
              internshipId: student.id,
              studentCode: student.studentCode,
              fullName: student.fullName,
              email: student.email ?? null,
              phone: student.phone ?? null,
              class: student.class ?? null,
              major: student.major ?? null,
              companyId: null,
              companyName: null,
              position: null,
              internshipStatus: "Chưa phân công",
              startDate: null,
              endDate: null,
              weeklyReportCount: 0,
              pendingReportCount: 0,
              submissionCount: 0,
              notes: "",
              finalGrade: null,
              hasEvaluation: false,
              isEvaluationFinalized: false,
              progressPercent: 0,
              progressBreakdown: undefined,
            })) as LecturerStudentListItemDto[]
          : await lecturerInternshipsService.getStudents(semesterId);
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

  useEffect(() => {
    if (!semesterId) {
      setAttendanceSessions([]);
      return;
    }
    void attendanceService.getLecturerSessions(semesterId).then(setAttendanceSessions).catch(() => setAttendanceSessions([]));
  }, [semesterId]);

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

  const reportPreview = useMemo(() => {
    const gradeSummary = [
      { label: "Xuất sắc", quantity: students.filter((student) => (student.finalGrade ?? -1) >= 9).length, rate: students.length ? Number(((students.filter((student) => (student.finalGrade ?? -1) >= 9).length / students.length) * 100).toFixed(1)) : 0 },
      { label: "Giỏi", quantity: students.filter((student) => (student.finalGrade ?? -1) >= 8 && (student.finalGrade ?? -1) < 9).length, rate: students.length ? Number(((students.filter((student) => (student.finalGrade ?? -1) >= 8 && (student.finalGrade ?? -1) < 9).length / students.length) * 100).toFixed(1)) : 0 },
      { label: "Khá", quantity: students.filter((student) => (student.finalGrade ?? -1) >= 7 && (student.finalGrade ?? -1) < 8).length, rate: students.length ? Number(((students.filter((student) => (student.finalGrade ?? -1) >= 7 && (student.finalGrade ?? -1) < 8).length / students.length) * 100).toFixed(1)) : 0 },
      { label: "Trung bình khá", quantity: students.filter((student) => (student.finalGrade ?? -1) >= 6.5 && (student.finalGrade ?? -1) < 7).length, rate: students.length ? Number(((students.filter((student) => (student.finalGrade ?? -1) >= 6.5 && (student.finalGrade ?? -1) < 7).length / students.length) * 100).toFixed(1)) : 0 },
      { label: "Trung bình", quantity: students.filter((student) => (student.finalGrade ?? -1) >= 5 && (student.finalGrade ?? -1) < 6.5).length, rate: students.length ? Number(((students.filter((student) => (student.finalGrade ?? -1) >= 5 && (student.finalGrade ?? -1) < 6.5).length / students.length) * 100).toFixed(1)) : 0 },
      { label: "Yếu", quantity: students.filter((student) => (student.finalGrade ?? -1) < 5 && student.finalGrade != null).length, rate: students.length ? Number(((students.filter((student) => (student.finalGrade ?? -1) < 5 && student.finalGrade != null).length / students.length) * 100).toFixed(1)) : 0 },
      { label: "Không thực tập", quantity: students.filter((student) => student.finalGrade == null && !student.isEvaluationFinalized).length, rate: students.length ? Number(((students.filter((student) => student.finalGrade == null && !student.isEvaluationFinalized).length / students.length) * 100).toFixed(1)) : 0 },
    ];

    return buildWordReportPreviewData({
      semesterName: selectedSemester?.name ?? "KHOA",
      reportDate: new Date(),
      startDate: selectedSemester?.startDate ?? "2026-09-01",
      endDate: selectedSemester?.endDate ?? "2026-12-31",
      companyCount: new Set(students.map((student) => student.companyName).filter(Boolean)).size,
      registeredStudents: students.length,
      completedStudents: students.filter((student) => student.isEvaluationFinalized || student.finalGrade != null).length,
      incompleteStudents: students.filter((student) => !student.isEvaluationFinalized && student.finalGrade == null).length,
      gradeSummary,
    });
  }, [selectedSemester, students]);

  const incompleteStudents = useMemo(
    () => students.filter((student) => !student.isEvaluationFinalized && student.finalGrade == null).slice(0, 10),
    [students],
  );

  const handleSaveNotes = async () => {
    if (!selectedStudent) return;
    if (isAdminScope) {
      onShowToast?.("Chế độ quản trị khoa đang xem toàn bộ sinh viên trong kỳ đang chọn. Chỉ giảng viên mới cập nhật nội dung riêng cho từng sinh viên.");
      return;
    }
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
      onShowToast?.("Đã lưu báo cáo tổng kết công tác của khoa.");
    } catch (error) {
      onShowToast?.(getApiErrorMessage(error));
    } finally {
      setIsSavingReport(false);
    }
  };

  const handleExport = async (kind: ExportKind) => {
    if (kind === "schedule" && isAdminScope) {
      onShowToast?.("Tab Lịch hướng dẫn thực tập không hiển thị ở cổng quản trị khoa. Chỉ tổng hợp file Excel theo giảng viên ở cấp khác.");
      return;
    }
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

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto animate-in fade-in duration-200">
      <PageHeader icon={ClipboardList} title={isAdminScope ? "Báo cáo tổng kết công tác khoa" : "Tổng kết"} subtitle={isAdminScope ? "Tổng quan toàn bộ sinh viên trong kỳ đang chọn và chuẩn bị báo cáo tổng kết công tác của khoa theo học kỳ." : "Rà soát, bổ sung nội dung và chuẩn bị hồ sơ cuối kỳ của nhóm sinh viên đang hướng dẫn."} badge={selectedSemester?.name || "Chưa chọn học kỳ"} badgeColor="bg-blue-50 text-blue-800 border-blue-200" />

      <nav className={`grid grid-cols-1 ${isAdminScope ? "sm:grid-cols-2" : "sm:grid-cols-3"} gap-2`} aria-label="Các mẫu tổng kết">
        {exportOptions.map((option) => {
          const Icon = option.icon;
          const active = activeModule === option.kind;
          return <button key={option.kind} type="button" onClick={() => setActiveModule(option.kind)} className={`text-left p-3 rounded-md border transition-colors ${active ? "border-blue-300 bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}><span className="flex items-center gap-2"><Icon className="w-4 h-4" /><span className="text-xs font-bold">{option.title}</span></span><span className="block text-[10px] mt-1 ml-6 opacity-75">Chỉnh sửa mẫu {option.format}</span></button>;
        })}
      </nav>

      {activeModule === "grades" && <section className="grid grid-cols-2 lg:grid-cols-4 il-panel overflow-hidden">
        <div className="p-4 border-r border-b lg:border-b-0 border-slate-100"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sinh viên</p><p className="text-2xl font-bold text-slate-900 mt-1">{students.length}</p><p className="text-[11px] text-slate-500 mt-1">{isAdminScope ? "Trong kỳ đang chọn" : "Trong nhóm hướng dẫn"}</p></div>
        <div className="p-4 border-r border-b lg:border-b-0 border-slate-100 border-l-4 border-l-emerald-500"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Đã chốt điểm</p><p className="text-2xl font-bold text-slate-900 mt-1">{finalizedCount}</p><p className="text-[11px] text-slate-500 mt-1">Có thể rà soát lần cuối</p></div>
        <div className="p-4 border-r border-slate-100 border-l-4 border-l-amber-500"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Chưa hoàn tất</p><p className="text-2xl font-bold text-slate-900 mt-1">{students.length - finalizedCount}</p><p className="text-[11px] text-slate-500 mt-1">Cần kiểm tra thêm</p></div>
        <div className="p-4 border-l-4 border-l-blue-500"><p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Đã bổ sung</p><p className="text-2xl font-bold text-slate-900 mt-1">{notesCount}</p><p className="text-[11px] text-slate-500 mt-1">Có nội dung ghi chú</p></div>
      </section>}

      {activeModule === "grades" && <Panel padding="none" className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div><div className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-700" /><h2 className="text-sm font-bold text-slate-900">{isAdminScope ? "Danh sách sinh viên trong kỳ" : "Rà soát hồ sơ sinh viên"}</h2></div><p className="text-xs text-slate-500 mt-1">{isAdminScope ? "Toàn bộ sinh viên trong kỳ đang chọn, phục vụ rà soát kết quả và báo cáo tổng kết khoa." : "Chọn từng sinh viên để kiểm tra điểm và bổ sung nhận xét trước khi xuất hồ sơ."}</p></div>
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

      {activeModule === "report" && (
        <div className="grid xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-4">
          <Panel className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-blue-700" /><h2 className="text-sm font-bold text-slate-900">{isAdminScope ? "Tổng hợp báo cáo công tác khoa" : "Tổng hợp nội dung báo cáo"}</h2></div>
                <p className="text-xs text-slate-500 mt-1">{isAdminScope ? "Soạn phần diễn giải tổng thể về tình hình thực tập của khoa theo học kỳ đang chọn." : "Soạn phần diễn giải của cả kỳ trước khi tạo báo cáo Word gửi Ban Giám hiệu."}</p>
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
              <p className="text-[11px] text-slate-500">{isAdminScope ? "Nội dung được lưu theo học kỳ của khoa và dùng để xuất báo cáo Word cấp khoa." : "Nội dung được lưu theo học kỳ và giảng viên, sau đó được dùng khi xuất Word."}</p>
              <button type="button" onClick={() => void handleSaveReport()} disabled={isSavingReport || !semesterId} className="il-btn il-btn-primary justify-center disabled:opacity-50">{isSavingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{isSavingReport ? "Đang lưu..." : "Lưu nội dung báo cáo"}</button>
            </div>
          </Panel>

          <Panel className="p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Xem trước Word</p>
                <p className="text-xs font-semibold text-slate-800">Mẫu báo cáo tổng kết công tác</p>
              </div>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">A4</span>
            </div>
            <div className="bg-slate-100 p-4 md:p-6">
              <div className="mx-auto max-w-[780px] min-h-[1100px] bg-white p-6 md:p-8 shadow-sm border border-slate-200 text-[11px] leading-[1.6] text-slate-800 font-[Georgia,serif]">
                <div className="text-center">
                  <div className="text-[12px] font-bold uppercase">TRƯỜNG CAO ĐẲNG GTVT</div>
                  <div className="text-[12px] font-bold uppercase mt-1">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="mt-3 text-[11px] font-bold">KHOA {reportPreview.header.department.replace(/^KHOA\s+/i, "").toUpperCase()} <span className="font-normal">Độc lập – Tự do – Hạnh phúc</span></div>
                  <div className="mt-6 text-[11px] italic">Tp. Hồ Chí Minh, {formatWordDate(selectedSemester?.startDate ?? new Date())}</div>
                </div>

                <div className="mt-6 text-center font-bold uppercase text-[12px]">
                  BÁO CÁO TỔNG KẾT CÔNG TÁC THỰC TẬP TỐT NGHIỆP
                </div>
                <div className="mt-3 text-center text-[11px]">
                  Thời gian thực tập: từ {formatWordDate(selectedSemester?.startDate ?? "2026-09-01")} đến {formatWordDate(selectedSemester?.endDate ?? "2026-12-31")}
                </div>

                <div className="mt-6">
                  <p className="font-bold uppercase text-[11px]">I. TỔNG HỢP SỐ LIỆU</p>
                  <p className="mt-3 font-bold">1. Số lượng sinh viên thực tập:</p>
                  <ul className="mt-2 space-y-1 pl-5 list-disc">
                    <li>Số lượng doanh nghiệp nhận sinh viên thực tập: {reportPreview.stats.companyCount} đơn vị</li>
                    <li>Số lượng sinh viên đăng ký thực tập: {reportPreview.stats.registeredStudents} sinh viên</li>
                    <li>Số lượng sinh viên hoàn thành đợt thực tập: {reportPreview.stats.completedStudents} sinh viên</li>
                    <li>Số sinh viên không hoàn thành thực tập: {reportPreview.stats.incompleteStudents} sinh viên</li>
                  </ul>

                  <p className="mt-4 font-bold">2. Thống kê kết quả thực tập:</p>
                  <table className="mt-2 w-full border border-slate-300 border-collapse text-center text-[10px]">
                    <thead>
                      <tr>
                        <th className="border border-slate-300 px-1 py-2 font-bold">Xếp loại</th>
                        <th className="border border-slate-300 px-1 py-2 font-bold">Số lượng</th>
                        <th className="border border-slate-300 px-1 py-2 font-bold">Tỉ lệ (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...reportPreview.gradeSummary, { label: "TỔNG", quantity: reportPreview.stats.registeredStudents, rate: 100 }].map((row) => (
                        <tr key={row.label}>
                          <td className="border border-slate-300 px-1 py-2 text-left pl-2">{row.label}</td>
                          <td className="border border-slate-300 px-1 py-2">{row.quantity}</td>
                          <td className="border border-slate-300 px-1 py-2">{row.rate.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <p className="mt-4 font-bold">3. Danh sách sinh viên không hoàn thành thực tập</p>
                  <table className="mt-2 w-full border border-slate-300 border-collapse text-center text-[10px]">
                    <thead>
                      <tr>
                        <th className="border border-slate-300 px-1 py-1">TT</th>
                        <th className="border border-slate-300 px-1 py-1">MSSV</th>
                        <th className="border border-slate-300 px-1 py-1">Họ</th>
                        <th className="border border-slate-300 px-1 py-1">Tên</th>
                        <th className="border border-slate-300 px-1 py-1">Lớp</th>
                        <th className="border border-slate-300 px-1 py-1">Lý do</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incompleteStudents.length > 0 ? incompleteStudents.map((student, index) => {
                        const nameParts = student.fullName.trim().split(/\s+/);
                        const ho = nameParts.slice(0, -1).join(" ") || "";
                        const ten = nameParts[nameParts.length - 1] || student.fullName;
                        return (
                          <tr key={student.studentId}>
                            <td className="border border-slate-300 px-1 py-1">{index + 1}</td>
                            <td className="border border-slate-300 px-1 py-1">{student.studentCode}</td>
                            <td className="border border-slate-300 px-1 py-1">{ho}</td>
                            <td className="border border-slate-300 px-1 py-1">{ten}</td>
                            <td className="border border-slate-300 px-1 py-1">{student.class || "—"}</td>
                            <td className="border border-slate-300 px-1 py-1 text-left">{student.notes || "Chưa hoàn thành thực tập"}</td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={6} className="border border-slate-300 px-1 py-2 text-center">Không có sinh viên không hoàn thành thực tập</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6">
                  <p className="font-bold uppercase text-[11px]">II. BÁO CÁO CHUNG VỀ TÌNH HÌNH THỰC TẬP</p>
                  <div className="mt-2 whitespace-pre-wrap min-h-[80px]">{reportContent.results || "Chưa có nội dung tổng hợp..."}</div>
                </div>

                <div className="mt-6">
                  <p className="font-bold uppercase text-[11px]">III. ĐIỂM NỔI BẬT VÀ HẠN CHẾ TRONG CÔNG TÁC THỰC TẬP</p>
                  <div className="mt-2 whitespace-pre-wrap min-h-[80px]">{reportContent.difficulties || reportContent.recommendations || reportContent.conclusion || "Chưa có nội dung điểm nổi bật và hạn chế..."}</div>
                </div>

                <div className="mt-10 text-[10px]">
                  <div className="flex justify-between">
                    <div className="text-center">
                      <p className="font-bold">TRƯỞNG PHÒNG ĐÀO TẠO</p>
                      <p className="mt-12">Nguyễn Ngọc Trung</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold">TRƯỞNG KHOA</p>
                      <p className="mt-12">Bùi Đức Minh</p>
                    </div>
                  </div>
                  <div className="mt-8 text-center">
                    <p className="font-bold">KT. HIỆU TRƯỞNG</p>
                    <p className="mt-12">Phan Huy Đức</p>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {activeModule === "schedule" && <Panel className="space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-amber-700" /><h2 className="text-sm font-bold text-slate-900">Lịch hướng dẫn thực tập</h2></div>
            <p className="text-xs text-slate-500 mt-1">Chỉ xem lịch công tác riêng (không có điểm danh SV). Quản lý lịch chung vui lòng qua trang <strong>Điểm danh &amp; Buổi gặp hướng dẫn</strong>.</p>
          </div>
          <button type="button" className="il-btn il-btn-primary" disabled={Boolean(exporting) || !semesterId} onClick={() => void handleExport("schedule")}>{exporting === "schedule" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Xuất lịch theo mẫu kỳ này</button>
        </div>

        {(() => {
          const personalSessions = attendanceSessions
            .filter((s) => s.isLecturerOnly)
            .slice()
            .sort((a, b) => a.weekNumber - b.weekNumber);

          return personalSessions.length === 0 ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
              Chưa có lịch công tác riêng nào. Hãy tạo tại trang <strong>Điểm danh &amp; Buổi gặp hướng dẫn</strong> (tick "Công tác riêng của giảng viên").
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-3">STT</th>
                    <th className="px-3 py-3">Ngày</th>
                    <th className="px-3 py-3">Tuần</th>
                    <th className="px-3 py-3">Số tiết</th>
                    <th className="px-3 py-3">Nội dung làm việc</th>
                    <th className="px-3 py-3">Địa điểm / Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {personalSessions.map((session, index) => (
                    <tr key={session.id} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-3">{index + 1}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{new Date(session.meetingDate).toLocaleDateString("vi-VN")}</td>
                      <td className="px-3 py-3">{session.weekNumber}</td>
                      <td className="px-3 py-3">{((session.durationMinutes ?? 45) / 45).toFixed(1).replace(/\.0$/, "")} tiết</td>
                      <td className="px-3 py-3 min-w-[260px]">{session.title}</td>
                      <td className="px-3 py-3 min-w-[180px]">{session.location || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </Panel>}

      {activeModule === "grades" && <Panel className="space-y-4"><div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-emerald-700" /><h2 className="text-sm font-bold text-slate-900">Xuất mẫu bảng điểm</h2></div><p className="text-xs text-slate-500 mt-1">Xuất bảng điểm sau khi đã rà soát từng sinh viên.</p></div><button type="button" className="il-btn il-btn-primary" disabled={Boolean(exporting) || !semesterId} onClick={() => void handleExport("grades")}>{exporting === "grades" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Xuất bảng điểm</button></div></Panel>}

      {activeModule === "report" && <Panel className="space-y-4"><div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-blue-700" /><h2 className="text-sm font-bold text-slate-900">Xuất mẫu báo cáo Word</h2></div><p className="text-xs text-slate-500 mt-1">Nội dung đã lưu sẽ được đưa vào các placeholder tương ứng trong mẫu Word.</p></div><button type="button" className="il-btn il-btn-primary" disabled={Boolean(exporting) || !semesterId} onClick={() => void handleExport("report")}>{exporting === "report" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Xuất báo cáo Word</button></div></Panel>}
    </div>
  );
};
