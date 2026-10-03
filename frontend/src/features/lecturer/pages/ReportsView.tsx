import { useEffect, useState } from "react";
import { CalendarClock, ClipboardCheck, SearchX } from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { Toolbar } from "../../../components/common/Toolbar";
import { EmptyState } from "../../../components/common/EmptyState";
import { SkeletonBox, TableSkeleton } from "../../../components/common/SkeletonLoader";
import { RequestErrorState } from "../../../components/common/RequestErrorState";
import { SubmissionsHub } from "../components/SubmissionsHub";
import { WeeklyReportsReviewPanel } from "../components/WeeklyReportsReviewPanel";
import { useLecturerReportsQuery } from "../../../hooks/useLecturerReportsQuery";
import { useLecturerSubmissionsQuery } from "../../../hooks/useLecturerSubmissionsQuery";
import { ApiClientError } from "../../../lib/apiClient";
import type { ToastType } from "../../../contexts/ToastContext";
import type { Submission } from "../../../types/submission";
import { useSemester } from "../../../contexts/SemesterContext";
import { semesterReportScheduleService, type SemesterReportScheduleDto } from "../../../services/semesterReportSchedule.service";
import { ScheduleConfigTab } from "./InternshipEvaluationView";

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
  const [activeTab, setActiveTab] = useState<"review" | "schedule">("review");
  const { semesters } = useSemester();
  const [schedules, setSchedules] = useState<SemesterReportScheduleDto[]>([]);
  const selectedSemester = semesters.find((semester) => semester.id === semesterId);
  const isSemesterClosed = selectedSemester?.status === "completed";

  useEffect(() => {
    if (!semesterId) {
      setSchedules([]);
      return;
    }
    void semesterReportScheduleService.getSchedules(semesterId)
      .then(setSchedules)
      .catch(() => setSchedules([]));
  }, [semesterId]);

  const closedWeekNumbers = schedules
    .filter((schedule) => !schedule.isSubmissionOpen || new Date(schedule.dueDate).getTime() < Date.now())
    .map((schedule) => schedule.weekNumber);

  const reports = useLecturerReportsQuery({ semesterId, onReviewed: onRefresh });
  const submissionsQuery = useLecturerSubmissionsQuery({
    semesterId,
    enabled: submissions.length === 0,
  });

  const effectiveSubmissions =
    submissions.length > 0 ? submissions : submissionsQuery.submissions;

  const effectiveSubmissionsLoading =
    isSubmissionsLoading ||
    (submissions.length === 0 && submissionsQuery.isLoading);

  const effectiveUpdateSubmissionStatus =
    onUpdateSubmissionStatus ?? submissionsQuery.updateSubmissionStatus;

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

  const handleRetry = () => {
    void reports.refetch();
  };

  const handleReview = async (id: string, uiStatus: string, comment?: string, qualityScore?: number) => {
    await reports.reviewReport({ id, uiStatus, comment, qualityScore });
  };

  const errorStatus =
    error instanceof ApiClientError ? error.status : undefined;
  const errorMessage =
    error instanceof Error ? error.message : "Không kết nối được tới máy chủ.";

  return (
    <div className="space-y-5 animate-in fade-in duration-200 max-w-[1500px] mx-auto">
      <PageHeader
        icon={ClipboardCheck}
        title={activeTab === "review" ? "Duyệt báo cáo thực tập" : "Cấu hình báo cáo"}
        subtitle={activeTab === "review"
          ? "Kiểm tra tiến độ, phản hồi và xác nhận báo cáo của sinh viên trong nhóm hướng dẫn."
          : "Thiết lập thời gian mở nộp, deadline và trạng thái nhận báo cáo theo tuần."}
        badge={activeTab === "review" ? (isTotalsPending ? "…" : `${reportSummary.total} báo cáo`) : undefined}
        badgeColor="bg-blue-50 text-blue-800 border-blue-200"
      />

      <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1" role="tablist" aria-label="Báo cáo thực tập">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "review"}
          onClick={() => setActiveTab("review")}
          className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${activeTab === "review" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
        >
          <ClipboardCheck className="h-4 w-4" /> Duyệt báo cáo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "schedule"}
          onClick={() => setActiveTab("schedule")}
          className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${activeTab === "schedule" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
        >
          <CalendarClock className="h-4 w-4" /> Cấu hình deadline
        </button>
      </div>

      {activeTab === "schedule" ? (
        <ScheduleConfigTab onShowToast={showToast} semesterId={semesterId} />
      ) : (
        <>
      <Toolbar
        left={(
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
            <span><strong className="text-slate-800">{isTotalsPending ? "…" : reportSummary.total}</strong> báo cáo</span>
            <span><strong className="text-amber-700">{isTotalsPending ? "…" : reportSummary.pending}</strong> chờ xử lý</span>
            <span><strong className="text-rose-700">{isTotalsPending ? "…" : reportSummary.revision}</strong> cần sửa</span>
            <span><strong className="text-emerald-700">{isTotalsPending ? "…" : reportSummary.approved}</strong> đã duyệt</span>
          </div>
        )}
      />

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
                isSemesterClosed={isSemesterClosed}
                closedWeekNumbers={closedWeekNumbers}
              />
            </div>
          )}
        </>
      )}

      {/* Khu vực bài nộp sản phẩm/cuối kỳ (TanStack Query) */}
      {submissionsQuery.isError && submissions.length === 0 ? (
        <RequestErrorState
          title="Không thể tải danh sách bài nộp"
          message={
            submissionsQuery.error instanceof Error
              ? submissionsQuery.error.message
              : "Lỗi tải danh sách bài nộp."
          }
          onRetry={() => void submissionsQuery.refetch()}
          retrying={submissionsQuery.isFetching}
        />
      ) : effectiveSubmissionsLoading && effectiveSubmissions.length === 0 ? (
        <div data-testid="submissions-loading">
          <TableSkeleton rows={3} columns={5} />
        </div>
      ) : (
        <SubmissionsHub
          submissions={effectiveSubmissions}
          onUpdateSubmissionStatus={effectiveUpdateSubmissionStatus}
          onToast={showToast}
        />
      )}
        </>
      )}
    </div>
  );
};
