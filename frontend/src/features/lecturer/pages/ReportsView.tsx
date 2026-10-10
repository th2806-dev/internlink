import { useEffect, useMemo, useState } from "react";
import { CalendarClock, ClipboardCheck, SearchX } from "lucide-react";
import { Toolbar } from "../../../components/common/Toolbar";
import { EmptyState } from "../../../components/common/EmptyState";
import { SkeletonBox, TableSkeleton } from "../../../components/common/SkeletonLoader";
import { RequestErrorState } from "../../../components/common/RequestErrorState";
import { SubmissionsHub } from "../components/SubmissionsHub";
import { WeeklyReportsReviewPanel } from "../components/WeeklyReportsReviewPanel";
import { LecturerSubPageHeader } from "../components/LecturerSubPageHeader";
import { useLecturerReportsQuery } from "../../../hooks/useLecturerReportsQuery";
import { useLecturerSubmissionsQuery } from "../../../hooks/useLecturerSubmissionsQuery";
import { ApiClientError, getApiErrorMessage } from "../../../lib/apiClient";
import type { ToastType } from "../../../contexts/ToastContext";
import type { Submission } from "../../../types/submission";
import { mapWeeklyReportStatusToUi } from "../../../lib/portalMappers";
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

const normalizeReportType = (type: string) =>
  type === "Sản phẩm" ? "Sản phẩm thực tế" : type;
const EMPTY_STUDENT_CONTEXT: Record<
  string,
  { studentName: string; mssv: string; company: string }
> = {};

/**
 * Trang Duyệt báo cáo thực tập (lát dọc tiên phong — Gold Standard).
 * Toàn bộ dữ liệu báo cáo do `useLecturerReportsQuery` quản lý:
 * Loading (Skeleton) ⇄ Lỗi (RequestErrorState + Thử lại) ⇄ Rỗng (EmptyState).
 */
