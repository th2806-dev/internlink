import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileText,
  LineChart as LineChartIcon,
  RefreshCw,
  Table as TableIcon,
  Users,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel } from "../../../components/common/Panel";
import { LecturerPageBanner } from "../components/LecturerPageBanner";
import { RecentSubmissions } from "../components/RecentSubmissions";
import { useSemester } from "../../../contexts/SemesterContext";
import type { ActionItem, Deadline } from "../../../types/common";
import type { Submission } from "../../../types/submission";
import type { Student } from "../../../types/student";
import type { WeeklyReportDto } from "../../../types/api";
import type { LecturerProfileData } from "../../../types/appState";

const PRIORITY_CONFIG: Record<
  string,
  { dot: string; badge: string; label: string }
> = {
  danger: {
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    label: "Nghiêm trọng",
  },
  warning: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    label: "Cần phản hồi",
  },
  info: {
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    label: "Cần lưu ý",
  },
};

/** Skeleton block reused by the loading state. */
function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/80 p-5 animate-pulse ${className}`}
    >
      <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
      <div className="h-7 w-16 bg-slate-200 rounded mb-2" />
      <div className="h-2.5 w-32 bg-slate-100 rounded" />
    </div>
  );
}

export const DashboardView = ({
  profile,
  actionItems,
  deadlines,
  submissions,
  stats,
  weeklyTrendData = [],
  students = [],
  weeklyReports = [],
  isLoading = false,
  error = null,
  onShowToast,
  onNavigate,
  onRefresh,
}: {
  profile?: LecturerProfileData | null;
  actionItems: ActionItem[];
  deadlines: Deadline[];
  submissions: Submission[];
  stats: {
    total: number;
    interning: number;
    assignedCompanyCount: number;
    pending: number;
    overdue: number;
    completed: number;
    avgProg: number;
  };
  weeklyTrendData?: {
    label: string;
    value: number;
    target: number;
    rate: number;
    late: number;
    missing: number;
    pending: number;
  }[];
  students?: Student[];
  weeklyReports?: WeeklyReportDto[];
  isLoading?: boolean;
  error?: string | null;
  onShowToast: (msg: string) => void;
  onNavigate: (tab: string) => void;
  onRefresh?: () => Promise<void> | void;
}) => {
  const { activeSemesterId } = useSemester();
  const hasActiveSemester = !!activeSemesterId;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chartMode, setChartMode] = useState<"table" | "line" | "bar">("bar");

  const staffCode = profile?.staffCode || "";

  const studentsWithoutCompany = useMemo(
    () =>
      students.filter(
        (student) =>
          !student.company ||
          student.company === "Chưa có" ||
          student.company === "Chưa phân công doanh nghiệp" ||
          student.company === "—",
      ),
    [students],
  );

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
      onShowToast("Đã làm mới dữ liệu tổng quan");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Company assignment is distinct from internship status.
  const assignmentData = useMemo(() => {
    const unassignedCount = Math.max(
      0,
      stats.total - stats.assignedCompanyCount,
    );
    return [
      {
        name: "Đã có nơi thực tập",
        value: stats.assignedCompanyCount,
        color: "#4d74c9",
      },
      {
        name: "Chưa phân công doanh nghiệp",
        value: unassignedCount,
        color: "#38bdf8",
      },
    ].filter((item) => item.value > 0);
  }, [stats.total, stats.assignedCompanyCount]);
  const assignmentTotal = assignmentData.reduce(
    (total, item) => total + item.value,
    0,
  );

  // ---- Xuất file CSV tiến độ báo cáo tuần ----
  const handleExportCsv = () => {
    const headers = [
      "Tuần",
      "Đúng hạn",
      "Nộp trễ",
      "Chưa nộp",
      "Còn trong hạn",
      "Tỷ lệ đúng hạn",
      "Tổng SV theo lịch",
    ];
    const rows = weeklyTrendData.map((r) => [
      r.label,
      r.value,
      r.late,
      r.missing,
      r.pending,
      `${Math.round(r.rate)}%`,
      r.target,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      staffCode
        ? `tien_do_bao_cao_tuan_${staffCode}.csv`
        : "tien_do_bao_cao_tuan.csv",
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast("Đã xuất dữ liệu tiến độ báo cáo tuần ra tệp CSV!");
  };

  // ---- Recent activity feed (derived from real data, newest first) ----
  const recentActivity = useMemo(() => {
    type ActivityEntry = {
      id: string;
      actor: string;
      action: string;
      time: Date;
    };
    const entries: ActivityEntry[] = [];

    for (const r of weeklyReports.slice(0, 30)) {
      const ts =
        r.status === "Approved"
          ? (r.updatedAt ?? r.submittedAt)
          : (r.submittedAt ?? r.updatedAt);
      if (!ts) continue;
      const student = students.find((s) => s.id === r.internshipId);
      const approved = r.status === "Approved";
      entries.push({
        id: `act-weekly-${r.id}`,
        actor: approved ? "Bạn" : student?.name ?? "Sinh viên",
        action: approved
          ? `đã duyệt Báo cáo tuần ${r.weekNumber} của ${
              student?.name ?? "sinh viên"
            }`
          : `đã nộp Báo cáo tuần ${r.weekNumber}`,
        time: new Date(ts),
      });
    }

    for (const sub of submissions
      .filter((s) => s.sourceType !== "weeklyReport")
      .slice(0, 15)) {
      const ts = sub.submittedAt ?? null;
      if (!ts) continue;
      entries.push({
        id: `act-sub-${sub.id}`,
        actor: sub.studentName,
        action: `đã gửi ${sub.reportType}`,
        time: new Date(ts),
      });
    }

    return entries
      .filter((e) => !Number.isNaN(e.time.getTime()))
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 5);
  }, [weeklyReports, submissions, students]);

  const formatTimeAgo = (date: Date) => {
    const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMinutes < 1) return "Vừa xong";
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    const hours = Math.floor(diffMinutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  };

  // ---- Deadlines split: overdue vs upcoming ----
  const { upcomingDeadlines, overdueDeadlines } = useMemo(() => {
    const upcoming: Deadline[] = [];
    const overdue: Deadline[] = [];
    for (const d of deadlines) {
      if (d.isOverdue || (d.daysLeft != null && d.daysLeft < 0))
        overdue.push(d);
      else upcoming.push(d);
    }
    return {
      upcomingDeadlines: upcoming.slice(0, 4),
      overdueDeadlines: overdue.slice(0, 2),
    };
  }, [deadlines]);

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1300px] space-y-4 pb-12 font-sans">
        <LecturerPageBanner profile={profile} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard className="h-80" />
          <SkeletonCard className="h-80" />
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="mx-auto max-w-[1300px] space-y-4 pb-12 font-sans">
        <LecturerPageBanner profile={profile} />
        <Panel className="p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Không thể tải dữ liệu tổng quan giảng viên
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {error} — vui lòng bấm thử lại.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void onRefresh?.()}
            className="px-4 py-2 bg-[#026aa7] hover:bg-[#025a8e] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Thử lại
          </button>
        </Panel>
      </div>
    );
  }

  // Empty state: no active semester
  if (!hasActiveSemester && stats.total === 0) {
    return (
      <div className="mx-auto max-w-[1300px] space-y-4 pb-12 font-sans">
        <LecturerPageBanner
          profile={profile}
          onRefresh={onRefresh ? handleRefresh : undefined}
          isRefreshing={isRefreshing}
        />
        <Panel className="p-10 text-center space-y-4 max-w-xl mx-auto rounded-xl">
          <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center mx-auto">
            <CalendarDays className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-800">
              Chưa có kỳ thực tập đang hoạt động
            </h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              Hiện tại chưa có đợt thực tập nào được kích hoạt. Dữ liệu sẽ tự
              động hiển thị khi Quản trị viên khởi động đợt thực tập mới.
            </p>
          </div>
        </Panel>
      </div>
    );
  }

  const hasWork = actionItems.length > 0;

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 animate-in fade-in duration-200 font-sans pb-12">
      <LecturerPageBanner
        profile={profile}
        onRefresh={onRefresh ? handleRefresh : undefined}
        isRefreshing={isRefreshing}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          2. 4 THẺ KPI OVERVIEW (Chuẩn kỷ luật: Chỉ xuất hiện tại Dashboard)
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Sinh viên phụ trách */}
        <div
          onClick={() => onNavigate("students")}
          className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between transition-all hover:border-blue-300 cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Sinh viên phụ trách
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-blue-700">
                {stats.total}
              </span>
              <span className="text-xs text-slate-500 font-medium">sinh viên</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-2">
            Nhóm hướng dẫn đợt này
          </p>
        </div>

        {/* KPI 2: Đã có nơi thực tập */}
        <div
          onClick={() => onNavigate("students")}
          className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between transition-all hover:border-emerald-300 cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Đã có nơi thực tập
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-700">
                {stats.assignedCompanyCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">sinh viên</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-2">
            {stats.total > 0
              ? `${Math.round((stats.assignedCompanyCount / stats.total) * 100)}% đã tiếp nhận DN`
              : "Chưa phân công"}
          </p>
        </div>

        {/* KPI 3: Báo cáo tuần cần duyệt */}
        <div
          onClick={() => onNavigate("reports")}
          className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between transition-all hover:border-amber-300 cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Báo cáo cần duyệt
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-extrabold ${
                  stats.pending > 0 ? "text-amber-600" : "text-slate-800"
                }`}
              >
                {stats.pending}
              </span>
              <span className="text-xs text-slate-500 font-medium">bài nộp</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-2">
            {stats.pending > 0 ? "Chờ giảng viên phản hồi" : "Đã duyệt hết"}
          </p>
        </div>

        {/* KPI 4: Tiến độ trung bình */}
        <div
          onClick={() => onNavigate("students")}
          className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between transition-all hover:border-violet-300 cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Tiến độ trung bình
              </span>
              <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-violet-700">
                {stats.avgProg}%
              </span>
              <span className="text-xs text-slate-500 font-medium">hoàn thành</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-2">
            {stats.completed} sinh viên đã hoàn tất kỳ TT
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          3. HAI BIỂU ĐỒ SONG SONG CHỦ ĐẠO (Đúng cấu trúc như /student/dashboard)
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* THẺ TRÁI: TIẾN ĐỘ NỘP BÁO CÁO CÁC TUẦN */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs min-h-[380px]">
          {/* Header & Controls toolbar */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900">
                Tình hình nộp báo cáo theo tuần
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Theo dõi đúng hạn, trễ hạn, chưa nộp và còn trong hạn.
              </p>
            </div>
            <div
              role="group"
              aria-label="Tùy chọn biểu đồ báo cáo tuần"
              className="flex shrink-0 items-center gap-1 text-slate-500"
            >
              <button
                type="button"
                aria-label="Xem dữ liệu dạng bảng"
                aria-pressed={chartMode === "table"}
                onClick={() => setChartMode("table")}
                className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-md transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  chartMode === "table" ? "bg-blue-50 text-blue-700" : ""
                }`}
              >
                <TableIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Xem biểu đồ đường"
                aria-pressed={chartMode === "line"}
                onClick={() => setChartMode("line")}
                className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-md transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  chartMode === "line" ? "bg-blue-50 text-blue-700" : ""
                }`}
              >
                <LineChartIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Xem biểu đồ cột"
                aria-pressed={chartMode === "bar"}
                onClick={() => setChartMode("bar")}
                className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-md transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  chartMode === "bar" ? "bg-blue-50 text-blue-700" : ""
                }`}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Làm mới dữ liệu"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
                />
              </button>
              <button
                type="button"
                aria-label="Tải dữ liệu báo cáo tuần dạng CSV"
                onClick={handleExportCsv}
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Nội dung Biểu đồ hoặc Bảng */}
          <div className="flex-1 w-full my-auto flex items-center justify-center py-2">
            {weeklyTrendData.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  Chưa có dữ liệu tiến độ nộp báo cáo
                </p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Dữ liệu sẽ xuất hiện khi học kỳ có lịch báo cáo tuần đang mở.
                </p>
              </div>
            ) : chartMode === "table" ? (
              <div className="w-full overflow-x-auto max-h-[230px]">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Tuần</th>
                      <th className="py-2 px-3 text-center">Đúng hạn</th>
                      <th className="py-2 px-3 text-center">Nộp trễ</th>
                      <th className="py-2 px-3 text-center">Chưa nộp</th>
                      <th className="py-2 px-3 text-center">Còn trong hạn</th>
                      <th className="py-2 px-3 text-center">Tỷ lệ đúng hạn</th>
                      <th className="py-2 px-3 text-center">Tổng theo lịch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {weeklyTrendData.map((row) => {
                      return (
                        <tr key={row.label} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-semibold">{row.label}</td>
                          <td className="py-2 px-3 text-center font-bold text-blue-700">
                            {row.value}
                          </td>
                          <td className="py-2 px-3 text-center font-medium text-amber-600">
                            {row.late}
                          </td>
                          <td className="py-2 px-3 text-center font-medium text-slate-400">
                            {row.missing}
                          </td>
                          <td className="py-2 px-3 text-center font-medium text-slate-600">
                            {row.pending}
                          </td>
                          <td className="py-2 px-3 text-center font-semibold text-emerald-700">
                            {Math.round(row.rate)}%
                          </td>
                          <td className="py-2 px-3 text-center font-medium text-slate-600">
                            {row.target}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                className="h-[250px] w-full"
                role="img"
                aria-label="Biểu đồ số sinh viên nộp báo cáo theo tuần và trạng thái"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={weeklyTrendData}
                    margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      stroke="#dbeafe"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickMargin={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      allowDecimals={false}
                      width={32}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value} sinh viên`,
                        name,
                      ]}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={40}
                      iconType="circle"
                      wrapperStyle={{ fontSize: 11 }}
                    />
                    {chartMode === "bar" ? (
                      <>
                        <Bar
                          dataKey="value"
                          name="Đúng hạn"
                          fill="#4d74c9"
                          stackId="weekly-status"
                        />
                        <Bar
                          dataKey="late"
                          name="Nộp trễ"
                          fill="#fbbf24"
                          stackId="weekly-status"
                        />
                        <Bar
                          dataKey="missing"
                          name="Chưa nộp"
                          fill="#f59e0b"
                          stackId="weekly-status"
                        />
                        <Bar
                          dataKey="pending"
                          name="Còn trong hạn"
                          fill="#38bdf8"
                          stackId="weekly-status"
                        />
                      </>
                    ) : (
                      <>
                        <Line
                          type="linear"
                          dataKey="value"
                          name="Đúng hạn"
                          stroke="#4d74c9"
                          strokeWidth={2}
                          dot={{ r: 4, fill: "#4d74c9" }}
                        />
                        <Line
                          type="linear"
                          dataKey="late"
                          name="Nộp trễ"
                          stroke="#fbbf24"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "#fbbf24" }}
                        />
                        <Line
                          type="linear"
                          dataKey="missing"
                          name="Chưa nộp"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "#f59e0b" }}
                        />
                        <Line
                          type="linear"
                          dataKey="pending"
                          name="Còn trong hạn"
                          stroke="#38bdf8"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "#38bdf8" }}
                        />
                      </>
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

        </div>

        {/* THẺ PHẢI: PHÂN BỐ TRẠNG THÁI SINH VIÊN */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs min-h-[380px]">
          <div className="pb-1 text-center">
            <h2 className="text-sm font-bold text-slate-900">
              Phân bổ nơi thực tập
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {stats.assignedCompanyCount}/{stats.total} sinh viên đã có doanh nghiệp
            </p>
          </div>

          <div className="flex flex-1 items-center justify-center py-2">
            {assignmentTotal === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                Chưa có sinh viên nào được phân công trong đợt này.
              </div>
            ) : (
              <>
                <ul className="sr-only" aria-label="Phân bổ doanh nghiệp thực tập">
                  {assignmentData.map((item) => (
                    <li key={item.name}>
                      {item.name}: {item.value} sinh viên (
                      {Math.round((item.value / assignmentTotal) * 100)}%)
                    </li>
                  ))}
                </ul>
                <div
                  className="relative h-[250px] w-full"
                  role="img"
                  aria-label={`Biểu đồ phân bổ nơi thực tập của ${assignmentTotal} sinh viên`}
                >
                  <ul
                    aria-label="Chú giải phân bổ nơi thực tập"
                    className="absolute left-0 top-2 z-10 flex flex-col gap-2 text-[11px] text-slate-700"
                  >
                    {assignmentData.map((item) => (
                      <li key={item.name} className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-4 w-8 shrink-0 rounded"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.name}</span>
                      </li>
                    ))}
                  </ul>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assignmentData}
                        dataKey="value"
                        nameKey="name"
                        cx="60%"
                        cy="52%"
                        outerRadius={78}
                        startAngle={90}
                        endAngle={-270}
                        label={({ name }) => name}
                        labelLine={{ stroke: "#7bc043", strokeWidth: 1 }}
                      >
                        {assignmentData.map((item) => (
                          <Cell
                            key={item.name}
                            fill={item.color}
                            stroke="#ffffff"
                            strokeWidth={1}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `${value} sinh viên (${Math.round((value / assignmentTotal) * 100)}%)`,
                          name,
                        ]}
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          {/* Footer liên kết nhanh */}
          <div className="flex justify-end pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <button
              type="button"
              onClick={() => onNavigate("students")}
              className="text-[#026aa7] hover:text-[#005082] font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              Xem danh sách chi tiết <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          4. KHU VỰC NGHIỆP VỤ & TÁC VỤ GIẢNG VIÊN
         ═══════════════════════════════════════════════════════════════════ */}

      {/* Cảnh báo sinh viên chưa có nơi thực tập */}
      {studentsWithoutCompany.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <p className="text-xs font-medium text-amber-950">
              <strong>{studentsWithoutCompany.length} sinh viên</strong> chưa được
              phân công doanh nghiệp; ưu tiên hoàn tất ghép nơi thực tập cho các
              em.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("students")}
            className="shrink-0 self-start text-xs font-bold text-amber-900 underline underline-offset-2 sm:self-auto cursor-pointer"
          >
            Mở danh sách sinh viên
          </button>
        </div>
      )}

      {/* Action Center (Cần bạn xử lý) */}
      <Panel
        className={`rounded-xl border ${
          hasWork
            ? "border-amber-200 bg-amber-50/40"
            : "border-emerald-200 bg-emerald-50/40"
        } shadow-2xs`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList
                className={`w-4 h-4 ${
                  hasWork ? "text-amber-600" : "text-emerald-600"
                }`}
              />
              Cần bạn xử lý
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Những nội dung bài nộp và báo cáo tuần đang chờ bạn xem xét hoặc phản hồi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("reports")}
            className="text-[11px] font-bold text-[#026aa7] hover:text-[#005082] flex items-center gap-1 transition-colors cursor-pointer"
          >
            Xem tất cả <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {!hasWork ? (
          <div className="py-8 flex flex-col items-center gap-2 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <p className="text-sm font-bold text-slate-800">
              Không có nội dung cần xử lý
            </p>
            <p className="text-xs text-slate-500">
              Hiện không có bài nộp nào đang chờ bạn phản hồi.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {actionItems.slice(0, 6).map((item) => {
              const cfg =
                PRIORITY_CONFIG[item.priority ?? "info"] ??
                PRIORITY_CONFIG.info;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        item.type === "review" ||
                        item.type === "grade" ||
                        item.type === "reports"
                      ) {
                        onNavigate("reports");
                      } else {
                        onNavigate("students");
                      }
                    }}
                    className="w-full py-3 flex items-center gap-3 text-left hover:bg-white/70 transition-colors cursor-pointer"
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs text-slate-900 truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {item.subtitle}
                      </p>
                    </div>
                    <span
                      className={`hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold rounded-md border shrink-0 ${cfg.badge}`}
                    >
                      {cfg.label}
                    </span>
                    <span className="flex items-center gap-1 text-[#026aa7] font-semibold text-[11px] shrink-0">
                      {item.buttonText ?? "Xem"}{" "}
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* Deadlines & Hoạt động gần đây */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Hạn sắp tới */}
        <Panel className="lg:col-span-7 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                Hạn sắp tới
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Các mốc nộp báo cáo của nhóm hướng dẫn
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {upcomingDeadlines.length} mốc
            </span>
          </div>
          <ul className="divide-y divide-slate-100">
            {upcomingDeadlines.length === 0 && overdueDeadlines.length === 0 && (
              <li className="py-8 text-center text-xs text-slate-400">
                Không có hạn nào sắp tới.
              </li>
            )}
            {overdueDeadlines.map((d) => (
              <li key={d.id} className="py-3 flex items-start gap-3 text-xs">
                <span className="mt-0.5 w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                    {d.title}
                    <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-rose-50 text-rose-700 border border-rose-200">
                      Đã quá hạn
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500">{d.subtitle}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-rose-700">
                    {d.day}/{d.month}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {d.studentCount} SV
                  </p>
                </div>
              </li>
            ))}
            {upcomingDeadlines.map((d) => {
              const urgent = (d.daysLeft ?? 99) <= 3;
              return (
                <li key={d.id} className="py-3 flex items-start gap-3 text-xs">
                  <span
                    className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      urgent ? "bg-amber-500" : "bg-blue-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{d.title}</p>
                    <p className="text-[11px] text-slate-500">{d.subtitle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-900">
                      {d.day}/{d.month}
                    </p>
                    <p
                      className={`text-[10px] font-bold ${
                        urgent ? "text-amber-700" : "text-blue-700"
                      }`}
                    >
                      {d.daysLeft != null ? `Còn ${d.daysLeft} ngày` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        {/* Hoạt động gần đây */}
        <Panel className="lg:col-span-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Hoạt động gần đây
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Nhóm hướng dẫn · Mới nhất trước
              </p>
            </div>
          </div>
          {recentActivity.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              Chưa có hoạt động gần đây.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentActivity.map((a) => (
                <li key={a.id} className="py-2.5 flex items-start gap-2.5 text-xs">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <p className="text-slate-600 min-w-0">
                    <span className="font-bold text-slate-900">{a.actor}</span>{" "}
                    {a.action}
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      {formatTimeAgo(a.time)}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Bài nộp gần đây */}
      <RecentSubmissions
        submissions={submissions.slice(0, 5)}
        onViewAll={() => onNavigate("reports")}
        onReviewSubmission={() => onNavigate("reports")}
      />
    </div>
  );
};

export { DashboardView as LecturerDashboardView };
