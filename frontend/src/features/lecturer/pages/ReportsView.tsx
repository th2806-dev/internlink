import { ClipboardCheck, FileClock, FileCheck2, FileWarning, SearchX } from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { EmptyState } from "../../../components/common/EmptyState";
import { TableSkeleton, SkeletonBox } from "../../../components/common/SkeletonLoader";
import { RequestErrorState } from "../../../components/common/RequestErrorState";
import { SubmissionsHub } from "../components/SubmissionsHub";
import { WeeklyReportsReviewPanel } from "../components/WeeklyReportsReviewPanel";
import { useLecturerReportsQuery } from "../../../hooks/useLecturerReportsQuery";
import { ApiClientError } from "../../../lib/apiClient";
import type { ToastType } from "../../../contexts/ToastContext";
import type { Submission } from "../../../types/submission";

interface ReportsViewProps {
  /** Bài nộp sản phẩm/cuối kỳ (dữ liệu portal legacy — chuyển sang query ở GĐ 3/4). */
  submissions?: Submission[];
  /** Portal legacy còn đang tải → chỉ hiện skeleton khu vực bài nộp, KHÔNG blank cả trang. */
  isSubmissionsLoading?: boolean;
  onUpdateSubmissionStatus?: (
    id: string,
    status: string,
    note?: string,
  ) => void;
  showToast?: (msg: string, type?: ToastType) => void;
  /** Kỳ thực tập đang chọn — nhúng vào query key (Cache Isolation theo học kỳ). */
  semesterId?: string;
  /**
   * Cầu nối đồng bộ với portal legacy (dashboard/action items) sau khi dữ liệu
   * báo cáo đổi — sẽ bỏ khi toàn bộ portal chuyển sang TanStack Query (GĐ 3/4).
   */
  onRefresh?: () => void;
}

/**
 * Trang Duyệt báo cáo thực tập (lát dọc tiên phong — Gold Standard).
 * Toàn bộ dữ liệu báo cáo do `useLecturerReportsQuery` quản lý:
 * Loading (Skeleton) ⇄ Lỗi (RequestErrorState + Thử lại) ⇄ Rỗng (EmptyState).
 */