export const ReportsView = ({
  submissions = [],
  showToast,
  semesterId,
  onRefresh,
}: ReportsViewProps) => {
  const [activeTab, setActiveTab] = useState<"review" | "schedule">("review");
  const [reviewArea, setReviewArea] = useState<"pending" | "approved">("pending");
  const [reportType, setReportType] = useState("Tất cả");
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
      .catch((error: unknown) => {
        setSchedules([]);
        showToast?.(getApiErrorMessage(error), "danger");
      });
  }, [semesterId, showToast]);

  const closedWeekNumbers = schedules
    .filter((schedule) => !schedule.isSubmissionOpen || new Date(schedule.dueDate).getTime() < Date.now())
    .map((schedule) => schedule.weekNumber);

  const reports = useLecturerReportsQuery({ semesterId, onReviewed: onRefresh });
  const setWeeklyReportStatus = reports.setStatus;
  useEffect(() => {
    setWeeklyReportStatus(reviewArea === "approved" ? "Approved" : "");
  }, [setWeeklyReportStatus, reviewArea]);

  const submissionsQuery = useLecturerSubmissionsQuery({
    semesterId,
    onUpdated: onRefresh,
  });

  const effectiveSubmissions = submissionsQuery.isLoading
    ? submissions
    : submissionsQuery.submissions;

  const effectiveSubmissionsLoading =
    submissionsQuery.isLoading && effectiveSubmissions.length === 0;

  const effectiveUpdateSubmissionStatus =
    submissionsQuery.updateSubmissionStatus;

  const {
    items,
    totals,
    isTotalsPending,
    isTotalsError,
    totalsError,
    refetchTotals,
    isPending,
    isError,
    error,
    isFetching,
    isPlaceholderData,
    filter,
    pagination,
    setSearchTerm,
    goToPage,
  } = reports;

  const handleRetry = () => {
    void reports.refetch();
  };

  const handleReview = async (id: string, uiStatus: string, comment?: string, qualityScore?: number) => {
    await reports.reviewReport({ id, uiStatus, comment, qualityScore });
  };

  const searchTerm = filter.searchTerm.trim().toLocaleLowerCase("vi");
  const studentByInternship = submissionsQuery.studentByInternship ?? EMPTY_STUDENT_CONTEXT;
  const visibleWeeklyReports = useMemo(
    () => items.filter((report) => {
      return reviewArea === "pending"
        && report.status !== "Approved"
        && (reportType === "Tất cả" || reportType === "Báo cáo tuần");
    }),
    [items, reportType, reviewArea],
  );
  const weeklyArchiveItems = useMemo<Submission[]>(() => {
    if (reviewArea !== "approved" || (reportType !== "Tất cả" && reportType !== "Báo cáo tuần")) {
      return [];
    }
    return items
      .filter((report) => report.status === "Approved")
      .map((report): Submission | null => {
        const student = studentByInternship[report.internshipId];
        const searchable = [
          student?.studentName,
          student?.mssv,
          student?.company,
          report.title,
          report.content,
          report.fileName,
        ].filter(Boolean).join(" ").toLocaleLowerCase("vi");
        if (searchTerm && !searchable.includes(searchTerm)) return null;
        return {
          id: `weekly:${report.id}`,
          internshipId: report.internshipId,
          sourceType: "weeklyReport" as const,
          sourceId: report.id,
          studentName: student?.studentName ?? "—",
          mssv: student?.mssv ?? "—",
          avatar: "",
          company: student?.company ?? "—",
          reportType: "Báo cáo tuần",
          time: report.submittedAt
            ? new Date(report.submittedAt).toLocaleTimeString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—",
          date: report.submittedAt
            ? new Date(report.submittedAt).toLocaleDateString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })
            : "—",
          submittedAt: report.submittedAt,
          status: mapWeeklyReportStatusToUi(report.status),
          fileName: report.fileName ?? undefined,
          fileUrl: report.fileUrl ?? report.fileName ?? "",
          fileSize: "—",
          summary: report.content || report.title,
          duplicateScore: 0,
          lecturerNote: report.lecturerComment ?? "",
          feedbacks: report.feedbacks ?? [],
        };
      })
      .filter((item): item is Submission => item !== null);
  }, [items, reportType, reviewArea, searchTerm, studentByInternship]);
  const visibleSubmissions = useMemo(
    () => [...effectiveSubmissions.filter((submission) => {
      const matchesStatus = reviewArea === "approved"
        ? submission.status === "Đã duyệt"
        : submission.status !== "Đã duyệt";
      const matchesType = reportType === "Tất cả"
        || normalizeReportType(submission.reportType) === reportType;
      const searchable = [
        submission.studentName,
        submission.mssv,
        submission.company,
        submission.reportType,
        submission.fileName,
        submission.summary,
        ...(submission.assets ?? []).flatMap((asset) => [asset.label, asset.fileUrl]),
      ].filter(Boolean).join(" ").toLocaleLowerCase("vi");
      return matchesStatus && matchesType && (!searchTerm || searchable.includes(searchTerm));
    }), ...weeklyArchiveItems],
    [effectiveSubmissions, reportType, reviewArea, searchTerm, weeklyArchiveItems],
  );
  const hasVisibleReports = visibleWeeklyReports.length > 0 || visibleSubmissions.length > 0;

  const errorStatus =
    error instanceof ApiClientError ? error.status : undefined;
  const errorMessage =
    error instanceof Error ? error.message : "Không kết nối được tới máy chủ.";

  return (
    <div className="mx-auto max-w-[1300px] animate-in fade-in duration-200 space-y-4 pb-12 font-sans">
      <LecturerSubPageHeader
        icon={ClipboardCheck}
        title={activeTab === "review" ? "Duyệt báo cáo thực tập" : "Cấu hình báo cáo"}
        subtitle={activeTab === "review"
          ? "Kiểm tra tiến độ, phản hồi và xác nhận báo cáo của sinh viên trong nhóm hướng dẫn."
          : "Thiết lập thời gian mở nộp, deadline và trạng thái nhận báo cáo theo tuần."}
      >
        {activeTab === "review" && (
          <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white" aria-live="polite">
            {isTotalsPending ? "Đang tải số liệu…" : totals ? `${totals.total} báo cáo` : "—"}
          </span>
        )}
      </LecturerSubPageHeader>

      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200/90 bg-white p-1 shadow-2xs" role="tablist" aria-label="Báo cáo thực tập">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "review"}
          onClick={() => setActiveTab("review")}
          className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 ${activeTab === "review" ? "bg-[#026aa7] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
        >
          <ClipboardCheck className="h-4 w-4" /> Duyệt báo cáo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "schedule"}
          onClick={() => setActiveTab("schedule")}
          className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 ${activeTab === "schedule" ? "bg-[#026aa7] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
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
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500" aria-label="Tổng số báo cáo trong học kỳ">
            <span><strong className="text-slate-800">{isTotalsPending ? "…" : totals?.total ?? "—"}</strong> báo cáo</span>
            <span><strong className="text-sky-700">{isTotalsPending ? "…" : totals?.pending ?? "—"}</strong> chờ xử lý</span>
            <span><strong className="text-amber-700">{isTotalsPending ? "…" : totals?.revision ?? "—"}</strong> cần sửa</span>
            <span><strong className="text-[#446d20]">{isTotalsPending ? "…" : totals?.approved ?? "—"}</strong> đã duyệt</span>
          </div>
        )}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-2">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Trạng thái báo cáo">
          <button
            type="button"
            role="tab"
            aria-selected={reviewArea === "pending"}
            onClick={() => setReviewArea("pending")}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 ${reviewArea === "pending" ? "bg-amber-500 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <ClipboardCheck className="h-4 w-4" /> Chờ duyệt
            <span className="rounded-full bg-white/20 px-2 py-0.5">
              {(totals?.pending ?? 0) + (totals?.revision ?? 0) + effectiveSubmissions.filter((item) => item.status !== "Đã duyệt").length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={reviewArea === "approved"}
            onClick={() => setReviewArea("approved")}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 ${reviewArea === "approved" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <ClipboardCheck className="h-4 w-4" /> Kho nhóm theo sinh viên
            <span className="rounded-full bg-white/20 px-2 py-0.5">
              {(totals?.approved ?? 0) + effectiveSubmissions.filter((item) => item.status === "Đã duyệt").length}
            </span>
          </button>
        </div>
        <input
          value={filter.searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Tìm sinh viên, MSSV hoặc tên tài nguyên"
          aria-label="Tìm sinh viên, MSSV hoặc tên tài nguyên"
          className="min-h-10 min-w-60 flex-1 rounded-full border border-slate-300 px-4 text-sm font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-500 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20 sm:text-xs"
        />
        <select
          value={reportType}
          onChange={(event) => setReportType(event.target.value)}
          aria-label="Lọc theo loại hồ sơ"
          className="min-h-10 rounded-full border border-slate-300 bg-white px-4 text-xs font-medium text-slate-700 outline-none focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
        >
          <option>Tất cả</option>
          <option>Báo cáo tuần</option>
          <option>Báo cáo cuối kỳ</option>
          <option>Sản phẩm thực tế</option>
          <option>Đánh giá doanh nghiệp</option>
        </select>
      </div>
      {isTotalsError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-3 text-xs text-rose-800" role="alert">
          <span>
            Không thể tải tổng số báo cáo:{" "}
            {totalsError instanceof Error ? totalsError.message : "Không kết nối được tới máy chủ."}
          </span>
          <button
            type="button"
            onClick={() => void refetchTotals()}
            className="inline-flex min-h-9 items-center justify-center rounded-full border border-rose-300 bg-white px-4 font-semibold text-rose-700 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2"
          >
            Thử tải lại số liệu
          </button>
        </div>
      )}

      {/* ── 1. ĐANG TẢI (khởi tạo): skeleton giữ nguyên bố cục, không nhấp nháy ── */}
      {isPending && !isError && (
        <div data-testid="reports-loading" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
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
          {(reportType === "Tất cả" || reportType === "Báo cáo tuần") && <div
            aria-busy={isFetching}
            className={`flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs transition-opacity duration-150 ${isFetching ? "opacity-60" : ""}`}
          >
            <button
              type="button"
              disabled={!pagination.hasPrev}
              onClick={() => goToPage(pagination.page - 1)}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau
            </button>
          </div>}

          {visibleWeeklyReports.length > 0 && (
            <div
              className={`transition-opacity duration-150 ${isFetching ? "opacity-60" : ""}`}
              data-testid="reports-list"
            >
              <WeeklyReportsReviewPanel
                reports={visibleWeeklyReports}
                onReview={handleReview}
                onShowToast={(msg, type) =>
                  showToast?.(msg, type === "error" ? "danger" : type)
                }
                isReviewing={reports.isReviewing}
                isPlaceholderData={isPlaceholderData}
                isSemesterClosed={isSemesterClosed}
                closedWeekNumbers={closedWeekNumbers}
                showHeading={false}
              />
            </div>
          )}
          {!hasVisibleReports && (
            <EmptyState
              icon={SearchX}
              title="Không có báo cáo nào"
              description={
                searchTerm
                  ? "Không tìm thấy hồ sơ khớp với từ khóa hiện tại."
                  : reviewArea === "pending"
                    ? "Chưa có hồ sơ nào đang chờ xử lý."
                    : "Chưa có hồ sơ nào được duyệt trong kho."
              }
            />
          )}
        </>
      )}

      {/* Khu vực bài nộp sản phẩm/cuối kỳ (TanStack Query) */}
      {submissionsQuery.isError ? (
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
          submissions={visibleSubmissions}
          onUpdateSubmissionStatus={effectiveUpdateSubmissionStatus}
          onToast={showToast}
          compact
        />
      )}
        </>
      )}
    </div>
  );
};
