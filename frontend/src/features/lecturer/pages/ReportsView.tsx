import { useEffect, useState } from "react";
import { ClipboardCheck, FileClock, FileCheck2, FileWarning } from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { SubmissionsHub } from "../components/SubmissionsHub";
import { WeeklyReportsReviewPanel } from "../components/WeeklyReportsReviewPanel";
import type { Submission } from "../../../types/submission";
import type { WeeklyReportDto } from "../../../types/api";

interface ReportsViewProps {
  submissions?: Submission[];
  weeklyReports?: WeeklyReportDto[];
  onUpdateSubmissionStatus?: (
    id: string,
    status: string,
    note?: string,
  ) => void;
  onReviewWeeklyReport?: (
    id: string,
    status: string,
    comment?: string,
  ) => void | Promise<void>;
  showToast?: (msg: string) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => Promise<void>;
  weeklyReportPage?: { total: number; skip: number; take: number };
  weeklyReportQuery?: { status: string; searchTerm: string; skip: number };
  onQueryWeeklyReports?: (query: { status: string; searchTerm: string; skip: number }) => void;
}

export const ReportsView = ({
  submissions = [],
  weeklyReports = [],
  onUpdateSubmissionStatus,
  onReviewWeeklyReport,
  showToast,
  isLoading = false,
  error = null,
  onRetry,
  weeklyReportPage = { total: 0, skip: 0, take: 20 },
  weeklyReportQuery = { status: "", searchTerm: "", skip: 0 },
  onQueryWeeklyReports,
}: ReportsViewProps) => {
  const [searchInput, setSearchInput] = useState(weeklyReportQuery.searchTerm);

  useEffect(() => {
    setSearchInput(weeklyReportQuery.searchTerm);
  }, [weeklyReportQuery.searchTerm]);

  const applySearch = () => {
    onQueryWeeklyReports?.({ ...weeklyReportQuery, searchTerm: searchInput, skip: 0 });
  };

  const reportSummary = {
    total: weeklyReportPage.total,
    pending: weeklyReports.filter((report) => report.status === "Submitted").length,
    revision: weeklyReports.filter((report) => report.status === "RevisionRequested").length,
    approved: weeklyReports.filter((report) => report.status === "Approved").length,
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-500">Đang tải danh sách báo cáo…</div>;
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-800 space-y-3">
        <p className="font-semibold">Không thể tải danh sách báo cáo: {error}</p>
        {onRetry && <button type="button" onClick={() => void onRetry()} className="il-btn il-btn-secondary text-xs">Thử lại</button>}
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200 max-w-[1500px] mx-auto">
      <PageHeader
        icon={ClipboardCheck}
        title="Duyệt báo cáo thực tập"
        subtitle="Kiểm tra tiến độ, phản hồi và xác nhận báo cáo của sinh viên trong nhóm hướng dẫn."
        badge={`${reportSummary.total} báo cáo`}
        badgeColor="bg-blue-50 text-blue-800 border-blue-200"
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 il-panel overflow-hidden">
        <div className="p-4 border-r border-b lg:border-b-0 border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tổng báo cáo</p>
          <p className="text-2xl font-bold il-kpi-val text-slate-900 mt-1">{reportSummary.total}</p>
          <p className="text-[11px] text-slate-500 mt-1">Theo kỳ đang chọn</p>
        </div>
        <div className="p-4 lg:border-r border-b lg:border-b-0 border-slate-100 border-l-4 border-l-amber-500">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1"><FileClock className="w-3.5 h-3.5" /> Chờ xử lý</p>
          <p className="text-2xl font-bold il-kpi-val text-slate-900 mt-1">{reportSummary.pending}</p>
          <p className="text-[11px] text-slate-500 mt-1">Cần nhận xét</p>
        </div>
        <div className="p-4 border-r border-slate-100 border-l-4 border-l-rose-500">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1"><FileWarning className="w-3.5 h-3.5" /> Cần sửa</p>
          <p className="text-2xl font-bold il-kpi-val text-slate-900 mt-1">{reportSummary.revision}</p>
          <p className="text-[11px] text-slate-500 mt-1">Đang chờ sinh viên cập nhật</p>
        </div>
        <div className="p-4 border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1"><FileCheck2 className="w-3.5 h-3.5" /> Đã duyệt</p>
          <p className="text-2xl font-bold il-kpi-val text-slate-900 mt-1">{reportSummary.approved}</p>
          <p className="text-[11px] text-slate-500 mt-1">Hoàn tất phản hồi</p>
        </div>
      </section>

      <Panel padding="sm" className="border-blue-100 bg-blue-50/40">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-900">
          <ClipboardCheck className="w-4 h-4 text-blue-700" />
          <span>Hàng đợi duyệt báo cáo</span>
          <span className="text-blue-700/70">Chọn một báo cáo bên dưới để xem nội dung và gửi nhận xét.</span>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applySearch();
          }}
          placeholder="Tìm sinh viên hoặc tiêu đề báo cáo"
          className="flex-1 min-w-60 px-3 py-2 text-xs border border-slate-200 rounded-md outline-none focus:border-blue-500"
        />
        <button type="button" onClick={applySearch} className="il-btn il-btn-primary text-xs">
          Tìm
        </button>
        <select
          value={weeklyReportQuery.status}
          onChange={(e) => onQueryWeeklyReports?.({ ...weeklyReportQuery, status: e.target.value, skip: 0 })}
          className="px-3 py-2 text-xs border border-slate-200 rounded-md"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Submitted">Chờ duyệt</option>
          <option value="RevisionRequested">Yêu cầu sửa</option>
          <option value="Reviewed">Đã nhận xét</option>
          <option value="Approved">Đã duyệt</option>
        </select>
        <button
          type="button"
          disabled={weeklyReportPage.skip <= 0}
          onClick={() => onQueryWeeklyReports?.({ ...weeklyReportQuery, skip: Math.max(0, weeklyReportPage.skip - weeklyReportPage.take) })}
          className="il-btn il-btn-secondary text-xs disabled:opacity-50"
        >
          Trước
        </button>
        <span className="text-xs text-slate-500 min-w-24 text-center">
          {weeklyReportPage.total === 0 ? "0 / 0" : `${weeklyReportPage.skip + 1}-${Math.min(weeklyReportPage.skip + weeklyReportPage.take, weeklyReportPage.total)} / ${weeklyReportPage.total}`}
        </span>
        <button
          type="button"
          disabled={weeklyReportPage.skip + weeklyReportPage.take >= weeklyReportPage.total}
          onClick={() => onQueryWeeklyReports?.({ ...weeklyReportQuery, skip: weeklyReportPage.skip + weeklyReportPage.take })}
          className="il-btn il-btn-secondary text-xs disabled:opacity-50"
        >
          Sau
        </button>
      </div>
      <WeeklyReportsReviewPanel
        reports={weeklyReports}
        onReview={onReviewWeeklyReport ?? (() => {})}
      />
      <SubmissionsHub
        submissions={submissions}
        onUpdateSubmissionStatus={onUpdateSubmissionStatus}
        onToast={showToast}
      />
    </div>
  );
};