export const ReportsView = ({
  submissions = [],
  isSubmissionsLoading = false,
  onUpdateSubmissionStatus,
  showToast,
  semesterId,
  onRefresh,
}: ReportsViewProps) => {
  const reports = useLecturerReportsQuery({ semesterId, onReviewed: onRefresh });
  const {
    items,
    totals,
    isTotalsPending,
    isPending,
    isError,
    error,
    isFetching,
    isPlaceholderData,
    filter,
    pagination,
    setStatus,
    setSearchTerm,
    applySearch,
    clearFilters,
    goToPage,
  } = reports;

  const reportSummary = totals ?? { total: 0, pending: 0, revision: 0, approved: 0 };
  const hasFilter = Boolean(filter.status || filter.appliedSearchTerm);

  /** Số KPI: hiện skeleton đúng bằng chiều cao chữ khi chưa có dữ liệu totals. */
  const kpiValue = (value: number) =>
    isTotalsPending ? <SkeletonBox className="h-8 w-14" /> : value;

  const handleRetry = () => {
    void reports.refetch();
  };

  const handleReview = async (id: string, uiStatus: string, comment?: string) => {
    await reports.reviewReport({ id, uiStatus, comment });
  };

  const errorStatus =
    error instanceof ApiClientError ? error.status : undefined;
  const errorMessage =
    error instanceof Error ? error.message : "Không kết nối được tới máy chủ.";

  return (
    <div className="space-y-5 animate-in fade-in duration-200 max-w-[1500px] mx-auto">
      <PageHeader
        icon={ClipboardCheck}
        title="Duyệt báo cáo thực tập"
        subtitle="Kiểm tra tiến độ, phản hồi và xác nhận báo cáo của sinh viên trong nhóm hướng dẫn."
        badge={isTotalsPending ? "…" : `${reportSummary.total} báo cáo`}
        badgeColor="bg-blue-50 text-blue-800 border-blue-200"
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 il-panel overflow-hidden">
        <div className="p-4 border-r border-b lg:border-b-0 border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tổng báo cáo</p>
          <div className="text-2xl font-bold il-kpi-val text-slate-900 mt-1">{kpiValue(reportSummary.total)}</div>
          <p className="text-[11px] text-slate-500 mt-1">Theo kỳ đang chọn</p>
        </div>
        <div className="p-4 lg:border-r border-b lg:border-b-0 border-slate-100 border-l-4 border-l-amber-500">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1"><FileClock className="w-3.5 h-3.5" /> Chờ xử lý</p>
          <div className="text-2xl font-bold il-kpi-val text-slate-900 mt-1">{kpiValue(reportSummary.pending)}</div>
          <p className="text-[11px] text-slate-500 mt-1">Cần nhận xét</p>
        </div>
        <div className="p-4 border-r border-slate-100 border-l-4 border-l-rose-500">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1"><FileWarning className="w-3.5 h-3.5" /> Cần sửa</p>
          <div className="text-2xl font-bold il-kpi-val text-slate-900 mt-1">{kpiValue(reportSummary.revision)}</div>
          <p className="text-[11px] text-slate-500 mt-1">Đang chờ sinh viên cập nhật</p>
        </div>
        <div className="p-4 border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1"><FileCheck2 className="w-3.5 h-3.5" /> Đã duyệt</p>
          <div className="text-2xl font-bold il-kpi-val text-slate-900 mt-1">{kpiValue(reportSummary.approved)}</div>
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

      {/* ── 1. ĐANG TẢI (khởi tạo): skeleton giữ nguyên bố cục, không nhấp nháy ── */}
      {isPending && !isError && (
        <div data-testid="reports-loading" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg">
            <SkeletonBox className="h-9 flex-1 min-w-60" />
            <SkeletonBox className="h-9 w-28" />
            <SkeletonBox className="h-9 w-24" />
          </div>
          <TableSkeleton rows={4} columns={5} />
        </div>
      )}

      {/* ── 2. LỖI: KHÔNG BAO GIÔ hiện "không có dữ liệu" ─────────────────── */}
      {isError && (
        <RequestErrorState
          title="Không thể tải danh sách báo cáo"
          message={errorMessage}
          status={errorStatus}
          onRetry={handleRetry}
          retrying={isFetching}
        />
      )}

      {/* ── 3. CÓ DỮ LIỆU / RỖNG ─────────────────────────────────────────── */}
      {!isPending && !isError && (
        <>
          <div
            aria-busy={isFetching}
            className={`flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg transition-opacity duration-150 ${isFetching ? "opacity-60" : ""}`}
          >
            <input
              value={filter.searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySearch();
              }}
              placeholder="Tìm sinh viên hoặc tiêu đề báo cáo"
              aria-label="Tìm sinh viên hoặc tiêu đề báo cáo"
              className="flex-1 min-w-60 px-3 py-2 text-xs border border-slate-200 rounded-md outline-none focus:border-blue-500"
            />
            <button type="button" onClick={applySearch} className="il-btn il-btn-primary text-xs">
              Tìm
            </button>
            <select
              value={filter.status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Lọc theo trạng thái"
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
              disabled={!pagination.hasPrev}
              onClick={() => goToPage(pagination.page - 1)}
              className="il-btn il-btn-secondary text-xs disabled:opacity-50"
            >
              Trước
            </button>
            <span className="text-xs text-slate-500 min-w-24 text-center" data-testid="reports-pagination">
              {pagination.total === 0
                ? "0 / 0"
                : `${pagination.from}-${pagination.to} / ${pagination.total}`}
            </span>
            <button
              type="button"
              disabled={!pagination.hasNext}
              onClick={() => goToPage(pagination.page + 1)}
              className="il-btn il-btn-secondary text-xs disabled:opacity-50"
            >
              Sau
            </button>
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Không có báo cáo nào"
              description={
                hasFilter
                  ? "Không tìm thấy báo cáo khớp với bộ lọc hiện tại. Thử đổi từ khóa hoặc trạng thái khác."
                  : "Chưa có sinh viên nào nộp báo cáo trong kỳ thực tập này."
              }
              {...(hasFilter && {
                action: { label: "Xóa bộ lọc", onClick: clearFilters },
              })}
            />
          ) : (
            <div
              className={`transition-opacity duration-150 ${isFetching ? "opacity-60" : ""}`}
              data-testid="reports-list"
            >
              <WeeklyReportsReviewPanel
                reports={items}
                onReview={handleReview}
                onShowToast={(msg, type) =>
                  showToast?.(msg, type === "error" ? "danger" : type)
                }
                isReviewing={reports.isReviewing}
                isPlaceholderData={isPlaceholderData}
              />
            </div>
          )}
        </>
      )}

      {/* Khu vực bài nộp sản phẩm/cuối kỳ (portal legacy — GĐ 3/4 sẽ chuyển sang query) */}
      {isSubmissionsLoading && submissions.length === 0 ? (
        <div data-testid="submissions-loading">
          <TableSkeleton rows={3} columns={5} />
        </div>
      ) : (
        <SubmissionsHub
          submissions={submissions}
          onUpdateSubmissionStatus={onUpdateSubmissionStatus}
          onToast={showToast}
        />
      )}
    </div>
  );
};
