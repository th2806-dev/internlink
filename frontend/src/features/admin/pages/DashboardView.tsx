import { useEffect, useMemo, useState } from "react";
import { useSemester, toApiSemesterId, toApiDepartmentId } from "../../../contexts/SemesterContext";
import type { ToastType } from "../../../contexts/ToastContext";
import {
  LayoutDashboard,
  RefreshCw,
  ArrowUpRight,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Users,
} from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { AdminKpiSection } from "../components/KpiSection";
import { WorkloadOverviewCard } from "../components/cards/WorkloadOverviewCard";
import { AdminActivityTimeline } from "../components/ActivityTimeline";
import {
  buildInternshipStatusTrend,
  DashboardDonutChart,
  DashboardSemesterComparisonChart,
  DashboardTrendChart,
} from "../../../components/common/DashboardCharts";
import { useAdminDashboardStats } from "../../../hooks/useAdminDashboardStats";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import { internshipGradingService, type GradingSummaryResponse } from "../../../services/internshipGrading.service";
import { getApiErrorMessage } from "../../../lib/apiClient";

export const DashboardView = ({
  onShowToast,
  onNavigateTab,
}: {
  onShowToast: (msg: string, type?: ToastType) => void;
  onNavigateTab: (tab: string) => void;
}) => {
  const { isSuperAdmin } = useAdminCapabilities();
  const { semesters, selectedSemester, activeSemesterId, selectedDepartmentId, selectedDepartment } = useSemester();
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
    : semesters.find((semester) => semester.id === activeSemesterId)?.name ?? "Kỳ đang hoạt động";
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

  const subtitle = updatedAt
    ? `Cập nhật lúc ${updatedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
    : "Đang tải dữ liệu…";

  const internshipTrend = stats
    ? buildInternshipStatusTrend(stats.internshipStats)
    : [];
  const actionItems = stats?.actionItems ?? [];
  const semesterComparison = semesters.map((semester) => ({
    label: semester.name.length > 16 ? `${semester.name.slice(0, 16)}…` : semester.name,
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
  const toneClass = {
    amber: "text-amber-700",
    blue: "text-[#1d4ed8]",
    emerald: "text-emerald-700",
  } as const;

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto">
      <PageHeader
        icon={LayoutDashboard}
        title={
          isSuperAdmin && !departmentIdFilter
            ? "Tổng quan hệ thống"
            : departmentIdFilter
              ? `Tổng quan khoa ${selectedDepartment.name}`
              : "Tổng quan"
        }
        subtitle={subtitle}
        actions={[
          {
            label: isLoading ? "Đang làm mới…" : "Làm mới",
            icon: RefreshCw,
            onClick: () => void handleRefresh(),
            variant: "secondary",
            disabled: isLoading,
            loading: isLoading,
          },
        ]}
      />

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

      {!isSuperAdmin && (
        <Panel className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Tiến độ nộp hồ sơ thực tập</h2>
              <p className="mt-1 text-xs text-slate-500">{reportSemesterName} · Chỉ tính báo cáo đã đến hạn</p>
            </div>
            <ClipboardCheck className="h-4 w-4 text-blue-700" />
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
                <p className="flex items-center gap-1.5 text-xs text-slate-500"><Users className="h-3.5 w-3.5" /> Sinh viên tham gia</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{semesterReportMetrics.studentCount}</p>
              </div>
              <div className="px-2">
                <p className="flex items-center gap-1.5 text-xs text-slate-500"><Building2 className="h-3.5 w-3.5" /> Doanh nghiệp tiếp nhận</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{semesterReportMetrics.companyCount}</p>
              </div>
              <div className="px-2">
                <p className="flex items-center gap-1.5 text-xs text-slate-500"><CheckCircle2 className="h-3.5 w-3.5" /> Nộp đúng hạn</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{semesterReportMetrics.onTimeRate == null ? "—" : `${semesterReportMetrics.onTimeRate}%`}</p>
                <p className="text-[10px] text-slate-500">{semesterReportMetrics.onTime}/{semesterReportMetrics.dueCount} báo cáo đến hạn</p>
              </div>
              <div className="px-2">
                <p className="flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" /> Trễ / còn thiếu</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">{semesterReportMetrics.late + semesterReportMetrics.missing}</p>
                <p className="text-[10px] text-slate-500">{semesterReportMetrics.late} trễ · {semesterReportMetrics.missing} thiếu</p>
              </div>
            </div>
          )}
        </Panel>
      )}

      <div className="il-accent-panel px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
            {isSuperAdmin ? "Phạm vi giám sát" : "Bức tranh vận hành"}
          </p>
          <p className="text-sm font-semibold text-slate-900 mt-0.5">
            {isSuperAdmin
              ? departmentIdFilter
                ? `Tổng hợp số liệu của ${selectedDepartment.name}.`
                : "Tổng hợp số liệu toàn hệ thống theo kỳ đang chọn."
              : "Theo dõi nhanh nguồn lực, tiến độ và các điểm cần can thiệp."}
          </p>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">Dữ liệu theo kỳ đang chọn</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Panel className={isSuperAdmin ? "lg:col-span-12" : "lg:col-span-8"}>
          <DashboardTrendChart
            title="Phân bổ sinh viên theo trạng thái"
            subtitle="Số lượng sinh viên trong đợt thực tập đang chọn"
            data={isLoading ? [] : internshipTrend}
            valueLabel="Số sinh viên"
            variant="bar"
          />
        </Panel>
        {!isSuperAdmin && <Panel className="lg:col-span-4">
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
            <p className="text-xs text-emerald-700 py-4 font-medium">
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
        </Panel>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Panel className="lg:col-span-8">
          <DashboardSemesterComparisonChart data={semesterComparison} />
        </Panel>
        <Panel className="lg:col-span-4">
          <DashboardDonutChart
            title="Kết quả thực tập"
            subtitle="Tổng hợp trạng thái đánh giá của kỳ đang chọn"
            data={
              outcomeSlices.length > 0
                ? outcomeSlices
                : [{ name: "Chưa có dữ liệu", value: 1, tone: "slate" as const }]
            }
          />
        </Panel>
      </div>

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
