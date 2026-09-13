import { useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import type { ToastType } from "../../../contexts/ToastContext";
import {
  LayoutDashboard,
  RefreshCw,
  Download,
  ArrowUpRight,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
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
import { exportAdminDashboardReport } from "../../../lib/adminDashboardExport";
import { exportService } from "../../../services/export.service";
import { useSemester, toApiSemesterId } from "../../../contexts/SemesterContext";

const EXPORT_DEPARTMENTS = [
  { value: "", label: "Tất cả Khoa" },
  { value: "CNTT", label: "CNTT" },
  { value: "QTKD", label: "QTKD" },
  { value: "Du lịch", label: "Du lịch" },
  { value: "Ngoại ngữ", label: "Ngoại ngữ" },
];

export const DashboardView = ({
  onShowToast,
  onNavigateTab,
}: {
  onShowToast: (msg: string, type?: ToastType) => void;
  onNavigateTab: (tab: string) => void;
}) => {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [exportDepartment, setExportDepartment] = useState("");
  const { semesters, selectedSemester } = useSemester();
  const { stats, isLoading, updatedAt, reload } = useAdminDashboardStats(
    true,
    toApiSemesterId(selectedSemester?.id),
    onShowToast,
  );

  const semesterId = toApiSemesterId(selectedSemester?.id);
  const departmentFilter = exportDepartment || undefined;
  const isSuperAdmin = user?.backendRole === "SuperAdmin";

  const handleRefresh = async () => {
    if (isLoading) return;
    await reload();
    onShowToast("Đã làm mới dữ liệu tổng quan!");
  };

  const handleExportInternshipList = async () => {
    setIsExporting(true);
    try {
      await exportService.downloadInternshipExcel(semesterId, departmentFilter);
      onShowToast("Đã tải xuống Danh sách thực tập (.xlsx)");
    } catch (err) {
      onShowToast("Xuất danh sách thực tập thất bại. Đang tải báo cáo tổng quan...");
      if (stats) exportAdminDashboardReport(stats);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSummaryReportWord = async () => {
    setIsExporting(true);
    try {
      await exportService.downloadSummaryReportWord(semesterId, departmentFilter);
      onShowToast("Đã tải xuống Báo cáo tổng kết thực tập (.docx)");
    } catch (err) {
      onShowToast("Xuất báo cáo tổng kết Word thất bại.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSummaryReportExcel = async () => {
    setIsExporting(true);
    try {
      await exportService.downloadSummaryReport(semesterId, departmentFilter);
      onShowToast("Đã tải xuống Báo cáo tổng kết thực tập (.xlsx)");
    } catch (err) {
      onShowToast("Xuất báo cáo tổng kết Excel thất bại.");
    } finally {
      setIsExporting(false);
    }
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
        title="Tổng quan hệ thống"
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
          {
            label: isExporting ? "Đang xuất…" : "Xuất danh sách thực tập",
            icon: FileSpreadsheet,
            onClick: () => void handleExportInternshipList(),
            variant: "secondary",
            disabled: isExporting || isLoading,
            loading: isExporting,
          },
          {
            label: isExporting ? "Đang xuất…" : "Xuất báo cáo tổng kết (.docx)",
            icon: FileText,
            onClick: () => void handleExportSummaryReportWord(),
            variant: "secondary",
            disabled: isExporting || isLoading,
            loading: isExporting,
          },
          {
            label: isExporting ? "Đang xuất…" : "Xuất báo cáo tổng kết (.xlsx)",
            icon: Download,
            onClick: () => void handleExportSummaryReportExcel(),
            variant: "secondary",
            disabled: isExporting || isLoading,
            loading: isExporting,
          },
        ]}
      />

      {isSuperAdmin && (
        <div className="il-accent-panel px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Bộ lọc xuất báo cáo</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">
              Áp dụng Khoa cho danh sách thực tập và báo cáo tổng kết theo kỳ đang chọn.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span>Khoa</span>
            <select
              value={exportDepartment}
              onChange={(e) => setExportDepartment(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
              aria-label="Lọc Khoa khi xuất báo cáo"
            >
              {EXPORT_DEPARTMENTS.map((d) => (
                <option key={d.value || "all"} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <AdminKpiSection
        stats={stats}
        isLoading={isLoading}
        onCardClick={(metric) => {
          if (metric === "lecturers") onNavigateTab("admin-lecturers");
          else if (metric === "students") onNavigateTab("admin-students");
          else if (metric === "companies") onNavigateTab("admin-companies");
          else if (metric === "semesters") onNavigateTab("admin-assignments");
        }}
      />

      <div className="il-accent-panel px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Bức tranh vận hành</p>
          <p className="text-sm font-semibold text-slate-900 mt-0.5">Theo dõi nhanh nguồn lực, tiến độ và các điểm cần can thiệp.</p>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">Dữ liệu theo kỳ đang chọn</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Panel className="lg:col-span-8">
          <DashboardTrendChart
            title="Phân bổ sinh viên theo trạng thái"
            subtitle="Số lượng sinh viên trong đợt thực tập đang chọn"
            data={isLoading ? [] : internshipTrend}
            valueLabel="Số sinh viên"
            variant="bar"
          />
        </Panel>
        <Panel className="lg:col-span-4">
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
        </Panel>
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
    </div>
  );
};

export { DashboardView as AdminDashboardView };
