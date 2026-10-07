import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronDown,
  Table as TableIcon,
  LineChart as LineChartIcon,
  BarChart3,
  RefreshCw,
  Download,
  Sliders,
  Building2,
  UserCheck,
  Mail,
  Phone,
  Clock,
  ArrowRight,
  X,
  FileCheck2,
  MessageSquare,
  ExternalLink,
  Calendar,
  AlertCircle,
  GraduationCap,
  Award,
} from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";
import { useSemester } from "../../../contexts/SemesterContext";
import { useWeeklyReports } from "../../../hooks/useWeeklyReports";
import { evaluationService } from "../../../services/evaluation.service";
import { submissionApiService } from "../../../services/submissionApi.service";
import {
  semesterReportScheduleService,
  type SemesterReportScheduleDto,
} from "../../../services/semesterReportSchedule.service";
import type { EvaluationDetailDto } from "../../../types/api";

type ChartMode = "bar" | "line" | "table";

export const DashboardView = ({
  onNavigate,
  onShowToast,
}: {
  onNavigate?: (tab: string) => void;
  onShowToast?: (msg: string, type?: string) => void;
}) => {
  const { profile, internship, internshipId, refresh } = useStudentPortal();
  const { semesters, selectedSemester, selectSemester, activeSemesterId } = useSemester();
  const { reports, loading: reportsLoading } = useWeeklyReports();

  const [evaluation, setEvaluation] = useState<EvaluationDetailDto | null>(null);
  const [reportSchedules, setReportSchedules] = useState<SemesterReportScheduleDto[]>([]);
  const [submissionComments, setSubmissionComments] = useState<
    { id: string; title: string; comment: string; date: string }[]
  >([]);
  const [chartMode, setChartMode] = useState<ChartMode>("bar");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  const scheduleSemesterId =
    internship?.semesterId ?? selectedSemester?.id ?? activeSemesterId;

  // Load real evaluation & submission feedbacks from API
  const loadExtra = useCallback(async () => {
    if (internshipId) {
      try {
        const ev = await evaluationService.getByInternship(internshipId);
        setEvaluation(ev);
      } catch {
        setEvaluation(null);
      }
    } else {
      setEvaluation(null);
    }

    try {
      const subs = await submissionApiService.getMine();
      setSubmissionComments(
        subs.flatMap((sub) =>
          (sub.feedbacks ?? [])
            .filter((f) => f.isPublic)
            .map((f) => ({
              id: f.id,
              title: sub.title ?? sub.type,
              comment: f.comment,
              date: f.createdAt,
            })),
        ),
      );
    } catch {
      setSubmissionComments([]);
    }
  }, [internshipId]);

  useEffect(() => {
    loadExtra();
  }, [loadExtra]);

  // Load real semester report schedules
  useEffect(() => {
    let cancelled = false;
    if (!scheduleSemesterId) {
      setReportSchedules([]);
      return;
    }
    semesterReportScheduleService
      .getSchedules(scheduleSemesterId)
      .then((schedules) => {
        if (!cancelled) setReportSchedules(schedules);
      })
      .catch(() => {
        if (!cancelled) setReportSchedules([]);
      });
    return () => {
      cancelled = true;
    };
  }, [scheduleSemesterId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
      await loadExtra();
      onShowToast?.("Đã làm mới dữ liệu thực tập thành công", "success");
    } finally {
      setIsRefreshing(false);
    }
  };

  // d2: Chương trình đào tạo = tên ngành + 4 ký tự đầu lớp
  const majorName =
    profile.major && profile.major !== "—" ? profile.major : "Khoa học Máy tính";
  const classPrefix =
    profile.class && profile.class !== "—" ? profile.class.slice(0, 4) : "C23A";
  const programName = majorName.includes(classPrefix)
    ? majorName
    : `${majorName} ${classPrefix}`.trim();

  // d2: Danh sách Năm học & Học kỳ
  const academicYears = useMemo(() => {
    const years = Array.from(
      new Set(semesters.map((s) => s.academicYear).filter(Boolean)),
    );
    if (years.length === 0) {
      return [selectedSemester?.academicYear || "2025 - 2026", "2026 - 2027"];
    }
    return years;
  }, [semesters, selectedSemester]);

  const terms = useMemo(() => {
    const termList = Array.from(
      new Set(semesters.map((s) => s.term).filter(Boolean)),
    );
    if (termList.length === 0) {
      return ["Học kỳ 1", "Học kỳ 2", "Học kỳ hè"];
    }
    return termList;
  }, [semesters]);

  const currentAcademicYear =
    selectedSemester?.academicYear || academicYears[0] || "2025 - 2026";
  const currentTerm = selectedSemester?.term || terms[0] || "Học kỳ 1";

  const handleYearChange = (year: string) => {
    const match =
      semesters.find((s) => s.academicYear === year && s.term === currentTerm) ||
      semesters.find((s) => s.academicYear === year);
    if (match) {
      selectSemester(match.id);
    }
  };

  const handleTermChange = (term: string) => {
    const match =
      semesters.find((s) => s.academicYear === currentAcademicYear && s.term === term) ||
      semesters.find((s) => s.term === term);
    if (match) {
      selectSemester(match.id);
    }
  };

  // Next pending report from real reports & schedule
  const nextPendingReport = reports.find(
    (r) => r.status === "draft" || r.status === "revised",
  );
  const nextReportSchedule = nextPendingReport
    ? reportSchedules.find((s) => s.weekNumber === nextPendingReport.weekNumber)
    : reportSchedules.find((s) => s.isSubmissionOpen);

  const daysRemaining = nextReportSchedule?.dueDate
    ? Math.ceil((new Date(nextReportSchedule.dueDate).getTime() - Date.now()) / 86_400_000)
    : null;

  // ── Tính điểm QT theo công thức backend (InternshipGradeCalculator) ──
  // Điểm QT = MIN(10, Nộp_Đủ(max 2) + Đúng_Hạn(max 2) + Chất_Lượng_TB(max 5) + Sáng_Tạo(+1))
  const gradeBreakdown = useMemo(() => {
    // Rubric chất lượng từng tuần do GV chấm
    const weeklyScores = evaluation?.weeklyQualityScores ?? {};
    const ratedValues = Object.values(weeklyScores).filter(
      (v) => [1.0, 2.0, 3.5, 4.0, 5.0].includes(v),
    );
    const qualityAvg =
      ratedValues.length > 0
        ? Math.round((ratedValues.reduce((s, v) => s + v, 0) / ratedValues.length) * 10) / 10
        : evaluation?.qualityLevel ?? 0;

    const creative = evaluation?.hasCreativeProduct ? 1.0 : 0;

    // Đếm missing / late từ weekly reports thực tế (không dùng điểm danh)
    const missingCount = reports.filter((r) => r.status === "draft" || r.status === "revised").length;
    const lateCount = 0; // Late status không được track trong WeeklyReportData hiện tại

    const submittedCount = reports.filter(
      (r) => r.status === "submitted" || r.status === "approved",
    ).length;

    const submissionPts =
      submittedCount > 0
        ? Math.max(0, 2.0 - missingCount * 0.5)
        : 0;
    const punctualityPts =
      submittedCount > 0
        ? Math.max(0, 2.0 - lateCount * 0.5)
        : 0;
    const processScore = Math.round(Math.min(10, submissionPts + punctualityPts + qualityAvg + creative) * 10) / 10;

    return { submissionPts, punctualityPts, qualityAvg, creative, processScore, weeklyScores };
  }, [evaluation, reports]);

  // Dữ liệu biểu đồ: Điểm đánh giá báo cáo tuần (rubric GV) + phân rã Điểm QT
  const academicResultsData = useMemo(() => {
    const items: Array<{
      id: string;
      name: string;
      userScore: number;
      passScore: number;
      desc: string;
    }> = [];

    // 1. Ưu tiên: Điểm rubric chất lượng TỪNG TUẦN do GV chấm
    const wq = gradeBreakdown.weeklyScores;
    const weekEntries = Object.entries(wq)
      .map(([w, s]) => ({
        id: `week-${w}`,
        name: `Tuần ${w}`,
        userScore: Math.round(Number(s) * 10) / 10,
        passScore: 3.5,
        desc: `Rubric chất lượng báo cáo tuần ${w} (thang 5)`,
      }))
      .sort((a, b) => {
        const na = Number(a.name.replace("Tuần ", ""));
        const nb = Number(b.name.replace("Tuần ", ""));
        return na - nb;
      });

    if (weekEntries.length > 0) {
      items.push(...weekEntries);
      return items;
    }

    // 2. Fallback: phân rã Điểm QT theo công thức chấm điểm
    const { submissionPts, punctualityPts, qualityAvg, creative, processScore } = gradeBreakdown;
    if (processScore > 0 || reports.length > 0) {
      items.push({
        id: "sub",
        name: "Nộp đủ",
        userScore: Math.round(submissionPts * 10) / 10,
        passScore: 2.0,
        desc: "Điểm nộp đủ bài (max 2.0) – trừ 0.5/bài thiếu",
      });
      items.push({
        id: "punc",
        name: "Đúng hạn",
        userScore: Math.round(punctualityPts * 10) / 10,
        passScore: 2.0,
        desc: "Điểm đúng hạn (max 2.0) – trừ 0.5/bài trễ",
      });
      items.push({
        id: "qual",
        name: "Chất lượng",
        userScore: Math.round(qualityAvg * 10) / 10,
        passScore: 3.5,
        desc: "TB rubric chất lượng các tuần đã chấm (max 5.0)",
      });
      if (creative > 0) {
        items.push({
          id: "creative",
          name: "Sáng tạo",
          userScore: 1.0,
          passScore: 1.0,
          desc: "Điểm cộng sản phẩm sáng tạo (+1.0)",
        });
      }
      items.push({
        id: "process",
        name: "Điểm QT",
        userScore: processScore,
        passScore: 5.0,
        desc: `Điểm quá trình tổng hợp (thang 10, hệ số 40%)`,
      });
      return items;
    }

    // 3. Fallback cuối: điểm hiện tại từ profile
    if (profile.currentGrade > 0) {
      return [
        {
          id: "current",
          name: "Điểm hiện tại",
          userScore: Math.round(profile.currentGrade * 10) / 10,
          passScore: 5.0,
          desc: "Điểm đánh giá cập nhật theo tiến trình thực tập",
        },
      ];
    }

    return [];
  }, [gradeBreakdown, reports, profile.currentGrade]);

  // Real progress counts from weekly reports & profile
  const approvedReports = reports.filter((r) => r.status === "approved").length;
  const submittedReports = reports.filter((r) => r.status === "submitted").length;
  const draftOrRevisedReports = reports.filter(
    (r) => r.status === "draft" || r.status === "revised",
  ).length;

  const totalRequiredWeeks = Math.max(
    profile.progressBreakdown?.requiredWeeksCount ?? 0,
    selectedSemester?.totalWeeks ?? 0,
  );

  const pendingOrUnsubmittedCount = Math.max(
    0,
    totalRequiredWeeks - approvedReports - submittedReports,
  );

  const pieData = useMemo(() => {
    const list = [];
    if (approvedReports > 0) {
      list.push({
        name: "Đã duyệt",
        value: approvedReports,
        color: "#4d74c9",
      });
    }
    if (submittedReports > 0) {
      list.push({
        name: "Chờ duyệt",
        value: submittedReports,
        color: "#38bdf8",
      });
    }
    const remaining = pendingOrUnsubmittedCount + draftOrRevisedReports;
    if (remaining > 0) {
      list.push({
        name: "Chưa hoàn thành",
        value: remaining,
        color: "#7bc043",
      });
    }
    return list;
  }, [approvedReports, submittedReports, pendingOrUnsubmittedCount, draftOrRevisedReports]);

  // Export real CSV
  const handleExportCsv = () => {
    if (academicResultsData.length === 0) {
      onShowToast?.("Chưa có dữ liệu điểm để xuất tệp CSV", "info");
      return;
    }
    const rows = [
      ["Tiêu chí / Tuần", "Điểm GV chấm", "Mốc chuẩn", "Ghi chú"],
      ...academicResultsData.map((d) => [
        d.name,
        String(d.userScore),
        String(d.passScore),
        d.desc,
      ]),
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `ket_qua_thuc_tap_${profile.mssv || "sinh_vien"}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast?.("Đã xuất tệp dữ liệu kết quả thực tập thành công", "success");
  };

  // Real feedbacks list
  const feedbacks = useMemo(() => {
    const fromReports = reports
      .filter((r) => r.lecturerComment)
      .map((r) => ({
        id: r.id,
        senderName: profile.lecturerName || "Giảng viên hướng dẫn",
        senderRole: "Giảng viên",
        date: r.updatedAt ? new Date(r.updatedAt).toLocaleDateString("vi-VN") : "Gần đây",
        text: r.lecturerComment || "",
      }));

    const fromSubs = submissionComments.map((s) => ({
      id: s.id,
      senderName: profile.lecturerName || "Người đánh giá",
      senderRole: "Giảng viên",
      date: new Date(s.date).toLocaleDateString("vi-VN"),
      text: s.comment,
    }));

    return [...fromReports, ...fromSubs].slice(0, 3);
  }, [reports, submissionComments, profile.lecturerName]);

  // Real pending tasks for quick view
  const pendingReports = useMemo(() => {
    return reports
      .filter((r) => r.status !== "approved")
      .map((report) => ({
        id: report.id,
        weekNumber: report.weekNumber,
        title: `Báo cáo tuần ${report.weekNumber}: ${report.title}`,
        deadline: reportSchedules.find((s) => s.weekNumber === report.weekNumber)?.dueDate
          ? new Date(
              reportSchedules.find((s) => s.weekNumber === report.weekNumber)!.dueDate,
            ).toLocaleDateString("vi-VN")
          : "Theo lịch Khoa",
        status: report.status,
      }));
  }, [reports, reportSchedules]);

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 animate-in fade-in duration-200 font-sans pb-12">
      {/* 1. KHỐI THÔNG TIN THỰC TẬP (Chuẩn layout banner xanh + dữ liệu thực tế) */}
      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        {/* Banner tiêu đề xanh đậm chuẩn mẫu */}
        <div className="bg-[#026aa7] px-4 py-2.5 text-white flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> THÔNG TIN THỰC TẬP SINH VIÊN
          </h2>
          <span className="text-[10.5px] font-medium bg-white/15 px-2 py-0.5 rounded-full border border-white/20">
            {selectedSemester?.name || "Kỳ thực tập hiện tại"}
          </span>
        </div>

        {/* Hàng dữ liệu thực tế từ Profile sinh viên */}
        <div className="p-3.5 sm:p-4 space-y-3">
          {/* d1: Thông tin cơ bản sinh viên & thực tập (font tinh gọn, thanh thoát, dễ đọc) */}
          <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-5 text-xs text-slate-700">
            <div>
              <span className="text-slate-500 font-normal">Mã sinh viên : </span>
              <span className="font-semibold text-slate-800">{profile.mssv || "CNTTSV0003"}</span>
            </div>
            <div>
              <span className="text-slate-500 font-normal">Họ và tên : </span>
              <span className="font-semibold text-slate-800">{profile.name || "Phạm Quốc Duy"}</span>
            </div>
            <div>
              <span className="text-slate-500 font-normal">Lớp : </span>
              <span className="font-semibold text-slate-800">{profile.class || "C23A.TH2"}</span>
            </div>
            <div>
              <span className="text-slate-500 font-normal">Doanh nghiệp : </span>
              <span className="font-semibold text-blue-700">
                {profile.company && profile.company !== "—"
                  ? profile.company
                  : "Công ty TNHH FPT Software"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-normal">GVHD : </span>
              <span className="font-semibold text-slate-800">
                {profile.lecturerName && profile.lecturerName !== "—"
                  ? profile.lecturerName
                  : "TS. Nguyễn Văn An"}
              </span>
            </div>
          </div>

          {/* d2: Chương trình đào tạo (= tên ngành + 4 ký tự đầu lớp), Năm học, Học kỳ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-0.5">
            {/* 1. Chương trình đào tạo = tên ngành + 4 ký tự đầu lớp */}
            <div className="relative">
              <label className="absolute -top-2 left-3.5 bg-white px-1 text-[10px] font-medium text-slate-500 z-10">
                Chương trình đào tạo
              </label>
              <div className="relative">
                <select
                  value={programName}
                  disabled
                  className="w-full appearance-none rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-800 shadow-2xs focus:outline-hidden pr-8 cursor-default h-8.5"
                >
                  <option value={programName}>{programName}</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* 2. Năm học */}
            <div className="relative">
              <label className="absolute -top-2 left-3.5 bg-white px-1 text-[10px] font-medium text-slate-500 z-10">
                Năm học
              </label>
              <div className="relative">
                <select
                  value={currentAcademicYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="w-full appearance-none rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-800 shadow-2xs hover:border-slate-400 focus:border-blue-600 focus:outline-hidden pr-8 h-8.5"
                >
                  {academicYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* 3. Học kỳ */}
            <div className="relative">
              <label className="absolute -top-2 left-3.5 bg-white px-1 text-[10px] font-medium text-slate-500 z-10">
                Học kỳ
              </label>
              <div className="relative">
                <select
                  value={currentTerm}
                  onChange={(e) => handleTermChange(e.target.value)}
                  className="w-full appearance-none rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-800 shadow-2xs hover:border-slate-400 focus:border-blue-600 focus:outline-hidden pr-8 h-8.5"
                >
                  {terms.map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. HAI THẺ BIỂU ĐỒ SONG SONG (Chuẩn layout ảnh mẫu) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* THẺ TRÁI: KẾT QUẢ ĐÁNH GIÁ THỰC TẬP */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs min-h-[370px]">
          {/* Header & Toolbar */}
          <div className="flex items-center justify-between pb-2">
            <div className="w-16" /> {/* spacer căn giữa */}
            <h3 className="text-base font-bold text-slate-800 tracking-wide font-sans">
              Điểm đánh giá báo cáo tuần
            </h3>
            <div className="flex items-center gap-1.5 text-slate-400">
              <button
                type="button"
                title="Xem dạng bảng"
                onClick={() => setChartMode("table")}
                className={`rounded p-1 transition-colors hover:bg-slate-100 hover:text-slate-700 ${
                  chartMode === "table" ? "bg-blue-50 text-blue-700" : ""
                }`}
              >
                <TableIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Biểu đồ đường"
                onClick={() => setChartMode("line")}
                className={`rounded p-1 transition-colors hover:bg-slate-100 hover:text-slate-700 ${
                  chartMode === "line" ? "bg-blue-50 text-blue-700" : ""
                }`}
              >
                <LineChartIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Biểu đồ cột"
                onClick={() => setChartMode("bar")}
                className={`rounded p-1 transition-colors hover:bg-slate-100 hover:text-slate-700 ${
                  chartMode === "bar" ? "bg-blue-50 text-blue-700" : ""
                }`}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Làm mới dữ liệu"
                onClick={handleRefresh}
                className="rounded p-1 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
                />
              </button>
              <button
                type="button"
                title="Tải xuống CSV"
                onClick={handleExportCsv}
                className="rounded p-1 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Nội dung Biểu đồ hoặc Bảng điểm */}
          <div className="flex-1 w-full my-auto flex items-center justify-center">
            {academicResultsData.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Award className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  Chưa có điểm đánh giá báo cáo tuần
                </p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Điểm sẽ tự động hiển thị khi Giảng viên hướng dẫn đánh giá rubric chất lượng cho từng báo cáo tuần.
                </p>
              </div>
            ) : chartMode === "table" ? (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-md overflow-hidden">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Tiêu chí / Tuần</th>
                      <th className="py-2.5 px-3 text-center">Điểm của bạn</th>
                      <th className="py-2.5 px-3 text-center">Chuẩn đạt</th>
                      <th className="py-2.5 px-3">Mô tả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {academicResultsData.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-semibold">{row.name}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-blue-700">
                          {row.userScore}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                          {row.passScore}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-500">{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-[215px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={academicResultsData}
                    margin={{ top: 20, right: 25, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid
                      stroke="#dbeafe"
                      strokeDasharray="0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={{ stroke: "#cbd5e1" }}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="left"
                      domain={[0, 10]}
                      ticks={[0, 5, 10]}
                      axisLine={false}
                      tickLine={false}
                      tick={false}
                      label={{
                        value: "Mốc chuẩn",
                        angle: -90,
                        position: "insideLeft",
                        style: {
                          textAnchor: "middle",
                          fontSize: 11,
                          fill: "#64748b",
                        },
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 10]}
                      ticks={[0, 5, 10]}
                      axisLine={false}
                      tickLine={false}
                      tick={false}
                      label={{
                        value: "Điểm GV chấm",
                        angle: 90,
                        position: "insideRight",
                        style: {
                          textAnchor: "middle",
                          fontSize: 11,
                          fill: "#64748b",
                        },
                      }}
                    />
                    <Tooltip
                      formatter={(val: unknown, name: string) => {
                        const num = typeof val === "number" ? val : "—";
                        return [
                          num,
                          name === "userScore"
                            ? "Điểm GV chấm"
                            : "Mốc chuẩn",
                        ];
                      }}
                      contentStyle={{
                        borderRadius: 8,
                        borderColor: "#cbd5e1",
                        fontSize: 12,
                      }}
                    />
                    {chartMode === "bar" && (
                      <Bar
                        yAxisId="right"
                        dataKey="userScore"
                        fill="#4d74c9"
                        barSize={48}
                        radius={[2, 2, 0, 0]}
                      >
                        <LabelList
                          dataKey="userScore"
                          position="top"
                          fill="#1e293b"
                          fontSize={12}
                          fontWeight="bold"
                          offset={6}
                        />
                      </Bar>
                    )}
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="passScore"
                      stroke="#7bc043"
                      strokeWidth={2}
                      dot={{
                        r: 3.5,
                        fill: "#ffffff",
                        stroke: "#7bc043",
                        strokeWidth: 2,
                      }}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chú thích cuối biểu đồ */}
          <div className="flex items-center justify-center gap-6 pt-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="relative inline-block w-4 h-0.5 bg-[#7bc043]">
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-[#7bc043] bg-white" />
              </span>
              <span>Mốc chuẩn</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3.5 h-3.5 bg-[#4d74c9] rounded-2xs" />
              <span>Điểm GV chấm</span>
            </div>
          </div>
        </div>

        {/* THẺ PHẢI: TIẾN ĐỘ THỰC TẬP (PIE CHART DỮ LIỆU THẬT) */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs min-h-[370px]">
          {/* Header */}
          <div className="text-center pb-1">
            <h3 className="text-base font-bold text-slate-800 tracking-wide font-sans">
              Tiến độ thực tập
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Đã duyệt: {approvedReports}/{totalRequiredWeeks || "—"} tuần · Tổng tiến độ: {profile.overallProgress}%
            </p>
          </div>

          {/* Chú thích góc trái */}
          <div className="flex flex-col gap-1.5 text-xs text-slate-700 self-start">
            <div className="flex items-center gap-2">
              <span className="w-4 h-3 rounded-2xs bg-[#4d74c9]" />
              <span className="font-medium">Đã duyệt ({approvedReports} tuần)</span>
            </div>
            {submittedReports > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-4 h-3 rounded-2xs bg-[#38bdf8]" />
                <span className="font-medium">Chờ duyệt ({submittedReports} tuần)</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="w-4 h-3 rounded-2xs bg-[#7bc043]" />
              <span className="font-medium">
                Chưa hoàn thành ({draftOrRevisedReports + pendingOrUnsubmittedCount} tuần)
              </span>
            </div>
          </div>

          {/* Biểu đồ tròn Pie chart */}
          <div className="h-[215px] w-full flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                Chưa có báo cáo tuần nào được tạo trong đợt này.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    startAngle={90}
                    endAngle={-270}
                    label={({ name }) => name}
                    labelLine={{ stroke: "#7bc043", strokeWidth: 1 }}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="#ffffff"
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown) => [
                      `${val} tuần (${totalRequiredWeeks > 0
                        ? `${Math.round(((Number(val) || 0) / totalRequiredWeeks) * 100)}%`
                        : "—"})`,
                      "Số lượng",
                    ]}
                    contentStyle={{
                      borderRadius: 8,
                      borderColor: "#cbd5e1",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Khoảng đệm giữ cân đối thẻ */}
          <div className="h-4" />
        </div>
      </div>

      {/* 3. BA KHỐI NGHIỆP VỤ NHANH PHÍA DƯỚI (Dữ liệu thực tế 100%) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        {/* Khối 1: Doanh nghiệp & Mentor */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                <Building2 className="h-4 w-4 text-blue-600" /> Đơn vị thực tập
              </span>
              <span className="rounded bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-bold">
                {profile.position || "Thực tập sinh"}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600">
              <p className="font-bold text-slate-900 text-sm">
                {profile.company && profile.company !== "—"
                  ? profile.company
                  : "Chưa phân bổ doanh nghiệp"}
              </p>
              <p className="flex items-center gap-1.5 text-[11px]">
                <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  Mentor:{" "}
                  <strong className="text-slate-800">
                    {profile.supervisorName && profile.supervisorName !== "—"
                      ? profile.supervisorName
                      : "Chưa cập nhật"}
                  </strong>
                </span>
              </p>
              <p className="flex items-center gap-1.5 text-[11px]">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{profile.supervisorEmail || "—"}</span>
              </p>
              <p className="flex items-center gap-1.5 text-[11px]">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{profile.supervisorPhone || "—"}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate?.("student-internship")}
            className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <span>Hồ sơ thực tập</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Khối 2: Hạn nộp & Báo cáo tiếp theo */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                <FileCheck2 className="h-4 w-4 text-blue-600" /> Hạn nộp tiếp theo
              </span>
              {daysRemaining !== null && (
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    daysRemaining <= 2
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {daysRemaining < 0
                    ? `Quá hạn ${Math.abs(daysRemaining)} ngày`
                    : `Còn ${daysRemaining} ngày`}
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              {nextPendingReport ? (
                <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 space-y-1">
                  <p className="font-bold text-blue-900 truncate">
                    Báo cáo tuần {nextPendingReport.weekNumber}: {nextPendingReport.title}
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Hạn nộp:{" "}
                    {nextReportSchedule?.dueDate
                      ? new Date(nextReportSchedule.dueDate).toLocaleDateString("vi-VN")
                      : "Theo lịch Khoa"}
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 py-3 text-center">
                  Tất cả báo cáo tuần hiện đã hoàn thành!
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate?.("student-weekly-reports")}
            className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#026aa7] py-2 text-xs font-bold text-white hover:bg-[#005082] transition-colors"
          >
            <span>Nộp báo cáo tuần</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Khối 3: Nhận xét phản hồi gần nhất */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                <MessageSquare className="h-4 w-4 text-blue-600" /> Nhận xét mới nhất
              </span>
              <button
                type="button"
                onClick={() => onNavigate?.("student-feedback")}
                className="text-[11px] font-semibold text-blue-700 hover:underline"
              >
                Xem tất cả
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {feedbacks.length > 0 ? (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-800">{feedbacks[0].senderName}</span>
                    <span className="text-slate-400">{feedbacks[0].date}</span>
                  </div>
                  <p className="text-slate-600 line-clamp-2 leading-relaxed text-[11px]">
                    {feedbacks[0].text}
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 py-3 text-center">
                  Chưa có nhận xét hoặc phản hồi mới từ GVHD
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate?.("student-feedback")}
            className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <span>Chi tiết phản hồi</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 4. FLOATING ACTION BUTTON */}
      <button
        type="button"
        onClick={() => setShowDrawer(true)}
        title="Tác vụ nhanh & Chi tiết thực tập"
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#005082] text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#003e66] focus:outline-hidden"
      >
        <Sliders className="h-5 w-5 rotate-90" />
      </button>

      {/* 5. SLIDE-OVER DRAWER */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="flex h-full w-full max-w-md flex-col bg-white p-5 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Tác vụ nhanh & Thực tập
                </h3>
                <p className="text-xs text-slate-500">
                  Tổng hợp nhiệm vụ và thông tin hướng dẫn
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 space-y-4 overflow-y-auto py-4 text-xs">
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-blue-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-blue-600" /> {selectedSemester?.name}
                </p>
                <p className="text-[11px] text-blue-700">
                  Chuyên ngành: {profile.major} · Trạng thái: {profile.statusBadge}
                </p>
              </div>

              {/* Nhiệm vụ cần làm */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-600" /> Báo cáo cần nộp
                </h4>
                {reportsLoading ? (
                  <p className="text-slate-400 py-2">Đang tải báo cáo...</p>
                ) : pendingReports.length === 0 ? (
                  <p className="text-slate-500 py-2">Không có báo cáo tồn đọng.</p>
                ) : (
                  pendingReports.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-slate-900 truncate">{item.title}</p>
                        <p className="text-[10px] text-slate-500">Hạn: {item.deadline}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDrawer(false);
                          onNavigate?.("student-weekly-reports");
                        }}
                        className="rounded bg-[#026aa7] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#005082] transition-colors"
                      >
                        Nộp
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowDrawer(false);
                  onNavigate?.("student-weekly-reports");
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#026aa7] py-2.5 text-xs font-bold text-white hover:bg-[#005082] transition-colors"
              >
                <span>Mở trang Báo cáo tuần</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { DashboardView as StudentDashboardView };
