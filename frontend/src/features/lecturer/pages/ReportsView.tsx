import { useEffect, useMemo, useState } from "react";
import { Archive, CalendarClock, ClipboardCheck, SearchX } from "lucide-react";
import { EmptyState } from "../../../components/common/EmptyState";
import { Panel } from "../../../components/common/Panel";
import { TableSkeleton } from "../../../components/common/SkeletonLoader";
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
import { submissionApiService } from "../../../services/submissionApi.service";

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
  const [zipCategory, setZipCategory] = useState("weekly");
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
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

  const handleDownloadSemesterZip = async () => {
    if (!semesterId || isDownloadingZip) return;
    setIsDownloadingZip(true);
    try {
      await submissionApiService.downloadLecturerSemesterZip(semesterId, zipCategory);
      showToast?.("Đã tạo và tải tệp ZIP.", "success");
    } catch (downloadError) {
      showToast?.(getApiErrorMessage(downloadError), "danger");
    } finally {
      setIsDownloadingZip(false);
    }
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
  const showWeeklyReviewQueue =
    reviewArea === "pending" &&
    (reportType === "Tất cả" || reportType === "Báo cáo tuần");

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
      />

      <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200/90 bg-white p-1 shadow-2xs" role="tablist" aria-label="Báo cáo thực tập">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "review"}
          onClick={() => setActiveTab("review")}
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 ${activeTab === "review" ? "bg-[#026aa7] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
        >
          <ClipboardCheck className="h-4 w-4" /> Duyệt báo cáo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "schedule"}
          onClick={() => setActiveTab("schedule")}
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 ${activeTab === "schedule" ? "bg-[#026aa7] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
        >
          <CalendarClock className="h-4 w-4" /> Cấu hình deadline
        </button>
      </div>

      {activeTab === "schedule" ? (
        <ScheduleConfigTab onShowToast={showToast} semesterId={semesterId} />
      ) : (
        <>
      <Panel className="space-y-4 rounded-lg border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center justify-between gap-3 sm:block">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Trạng thái duyệt</h2>
              <p className="mt-0.5 text-xs text-slate-500">Chọn nhóm hồ sơ cần xem hoặc xử lý.</p>
            </div>
            <p className="shrink-0 text-xs font-medium text-slate-500" aria-live="polite">
              <strong className="text-slate-800">{isTotalsPending ? "…" : totals?.total ?? "—"}</strong> báo cáo
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Trạng thái báo cáo">
            <button
              type="button"
              role="tab"
              aria-selected={reviewArea === "pending"}
              onClick={() => setReviewArea("pending")}
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 ${reviewArea === "pending" ? "bg-amber-500 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              <ClipboardCheck className="h-4 w-4" /> Chờ duyệt
              <span className="rounded-md bg-white/20 px-2 py-0.5">
                {(totals?.pending ?? 0) + (totals?.revision ?? 0) + effectiveSubmissions.filter((item) => item.status !== "Đã duyệt").length}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={reviewArea === "approved"}
              onClick={() => setReviewArea("approved")}
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 ${reviewArea === "approved" ? "bg-emerald-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              <ClipboardCheck className="h-4 w-4" /> Đã duyệt
              <span className="rounded-md bg-white/20 px-2 py-0.5">
                {(totals?.approved ?? 0) + effectiveSubmissions.filter((item) => item.status === "Đã duyệt").length}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_250px]">
          <label className="sr-only" htmlFor="report-search">Tìm hồ sơ</label>
          <input
            id="report-search"
            value={filter.searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm theo sinh viên, MSSV hoặc tên tệp..."
            aria-label="Tìm sinh viên, MSSV hoặc tên tài nguyên"
            className="min-h-11 w-full rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-500 hover:border-slate-400 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20 sm:text-xs"
          />
          <label className="sr-only" htmlFor="report-type-filter">Lọc theo loại hồ sơ</label>
          <select
            id="report-type-filter"
            value={reportType}
            onChange={(event) => setReportType(event.target.value)}
            aria-label="Lọc theo loại hồ sơ"
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-xs font-medium text-slate-700 outline-none transition-colors hover:border-slate-400 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
          >
            <option value="Tất cả">Tất cả loại hồ sơ</option>
            <option>Báo cáo tuần</option>
            <option>Báo cáo cuối kỳ</option>
            <option>Sản phẩm thực tế</option>
            <option>Đánh giá doanh nghiệp</option>
          </select>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-800">Tải hồ sơ học kỳ</h3>
            <p className="text-[11px] text-slate-500">Xuất các tệp đã nộp theo loại hồ sơ.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="semester-report-zip-category">Loại hồ sơ cần tải ZIP</label>
            <select
              id="semester-report-zip-category"
              value={zipCategory}
              onChange={(event) => setZipCategory(event.target.value)}
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-xs font-medium text-slate-700 outline-none transition-colors hover:border-slate-400 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            >
              <option value="weekly">Tất cả file báo cáo tuần</option>
              <option value="final">Tất cả file báo cáo cuối kỳ</option>
              <option value="product">Tất cả file sản phẩm</option>
              <option value="evidence">Tất cả file minh chứng đánh giá doanh nghiệp</option>
              <option value="student">Nhóm theo sinh viên</option>
            </select>
            <button
              type="button"
              onClick={() => void handleDownloadSemesterZip()}
              disabled={!semesterId || isDownloadingZip}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#026aa7] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#025987] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Archive className="h-4 w-4" aria-hidden="true" />
              {isDownloadingZip ? "Đang tạo ZIP…" : "Tải ZIP"}
            </button>
          </div>
        </div>
      </Panel>
      {isTotalsError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50/50 px-4 py-3 text-xs text-rose-800" role="alert">
          <span>
            Không thể tải tổng số báo cáo:{" "}
            {totalsError instanceof Error ? totalsError.message : "Không kết nối được tới máy chủ."}
          </span>
          <button
            type="button"
            onClick={() => void refetchTotals()}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-rose-300 bg-white px-4 font-semibold text-rose-700 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2"
          >
            Thử tải lại số liệu
          </button>
        </div>
      )}

      {/* ── 1. ĐANG TẢI (khởi tạo): skeleton giữ nguyên bố cục, không nhấp nháy ── */}
      {isPending && !isError && (
        <div data-testid="reports-loading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Báo cáo tuần</h2>
            <span className="text-xs text-slate-500">Đang tải...</span>
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
          {showWeeklyReviewQueue && (
            <section className="space-y-3" aria-labelledby="weekly-review-heading">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 id="weekly-review-heading" className="text-sm font-bold text-slate-900">
                    Báo cáo tuần cần duyệt
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Kiểm tra nội dung, phản hồi hoặc duyệt từng báo cáo.
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {pagination.total} báo cáo
                </span>
              </div>
              {visibleWeeklyReports.length > 0 ? (
                <div
                  aria-busy={isFetching}
                  className={`transition-opacity duration-150 ${isPlaceholderData ? "opacity-60" : ""}`}
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
              ) : (
                <Panel className="rounded-lg border border-slate-200/90 py-8 text-center shadow-2xs">
                  <p className="text-sm font-semibold text-slate-700">
                    {searchTerm
                      ? "Không tìm thấy báo cáo tuần phù hợp."
                      : "Không có báo cáo nào"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {searchTerm
                      ? "Thử điều chỉnh từ khóa hoặc loại hồ sơ."
                      : reviewArea === "pending"
                        ? "Hiện không có báo cáo tuần nào đang chờ duyệt. Danh sách sẽ cập nhật ngay khi sinh viên gửi bài."
                        : "Các báo cáo được duyệt sẽ hiển thị tại đây."}
                  </p>
                </Panel>
              )}
              <div
                aria-busy={isFetching}
                className={`flex items-center justify-end gap-2 transition-opacity duration-150 ${isFetching ? "opacity-60" : ""}`}
              >
                <span className="mr-2 text-xs text-slate-500" data-testid="reports-pagination">
                  {pagination.total === 0
                    ? "0 / 0"
                    : `${pagination.from}-${pagination.to} / ${pagination.total}`}
                </span>
                <button
                  type="button"
                  disabled={!pagination.hasPrev}
                  onClick={() => goToPage(pagination.page - 1)}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Trước
                </button>
                <button
                  type="button"
                  disabled={!pagination.hasNext}
                  onClick={() => goToPage(pagination.page + 1)}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </section>
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
      ) : visibleSubmissions.length > 0 ? (
        <section className="space-y-3" aria-labelledby="submission-archive-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="submission-archive-heading" className="text-sm font-bold text-slate-900">
                Hồ sơ theo sinh viên
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Xem các bài nộp và trạng thái xử lý của từng sinh viên.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500">
              {visibleSubmissions.length} hồ sơ
            </span>
          </div>
        <SubmissionsHub
          submissions={visibleSubmissions}
          onUpdateSubmissionStatus={effectiveUpdateSubmissionStatus}
          onToast={showToast}
          compact
        />
        </section>
      ) : !showWeeklyReviewQueue && !submissionsQuery.isError && !effectiveSubmissionsLoading ? (
        <EmptyState
          icon={SearchX}
          title="Không có hồ sơ nào"
          description={
            searchTerm
              ? "Không tìm thấy hồ sơ khớp với từ khóa hiện tại."
              : reviewArea === "pending"
                ? "Chưa có hồ sơ nào đang chờ xử lý."
                : "Chưa có hồ sơ nào được duyệt trong kho."
          }
        />
      ) : null}
        </>
      )}
    </div>
  );
};
