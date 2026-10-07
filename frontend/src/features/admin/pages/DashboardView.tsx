import { useEffect, useMemo, useState } from "react";
import { useSemester, toApiSemesterId, toApiDepartmentId } from "../../../contexts/SemesterContext";
import type { ToastType } from "../../../contexts/ToastContext";
import {
  ChevronDown,
  BarChart3,
  Download,
  LineChart as LineChartIcon,
  RefreshCw,
  ArrowUpRight,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Users,
  ShieldCheck,
  Table as TableIcon,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel } from "../../../components/common/Panel";
import { AdminKpiSection } from "../components/KpiSection";
import { WorkloadOverviewCard } from "../components/cards/WorkloadOverviewCard";
import { AdminActivityTimeline } from "../components/ActivityTimeline";
import {
  buildAssignmentStatusSlices,
  buildInternshipStatusTrend,
  DashboardTrendChart,
} from "../../../components/common/DashboardCharts";
import { useAdminDashboardStats } from "../../../hooks/useAdminDashboardStats";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import { useAuth } from "../../../hooks/useAuth";
import { internshipGradingService, type GradingSummaryResponse } from "../../../services/internshipGrading.service";
import { getApiErrorMessage } from "../../../lib/apiClient";

type SemesterChartMode = "table" | "line" | "bar";

const ASSIGNMENT_CHART_COLORS = ["#4d74c9", "#38bdf8"];

export const DashboardView = ({
  onShowToast,
  onNavigateTab,
}: {
  onShowToast: (msg: string, type?: ToastType) => void;
  onNavigateTab: (tab: string) => void;
}) => {
  const { user } = useAuth();
  const { isSuperAdmin, roleDisplayLabel } = useAdminCapabilities();
  const [semesterChartMode, setSemesterChartMode] = useState<SemesterChartMode>("bar");
  const {
    semesters,
    selectedSemester,
    activeSemesterId,
    departments,
    selectedDepartmentId,
    selectedDepartment,
    selectSemester,
    selectDepartment,
  } = useSemester();
  const displayName = user?.name || user?.username || roleDisplayLabel;
  const { stats, isLoading, updatedAt, reload } = useAdminDashboardStats(
    true,
    toApiSemesterId(selectedSemester?.id),
    onShowToast,
    toApiDepartmentId(selectedDepartmentId),
    isSuperAdmin,
  );

  const departmentIdFilter = toApiDepartmentId(selectedDepartmentId);
  const reportSemesterId = toApiSemesterId(selectedSemester?.id) ?? toApiSemesterId(activeSemesterId);
  const reportSemesterName = selectedSemester?.id && selectedSemester.id !== "all"
    ? selectedSemester.name
    : semesters.find((semester) => semester.id === activeSemesterId)?.name ?? "Chưa cập nhật";
  const academicYears = [...new Set(semesters.map((semester) => semester.academicYear).filter(Boolean))].sort();
  const terms = [...new Set(semesters.map((semester) => semester.term).filter(Boolean))].sort();

  const handleAcademicYearChange = (academicYear: string) => {
    const matchingSemester =
      semesters.find(
        (semester) =>
          semester.academicYear === academicYear &&
          semester.term === selectedSemester.term,
      ) ?? semesters.find((semester) => semester.academicYear === academicYear);
    if (matchingSemester) selectSemester(matchingSemester.id);
  };

  const handleTermChange = (term: string) => {
    const matchingSemester =
      semesters.find(
        (semester) =>
          semester.term === term &&
          semester.academicYear === selectedSemester.academicYear,
      ) ?? semesters.find((semester) => semester.term === term);
    if (matchingSemester) selectSemester(matchingSemester.id);
  };
  const [semesterReport, setSemesterReport] = useState<GradingSummaryResponse | null>(null);
  const [semesterReportLoading, setSemesterReportLoading] = useState(false);
  const [semesterReportError, setSemesterReportError] = useState<string | null>(null);

  useEffect(() => {
    if (isSuperAdmin || !reportSemesterId) {
      setSemesterReport(null);
      setSemesterReportError(null);
      setSemesterReportLoading(false);
      return;
    }

    let cancelled = false;
    setSemesterReportLoading(true);
    setSemesterReportError(null);
    internshipGradingService.getSummary(reportSemesterId)
      .then((summary) => {
        if (!cancelled) setSemesterReport(summary);
      })
      .catch((error) => {
        if (!cancelled) {
          setSemesterReport(null);
          setSemesterReportError(getApiErrorMessage(error));
        }
      })
      .finally(() => {
        if (!cancelled) setSemesterReportLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, reportSemesterId]);

  const semesterReportMetrics = useMemo(() => {
    const students = semesterReport?.students ?? [];
    const companies = new Set(
      students.map((student) => student.companyName?.trim()).filter((name): name is string => Boolean(name)),
    );
    const statuses = students.flatMap((student) => [
      ...student.weeks.map((week) => week.status),
      student.finalReportStatus,
    ]);
    const onTime = statuses.filter((status) => status === "on_time").length;
    const late = statuses.filter((status) => status === "late").length;
    const missing = statuses.filter((status) => status === "missing").length;
    const dueCount = onTime + late + missing;

    return {
      studentCount: students.length,
      companyCount: companies.size,
      onTime,
      late,
      missing,
      dueCount,
      onTimeRate: dueCount > 0 ? Math.round((onTime / dueCount) * 100) : null,
    };
  }, [semesterReport]);

  const handleRefresh = async () => {
    if (isLoading) return;
    await reload();
    onShowToast("Đã làm mới dữ liệu tổng quan!");
  };

  const handleDownloadSemesterChart = () => {
    if (semesterComparison.length === 0) {
      onShowToast("Chưa có dữ liệu học kỳ để tải xuống", "info");
      return;
    }
    const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [
      ["Học kỳ", "Sinh viên", "Đã phân công", "Doanh nghiệp"],
      ...semesterComparison.map((semester) => [
        semester.label,
        semester.students,
        semester.placed,
        semester.companies,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "so-sanh-hoc-ky.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const assignmentSlices = stats
    ? buildAssignmentStatusSlices(stats.assignedStudents, stats.unassignedStudents)
    : [];
  const internshipTrend = stats
    ? buildInternshipStatusTrend(stats.internshipStats)
    : [];
  const actionItems = stats?.actionItems ?? [];
  const semesterComparison = semesters.map((semester) => ({
    id: semester.id,
    label: semester.name,
    students: semester.studentsCount,
    placed: semester.placedStudents,
    companies: semester.companiesCount,
  }));
  const outcomeSlices = stats
    ? [
      { name: "Hoàn thành", value: stats.internshipStats.completed, tone: "emerald" as const },
      { name: "Đã chấm", value: stats.internshipStats.graded, tone: "blue" as const },
      { name: "Cần bổ sung", value: stats.internshipStats.requiresRevision, tone: "amber" as const },
    ].filter((item) => item.value > 0)
    : [];
  const dashboardSlices = isSuperAdmin ? outcomeSlices : assignmentSlices;
  const toneClass = {
    amber: "text-[#f59e0b]",
    blue: "text-[#4d74c9]",
    emerald: "text-[#7bc043]",
  } as const;

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 pb-12 font-sans">
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#026aa7] px-4 py-2.5 text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-white/90" />
            <h1 className="text-xs font-bold tracking-wider sm:text-sm">
              {isSuperAdmin
                ? "CỔNG THÔNG TIN QUẢN TRỊ HỆ THỐNG"
                : "CỔNG THÔNG TIN QUẢN TRỊ KHOA"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/20 bg-white/15 px-2 py-0.5 text-[10.5px] font-medium">
              {selectedSemester?.id ? selectedSemester.name : "Chưa có học kỳ"}
            </span>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void handleRefresh()}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-md bg-white/15 px-2.5 text-[11px] font-medium transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
              Làm mới
            </button>
          </div>
        </div>

        <div className="space-y-3 p-3.5 sm:p-4">
          <dl className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-xs text-slate-700">
            <div className="flex min-w-0 items-center gap-1">
              <dt className="shrink-0 text-slate-500">Quản trị viên :</dt>
              <dd className="truncate font-semibold text-slate-800" title={displayName}>{displayName}</dd>
            </div>
            <div className="flex min-w-0 items-center gap-1">
              <dt className="shrink-0 text-slate-500">Phân quyền :</dt>
              <dd className="truncate font-semibold text-slate-800">{roleDisplayLabel}</dd>
            </div>
            <div className="flex min-w-0 items-center gap-1">
              <dt className="shrink-0 text-slate-500">Đơn vị quản lý :</dt>
              <dd className="truncate font-semibold text-slate-800">
                {isSuperAdmin && !departmentIdFilter ? "Toàn trường" : selectedDepartment.name}
              </dd>
            </div>
            <div className="flex min-w-0 items-center gap-1">
              <dt className="shrink-0 text-slate-500">Cập nhật lúc :</dt>
              <dd className="truncate font-semibold text-slate-800">
                {updatedAt ? updatedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "Chưa cập nhật"}
              </dd>
            </div>
          </dl>

          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3">
            <label className="relative block text-[10px] font-medium text-slate-500">
              <span className="absolute -top-2 left-3.5 z-10 bg-white px-1">Khoa</span>
              <span className="relative block">
                <select
                  aria-label="Khoa"
                  value={selectedDepartmentId}
                  onChange={(event) => selectDepartment(event.target.value)}
                  disabled={!isSuperAdmin || departments.length === 0}
                  className="h-9 w-full appearance-none rounded-full border border-slate-300 bg-white px-3.5 pr-8 text-xs font-medium text-slate-800 shadow-2xs hover:border-slate-400 focus:border-[#026aa7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/20 disabled:cursor-default disabled:text-slate-500"
                >
                  {isSuperAdmin && <option value="all">Tất cả các khoa</option>}
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                  {departments.length === 0 && selectedDepartmentId !== "all" && (
                    <option value={selectedDepartmentId}>{selectedDepartment.name}</option>
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              </span>
            </label>
            <label className="relative block text-[10px] font-medium text-slate-500">
              <span className="absolute -top-2 left-3.5 z-10 bg-white px-1">Năm học</span>
              <span className="relative block">
                <select
                  aria-label="Năm học"
                  value={selectedSemester.id === "all" ? "" : selectedSemester.academicYear}
                  onChange={(event) => handleAcademicYearChange(event.target.value)}
                  disabled={academicYears.length === 0}
                  className="h-9 w-full appearance-none rounded-full border border-slate-300 bg-white px-3.5 pr-8 text-xs font-medium text-slate-800 shadow-2xs hover:border-slate-400 focus:border-[#026aa7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/20 disabled:cursor-default disabled:text-slate-500"
                >
                  <option value="">{academicYears.length === 0 ? "Chưa cập nhật" : "Chọn năm học"}</option>
                  {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              </span>
            </label>
            <label className="relative block text-[10px] font-medium text-slate-500">
              <span className="absolute -top-2 left-3.5 z-10 bg-white px-1">Học kỳ</span>
              <span className="relative block">
                <select
                  aria-label="Học kỳ"
                  value={selectedSemester.id === "all" ? "" : selectedSemester.term}
                  onChange={(event) => handleTermChange(event.target.value)}
                  disabled={terms.length === 0}
                  className="h-9 w-full appearance-none rounded-full border border-slate-300 bg-white px-3.5 pr-8 text-xs font-medium text-slate-800 shadow-2xs hover:border-slate-400 focus:border-[#026aa7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/20 disabled:cursor-default disabled:text-slate-500"
                >
                  <option value="">{terms.length === 0 ? "Chưa cập nhật" : "Chọn học kỳ"}</option>
                  {terms.map((term) => <option key={term} value={term}>{term}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              </span>
            </label>
          </div>
        </div>
      </section>

      {isSuperAdmin && departmentIdFilter && (
        <div className="il-accent-panel px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Phạm vi xuất báo cáo</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">
              Đang xuất theo khoa "{selectedDepartment.name}" (đồng bộ bộ lọc Khoa trên header).
            </p>
          </div>
        </div>
      )}

      <AdminKpiSection
        stats={stats}
        isLoading={isLoading}
        onCardClick={
          isSuperAdmin
            ? undefined
            : (metric) => {
              if (metric === "lecturers") onNavigateTab("admin-lecturers");
              else if (metric === "students") onNavigateTab("admin-students");
              else if (metric === "companies") onNavigateTab("admin-companies");
              else if (metric === "semesters") onNavigateTab("admin-assignments");
            }
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel className="flex min-h-[380px] flex-col rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="grid gap-3 border-b border-slate-100 pb-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <div className="text-center sm:col-start-2 sm:row-start-1">
                <h2 className="text-sm font-bold text-slate-900">
                  Quy mô và phân công theo học kỳ
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isSuperAdmin
                    ? "Tổng hợp các học kỳ trong phạm vi đã chọn"
                    : "Sinh viên, số đã phân công và doanh nghiệp · dữ liệu các học kỳ"}
                </p>
              </div>
              <div role="group" aria-label="Tùy chọn biểu đồ học kỳ" className="flex items-center justify-center gap-1 text-slate-500 sm:col-start-3 sm:row-start-1 sm:justify-self-end">
                <button
                  type="button"
                  aria-label="Xem dữ liệu dạng bảng"
                  aria-pressed={semesterChartMode === "table"}
                  onClick={() => setSemesterChartMode("table")}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] ${semesterChartMode === "table" ? "bg-[#026aa7]/5 text-[#026aa7]" : ""}`}
                >
                  <TableIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Xem biểu đồ đường"
                  aria-pressed={semesterChartMode === "line"}
                  onClick={() => setSemesterChartMode("line")}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] ${semesterChartMode === "line" ? "bg-[#026aa7]/5 text-[#026aa7]" : ""}`}
                >
                  <LineChartIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Xem biểu đồ cột"
                  aria-pressed={semesterChartMode === "bar"}
                  onClick={() => setSemesterChartMode("bar")}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] ${semesterChartMode === "bar" ? "bg-[#026aa7]/5 text-[#026aa7]" : ""}`}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Làm mới dữ liệu"
                  onClick={() => void handleRefresh()}
                  disabled={isLoading}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:cursor-wait disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </button>
                <button
                  type="button"
                  aria-label="Tải dữ liệu học kỳ dạng CSV"
                  onClick={handleDownloadSemesterChart}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
            {isLoading ? (
              <div className="flex h-[280px] items-center justify-center text-xs text-slate-500">Đang tải dữ liệu học kỳ…</div>
            ) : semesterComparison.length === 0 ? (
              <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center">
                <ClipboardCheck className="h-8 w-8 text-slate-300" aria-hidden="true" />
                <p className="text-xs font-semibold text-slate-700">Chưa có dữ liệu học kỳ</p>
                <p className="text-[11px] text-slate-500">Dữ liệu so sánh sẽ xuất hiện khi có thông tin học kỳ từ hệ thống.</p>
              </div>
            ) : semesterChartMode === "table" ? (
              <div className="my-4 max-h-[280px] overflow-auto">
                <table className="w-full min-w-[440px] text-left text-xs">
                  <thead className="sticky top-0 border-b border-slate-200 bg-white text-[11px] text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Học kỳ</th>
                      <th className="px-3 py-2 text-right font-semibold">Sinh viên</th>
                      <th className="px-3 py-2 text-right font-semibold">Đã phân công</th>
                      <th className="px-3 py-2 text-right font-semibold">Doanh nghiệp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {semesterComparison.map((semester) => (
                      <tr key={semester.id} className="text-slate-700">
                        <th scope="row" className="whitespace-nowrap px-3 py-2.5 font-semibold">{semester.label}</th>
                        <td className="px-3 py-2.5 text-right">{semester.students}</td>
                        <td className="px-3 py-2.5 text-right">{semester.placed}</td>
                        <td className="px-3 py-2.5 text-right">{semester.companies}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="my-3 h-[280px]" role="img" aria-label="So sánh số sinh viên, đã phân công và doanh nghiệp giữa các học kỳ">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={semesterComparison} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
                    <CartesianGrid stroke="#dbeafe" vertical={false} />
                    <XAxis
                      dataKey="label"
                      axisLine={{ stroke: "#94a3b8" }}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      tickFormatter={(label: string) => label.length > 16 ? `${label.slice(0, 16)}…` : label}
                    />
                    <YAxis yAxisId="count" axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                    <YAxis yAxisId="companies" orientation="right" axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [value, name]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                    {semesterChartMode === "bar" ? (
                      <>
                        <Bar yAxisId="count" dataKey="students" name="Sinh viên" fill="#4d74c9" radius={[2, 2, 0, 0]} />
                        <Line yAxisId="count" type="monotone" dataKey="placed" name="Đã phân công" stroke="#7bc043" strokeWidth={2} dot={{ r: 3.5, fill: "#ffffff", stroke: "#7bc043", strokeWidth: 2 }} />
                        <Line yAxisId="companies" type="monotone" dataKey="companies" name="Doanh nghiệp" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: "#f59e0b" }} />
                      </>
                    ) : (
                      <>
                        <Line yAxisId="count" type="monotone" dataKey="students" name="Sinh viên" stroke="#4d74c9" strokeWidth={2} dot={{ r: 3.5 }} />
                        <Line yAxisId="count" type="monotone" dataKey="placed" name="Đã phân công" stroke="#7bc043" strokeWidth={2} dot={{ r: 3.5, fill: "#ffffff", stroke: "#7bc043", strokeWidth: 2 }} />
                        <Line yAxisId="companies" type="monotone" dataKey="companies" name="Doanh nghiệp" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: "#f59e0b" }} />
                      </>
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
            {semesterComparison.length > 0 && semesterChartMode !== "table" && (
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-sm bg-[#4d74c9]" aria-hidden="true" />
                  Sinh viên
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-0.5 w-4 bg-[#7bc043]" aria-hidden="true" />
                  Đã phân công
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-0.5 w-4 bg-[#f59e0b]" aria-hidden="true" />
                  Doanh nghiệp
                </span>
              </div>
            )}
          </Panel>
          <Panel className="flex min-h-[380px] flex-col rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="border-b border-slate-100 pb-3 text-center">
                <h2 className="text-sm font-bold text-slate-900">
                  {isSuperAdmin ? "Kết quả thực tập" : "Phân bổ phân công hướng dẫn"}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isSuperAdmin
                    ? "Tổng hợp trạng thái đánh giá của kỳ đang chọn"
                    : "Sinh viên đã phân công và chưa phân công"}
                </p>
              </div>
              {isLoading ? (
                <div className="flex h-[280px] items-center justify-center text-xs text-slate-500">Đang tải dữ liệu phân công…</div>
              ) : dashboardSlices.length === 0 ? (
                <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center">
                  <Users className="h-8 w-8 text-slate-300" aria-hidden="true" />
                  <p className="text-xs font-semibold text-slate-700">
                    {isSuperAdmin ? "Chưa có dữ liệu đánh giá trong kỳ này" : "Chưa có dữ liệu phân công trong kỳ này"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {isSuperAdmin
                      ? "Kết quả sẽ hiển thị sau khi có đánh giá thực tập."
                      : "Biểu đồ sẽ hiển thị khi hệ thống có số liệu phân công."}
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className="relative my-3 h-[240px] flex-1"
                    role="img"
                    aria-label={isSuperAdmin ? "Biểu đồ kết quả đánh giá thực tập" : "Biểu đồ phân bổ sinh viên được phân công hướng dẫn"}
                  >
                    <ul className="absolute left-0 top-3 z-10 flex flex-col gap-2 text-[11px] text-slate-700">
                      {dashboardSlices.map((slice, index) => (
                        <li key={slice.name} className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 shrink-0 rounded-sm"
                            style={{
                              backgroundColor: isSuperAdmin
                                ? slice.tone === "emerald" ? "#7bc043" : slice.tone === "blue" ? "#4d74c9" : "#f59e0b"
                                : ASSIGNMENT_CHART_COLORS[index],
                            }}
                          />
                          <span>{slice.name}</span>
                        </li>
                      ))}
                  </ul>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardSlices}
                        dataKey="value"
                        nameKey="name"
                        cx="66%"
                        cy="52%"
                        outerRadius={78}
                        startAngle={90}
                        endAngle={-270}
                        label={({ name }) => name}
                        labelLine={{ stroke: "#7bc043", strokeWidth: 1 }}
                      >
                        {dashboardSlices.map((slice, index) => (
                          <Cell
                            key={slice.name}
                            fill={isSuperAdmin
                              ? slice.tone === "emerald" ? "#7bc043" : slice.tone === "blue" ? "#4d74c9" : "#f59e0b"
                              : ASSIGNMENT_CHART_COLORS[index]}
                            stroke="#ffffff"
                            strokeWidth={1}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [isSuperAdmin ? value : `${value} sinh viên`, name]}
                        contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="border-t border-slate-100 pt-3 text-center text-xs text-slate-600">
                  {isSuperAdmin ? "Tổng kết quả: " : "Tổng số sinh viên: "}
                  <strong className="font-bold text-slate-900">{dashboardSlices.reduce((sum, slice) => sum + slice.value, 0)}</strong>
                </p>
              </>
            )}
          </Panel>
        </div>

      <Panel className="rounded-xl border border-slate-200/90 shadow-2xs">
        {isLoading ? (
          <div className="flex h-[280px] items-center justify-center text-xs text-slate-500">Đang tải dữ liệu biểu đồ…</div>
        ) : !stats || internshipTrend.length === 0 ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center">
            <ClipboardCheck className="h-8 w-8 text-slate-300" aria-hidden="true" />
            <p className="text-xs font-semibold text-slate-700">Chưa có dữ liệu tình trạng thực tập</p>
            <p className="text-[11px] text-slate-500">Dữ liệu sẽ hiển thị khi có sinh viên trong kỳ.</p>
          </div>
        ) : (
          <DashboardTrendChart
            title="Sinh viên theo tình trạng thực tập"
            subtitle="Kỳ đang chọn"
            data={internshipTrend}
            valueLabel="Số sinh viên"
            variant="bar"
          />
        )}
      </Panel>

      {!isSuperAdmin && (
        <Panel className="space-y-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Tiến độ nộp hồ sơ thực tập</h2>
              <p className="mt-1 text-xs text-slate-500">{reportSemesterName} · Chỉ tính báo cáo đã đến hạn</p>
            </div>
            <ClipboardCheck className="h-4 w-4 text-[#026aa7]" aria-hidden="true" />
          </div>
          {semesterReportLoading ? (
            <p className="py-4 text-center text-xs text-slate-500">Đang tổng hợp dữ liệu kỳ…</p>
          ) : semesterReportError ? (
            <p role="alert" className="py-3 text-center text-xs text-rose-700">{semesterReportError}</p>
          ) : !semesterReport ? (
            <p className="py-3 text-center text-xs text-slate-500">Chưa có kỳ thực tập đang hoạt động.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 divide-x divide-slate-100 sm:grid-cols-4">
              <div className="px-2">
                <p className="flex items-center gap-1.5 text-xs text-slate-500"><Users className="h-3.5 w-3.5" aria-hidden="true" /> Sinh viên tham gia</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{semesterReportMetrics.studentCount}</p>
              </div>
              <div className="px-2">
                <p className="flex items-center gap-1.5 text-xs text-slate-500"><Building2 className="h-3.5 w-3.5" aria-hidden="true" /> Doanh nghiệp tiếp nhận</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{semesterReportMetrics.companyCount}</p>
              </div>
              <div className="px-2">
                <p className="flex items-center gap-1.5 text-xs text-slate-500"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Nộp đúng hạn</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{semesterReportMetrics.onTimeRate == null ? "—" : `${semesterReportMetrics.onTimeRate}%`}</p>
                <p className="text-[10px] text-slate-500">{semesterReportMetrics.onTime}/{semesterReportMetrics.dueCount} báo cáo đến hạn</p>
              </div>
              <div className="px-2">
                <p className="flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Trễ / còn thiếu</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{semesterReportMetrics.late + semesterReportMetrics.missing}</p>
                <p className="text-[10px] text-slate-500">{semesterReportMetrics.late} trễ · {semesterReportMetrics.missing} thiếu</p>
              </div>
            </div>
          )}
        </Panel>
      )}

      {!isSuperAdmin && (
        <Panel className="rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Cần xử lý
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Các mục đang thiếu dữ liệu hoặc cần thao tác
              </p>
            </div>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
              {isLoading ? "…" : `${actionItems.length} mục`}
            </span>
          </div>
          {isLoading ? (
            <p className="text-xs text-slate-500 py-4">Đang tải dữ liệu API…</p>
          ) : actionItems.length === 0 ? (
            <p className="text-xs text-[#7bc043] py-4 font-medium">
              Không có mục cần xử lý
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {actionItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onNavigateTab(item.tab)}
                    className="w-full py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="font-semibold text-xs text-slate-900">{item.title}</p>
                      <p className="text-[11px] text-slate-500">{item.subtitle}</p>
                    </div>
                    <span className={`flex items-center gap-1 font-semibold text-[11px] shrink-0 ${toneClass[item.tone]}`}>
                      Xử lý <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {!isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Panel className="lg:col-span-7">
            <WorkloadOverviewCard stats={stats} isLoading={isLoading} />
          </Panel>
          <Panel className="lg:col-span-5">
            <AdminActivityTimeline
              activities={stats?.recentActivities}
              isLoading={isLoading}
              onViewAllHistory={() => onNavigateTab("admin-notifications")}
            />
          </Panel>
        </div>
      )}
    </div>
  );
};

export { DashboardView as AdminDashboardView };
