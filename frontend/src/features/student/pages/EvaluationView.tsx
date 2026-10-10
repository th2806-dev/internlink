import {
  AlertTriangle,
  Award,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  FileCheck2,
  Image as ImageIcon,
  MessageSquare,
  Package,
  RefreshCw,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSemester } from "../../../contexts/SemesterContext";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { computeGrade } from "../../../lib/gradingRules";
import { evaluationService } from "../../../services/evaluation.service";
import { semesterReportScheduleService, type SemesterReportScheduleDto } from "../../../services/semesterReportSchedule.service";
import { submissionApiService } from "../../../services/submissionApi.service";
import { weeklyReportService } from "../../../services/weeklyReport.service";
import type { EvaluationDetailDto, SubmissionAssetDto, SubmissionDto, WeeklyReportDto } from "../../../types/api";
import { StudentSubPageHeader } from "../components/StudentSubPageHeader";

type EvidencePhotoProps = {
  submissionId: string;
  asset: SubmissionAssetDto;
  onPreview: (photo: { url: string; fileName: string }) => void;
};

const EvidencePhoto = ({ submissionId, asset, onPreview }: EvidencePhotoProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileName = asset.fileName || asset.label || "Ảnh minh chứng";

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setImageUrl(null);
    setError(null);

    void submissionApiService
      .downloadAsset(submissionId, asset.id, fileName, false)
      .then(({ blob }) => {
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
        } else {
          setImageUrl(objectUrl);
        }
      })
      .catch((downloadError: unknown) => {
        if (!cancelled) setError(getApiErrorMessage(downloadError));
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [asset.id, fileName, submissionId]);

  if (error) {
    return (
      <div className="flex min-h-28 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="min-w-0 break-words">{fileName}: {error}</span>
      </div>
    );
  }

  if (!imageUrl) {
    return <div className="flex min-h-28 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-500">Đang tải ảnh minh chứng…</div>;
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => onPreview({ url: imageUrl, fileName })}
        className="group block aspect-[4/3] w-full overflow-hidden bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        aria-label={`Xem ảnh ${fileName}`}
      >
        <img src={imageUrl} alt={fileName} className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-[1.02]" />
      </button>
      <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2">
        <span className="truncate text-xs text-slate-600" title={fileName}>{fileName}</span>
        <a
          href={imageUrl}
          download={fileName}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
          aria-label={`Tải ảnh ${fileName}`}
          title="Tải ảnh"
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
};

export const EvaluationView = ({ onShowToast }: { onShowToast: (msg: string) => void }) => {
  const { profile, internshipId } = useStudentPortal();
  const { selectedSemester, activeSemesterId } = useSemester();
  const [evaluation, setEvaluation] = useState<EvaluationDetailDto | null>(null);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReportDto[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionDto[]>([]);
  const [schedules, setSchedules] = useState<SemesterReportScheduleDto[]>([]);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; fileName: string } | null>(null);

  const loadEvaluation = useCallback(async () => {
    if (!internshipId) {
      setEvaluation(null);
      setWeeklyReports([]);
      setSubmissions([]);
      setSchedules([]);
      setLoadErrors([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const [evaluationResult, reportsResult, submissionsResult, schedulesResult] = await Promise.allSettled([
      evaluationService.getByInternship(internshipId),
      weeklyReportService.getMine(),
      submissionApiService.getMine(),
      activeSemesterId
        ? semesterReportScheduleService.getSchedules(activeSemesterId)
        : Promise.resolve([] as SemesterReportScheduleDto[]),
    ]);

    const errors: string[] = [];
    if (evaluationResult.status === "fulfilled") {
      setEvaluation(evaluationResult.value);
    } else {
      setEvaluation(null);
      errors.push("Không tải được kết quả đánh giá.");
    }
    if (reportsResult.status === "fulfilled") {
      setWeeklyReports(reportsResult.value.filter((report) => report.internshipId === internshipId));
    } else {
      setWeeklyReports([]);
      errors.push("Không tải được dữ liệu báo cáo tuần.");
    }
    if (submissionsResult.status === "fulfilled") {
      setSubmissions(submissionsResult.value.filter((submission) => submission.internshipId === internshipId));
    } else {
      setSubmissions([]);
      errors.push("Không tải được điểm doanh nghiệp và minh chứng.");
    }
    if (schedulesResult.status === "fulfilled") {
      setSchedules(schedulesResult.value);
    } else {
      setSchedules([]);
      errors.push("Không tải được lịch báo cáo tuần.");
    }
    setLoadErrors(errors);
    setIsLoading(false);
  }, [activeSemesterId, internshipId]);

  useEffect(() => {
    void loadEvaluation();
  }, [loadEvaluation]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadEvaluation();
      onShowToast("Đã làm mới kết quả đánh giá thành công");
    } finally {
      setIsRefreshing(false);
    }
  };

  const maxWeeks = selectedSemester?.totalWeeks;
  const trackedWeeks = useMemo(() => {
    const scheduled = schedules
      .map((schedule) => schedule.weekNumber)
      .filter((week) => week >= 1 && (!maxWeeks || week <= maxWeeks));
    const reported = weeklyReports
      .map((report) => report.weekNumber)
      .filter((week) => week >= 1 && (!maxWeeks || week <= maxWeeks));
    return [...new Set([...scheduled, ...reported])].sort((a, b) => a - b);
  }, [maxWeeks, schedules, weeklyReports]);

  const reportByWeek = useMemo(
    () => new Map(weeklyReports.map((report) => [report.weekNumber, report])),
    [weeklyReports],
  );
  const scheduleByWeek = useMemo(
    () => new Map(schedules.map((schedule) => [schedule.weekNumber, schedule])),
    [schedules],
  );
  const evidenceSubmissions = useMemo(
    () =>
      submissions
        .filter((item) => item.type.toLowerCase() === "evidence" && !["rejected", "draft"].includes(item.status.toLowerCase()))
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [submissions],
  );
  const employerScoreSubmission = evidenceSubmissions.find((item) => item.employerScore != null);
  const finalReport = submissions.find((item) => item.type.toLowerCase() === "finalreport" && item.status.toLowerCase() !== "rejected");
  const product = submissions.find((item) => item.type.toLowerCase() === "product" && item.status.toLowerCase() !== "rejected");
  const processScore = useMemo(() => {
    if (loadErrors.includes("Không tải được lịch báo cáo tuần.")) return null;

    const weeks = schedules
      .filter((schedule) => !schedule.isFinalReport && schedule.weekNumber >= 1 && (!maxWeeks || schedule.weekNumber <= maxWeeks))
      .map((schedule) => ({
        weekNumber: schedule.weekNumber,
        isSubmissionOpen: schedule.isSubmissionOpen,
        submittedAt: reportByWeek.get(schedule.weekNumber)?.submittedAt,
        deadline: schedule.dueDate,
      }));
    const weeklyQualityLevels = weeks
      .map((week) => evaluation?.weeklyQualityScores?.[week.weekNumber])
      .filter((score): score is number => score != null);

    return computeGrade({
      weeks,
      weeklyQualityLevels,
      hasCreativeProduct: evaluation?.hasCreativeProduct ?? submissions.some(
        (item) => item.type.toLowerCase() === "product" && item.status.toLowerCase() === "approved",
      ),
    }).processScore;
  }, [evaluation, loadErrors, maxWeeks, reportByWeek, schedules, submissions]);
  const submittedWeekCount = trackedWeeks.filter((week) => Boolean(reportByWeek.get(week)?.submittedAt)).length;
  const lateWeekCount = trackedWeeks.filter((week) => {
    const report = reportByWeek.get(week);
    const dueDate = scheduleByWeek.get(week)?.dueDate ?? report?.dueDate;
    return Boolean(report?.submittedAt && dueDate && new Date(report.submittedAt) > new Date(dueDate));
  }).length;
  const finalGrade = evaluation?.finalGrade ?? (profile.currentGrade > 0 ? profile.currentGrade : null);
  const classification = finalGrade == null
    ? "—"
    : finalGrade >= 8.5 ? "Xuất sắc"
      : finalGrade >= 8 ? "Giỏi"
        : finalGrade >= 6.5 ? "Khá"
          : finalGrade >= 5 ? "Trung bình" : "Không đạt";
  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";
  const statusLabel = (status: string) => ({
    Draft: "Bản nháp",
    Submitted: "Đã nộp",
    Reviewed: "Đã xem",
    Approved: "Đã duyệt",
    RevisionRequested: "Cần sửa",
  }[status] ?? status);
  const displayedGrade = loadErrors.includes("Không tải được kết quả đánh giá.")
    ? null
    : finalGrade;

  const retryLoading = () => {
    void loadEvaluation().catch((error: unknown) => onShowToast(getApiErrorMessage(error)));
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 animate-in fade-in duration-200 font-sans pb-12">
      {/* ═══════════════════════════════════════════════════════════════════
          1. TOP CARD BANNER (Chuẩn layout banner xanh #026aa7 + thông tin thực tế)
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <StudentSubPageHeader
          icon={Award}
          title="Kết quả đánh giá thực tập"
          subtitle="Theo dõi nhận xét và kết quả đánh giá từ đơn vị hướng dẫn."
          semesterName={selectedSemester?.name}
          onRefresh={() => void handleRefresh()}
          isRefreshing={isRefreshing}
        />


      </div>


      {/* ═══════════════════════════════════════════════════════════════════
          CẢNH BÁO LỖI TẢI DỮ LIỆU (nếu có)
         ═══════════════════════════════════════════════════════════════════ */}
      {loadErrors.length > 0 && (
        <div role="alert" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-2xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Một số thông tin chưa tải được</p>
            <ul className="mt-1 list-inside list-disc text-xs leading-5">{loadErrors.map((error) => <li key={error}>{error}</li>)}</ul>
          </div>
          <button
            type="button"
            onClick={retryLoading}
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-amber-300 px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />Tải lại
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          3. NỘI DUNG CHÍNH
         ═══════════════════════════════════════════════════════════════════ */}
      {isLoading ? (
        <div className="rounded-xl border border-slate-200/90 bg-white p-14 text-center text-sm text-slate-500 shadow-2xs">
          Đang tải kết quả thực tập…
        </div>
      ) : !internshipId ? (
        <div className="rounded-xl border border-slate-200/90 bg-white py-12 text-center shadow-2xs">
          <ClipboardCheck className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-800">Chưa có kỳ thực tập để hiển thị</p>
          <p className="mt-1 text-xs text-slate-500">Thông tin kết quả sẽ xuất hiện khi hồ sơ thực tập được tạo.</p>
        </div>
      ) : (
        <>
          {/* ─── HÀNG 1: Điểm tổng kết + Chi tiết đánh giá GV ─── */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1.5fr)]">
            {/* Card Điểm tổng kết */}
            <div className="relative overflow-hidden rounded-xl border border-blue-700 bg-gradient-to-br from-blue-800 via-blue-700 to-blue-600 text-white shadow-md shadow-blue-900/15">
              {evaluation?.isFinalized && displayedGrade != null && (
                <svg
                  aria-hidden="true"
                  className="student-result-fireworks"
                  viewBox="0 0 360 190"
                  preserveAspectRatio="xMaxYMin slice"
                >
                  <g transform="translate(270 48)">
                    <g className="student-result-fireworks__burst">
                      <circle r="2" fill="#fff" />
                      <path d="M0-27V-19M19-19L14-14M27 0H19M19 19L14 14M0 27V19M-19 19L-14 14M-27 0H-19M-19-19L-14-14" />
                      <circle cx="0" cy="-34" r="1.5" />
                      <circle cx="31" cy="0" r="1.5" />
                      <circle cx="-22" cy="22" r="1.5" />
                    </g>
                  </g>
                  <g transform="translate(330 112)">
                    <g className="student-result-fireworks__burst student-result-fireworks__burst--delayed">
                      <circle r="1.5" fill="#fff" />
                      <path d="M0-19V-13M13-13L9-9M19 0H13M13 13L9 9M0 19V13M-13 13L-9 9M-19 0H-13M-13-13L-9-9" />
                      <circle cx="0" cy="-25" r="1.2" />
                      <circle cx="23" cy="0" r="1.2" />
                      <circle cx="-18" cy="18" r="1.2" />
                    </g>
                  </g>
                </svg>
              )}
              <div className="relative z-10 flex flex-col gap-8 p-5 sm:p-6">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-100">
                    <Award className="h-4 w-4 text-white" />
                    Điểm tổng kết
                  </div>
                  <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-2">
                    <strong className="font-display text-6xl font-extrabold leading-none tracking-tight text-white">{displayedGrade == null ? "—" : displayedGrade.toFixed(1)}</strong>
                    <span className="pb-1 text-sm font-medium text-blue-100">/ 10</span>
                    <span className="mb-0.5 inline-flex items-center rounded-full border border-white/25 bg-white/15 px-3 py-1 text-sm font-bold text-white">
                      {displayedGrade == null ? "Chưa có kết quả" : classification}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    evaluation?.isFinalized ? "bg-emerald-100 text-emerald-900" : "bg-white/15 text-white"
                  }`}>
                    {evaluation?.isFinalized ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                    {loadErrors.includes("Không tải được kết quả đánh giá.")
                      ? "Chưa tải được kết quả"
                      : evaluation?.isFinalized ? "Đã công bố" : evaluation ? "Chưa công bố" : displayedGrade != null ? "Điểm trên hồ sơ" : "Chưa có kết quả"}
                  </span>
                  {evaluation && <span className="text-xs text-blue-100">Cập nhật {formatDate(evaluation.updatedAt ?? evaluation.evaluatedAt)}</span>}
                </div>
              </div>
            </div>

            {/* Card Chi tiết đánh giá GV */}
            <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs">
              <div className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Chi tiết đánh giá của giảng viên</h2>
                    <p className="mt-1 text-xs text-slate-500">Các khoản điểm trong đánh giá thực tập.</p>
                  </div>
                  {evaluation?.evaluatedBy?.fullName && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                      <UserRound className="h-3.5 w-3.5" />{evaluation.evaluatedBy.fullName}
                    </span>
                  )}
                </div>
                <dl className="mt-1 divide-y divide-slate-100">
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-sm font-medium text-slate-800">Chất lượng báo cáo</dt>
                    <dd className="text-right text-sm font-bold tabular-nums text-slate-900">
                      {evaluation?.qualityLevel != null ? `${evaluation.qualityLevel}/5` : "Chưa chấm"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-sm font-medium text-slate-800">Sản phẩm sáng tạo</dt>
                    <dd className="text-right text-sm font-bold text-slate-900">
                      {evaluation?.hasCreativeProduct || submissions.some(
                        (item) => item.type.toLowerCase() === "product" && item.status.toLowerCase() === "approved",
                      ) ? "Đạt yêu cầu (+1.0 điểm)" : "Chưa đạt"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-sm font-medium text-slate-800">Tổng điểm quá trình</dt>
                    <dd className="text-right text-sm font-bold tabular-nums text-slate-900">
                      {processScore == null ? "Chưa có dữ liệu" : `${processScore}/10`}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-sm font-medium text-slate-800">Thi vấn đáp</dt>
                    <dd className="text-right text-sm font-bold tabular-nums text-slate-900">
                      {evaluation?.oralExamScore != null ? `${evaluation.oralExamScore}/10` : "Chưa chấm"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          {/* ─── HÀNG 2: Đánh giá doanh nghiệp + Tiến độ báo cáo tuần ─── */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            {/* Card Đánh giá doanh nghiệp */}
            <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs">
              <div className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <Building2 className="h-4 w-4 text-blue-700" />Đánh giá từ doanh nghiệp
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">Điểm doanh nghiệp được hiển thị riêng, không cộng vào điểm tổng kết.</p>
                  </div>
                  <strong className="font-display text-2xl tabular-nums text-slate-900">
                    {employerScoreSubmission?.employerScore != null ? `${employerScoreSubmission.employerScore}/10` : "—"}
                  </strong>
                </div>
                {loadErrors.includes("Không tải được điểm doanh nghiệp và minh chứng.") ? (
                  <p className="pt-4 text-sm text-amber-800">Không thể xác nhận điểm và minh chứng doanh nghiệp do dữ liệu chưa tải được.</p>
                ) : evidenceSubmissions.length === 0 ? (
                  <p className="pt-4 text-sm text-slate-500">Chưa có phiếu đánh giá hoặc minh chứng doanh nghiệp được nộp.</p>
                ) : (
                  <div className="space-y-5 pt-4">
                    {evidenceSubmissions.map((submission) => {
                      const imageAssets = (submission.assets ?? []).filter((asset) =>
                        asset.mimeType?.toLowerCase().startsWith("image/") ||
                        /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(asset.fileName ?? ""),
                      );
                      return (
                        <div key={submission.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                            <p className="text-sm font-semibold text-slate-800">{submission.title || "Phiếu đánh giá doanh nghiệp"}</p>
                            <span className="text-xs text-slate-500">{statusLabel(submission.status)} · {formatDate(submission.submittedAt)}</span>
                          </div>
                          {submission.employerScore != null && (
                            <p className="mt-1 text-xs text-slate-600">Điểm doanh nghiệp: <strong className="text-slate-900">{submission.employerScore}/10</strong> <span className="text-slate-500">(tham khảo)</span></p>
                          )}
                          {submission.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{submission.description}</p>}
                          {imageAssets.length > 0 ? (
                            <div className="mt-3">
                              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                <ImageIcon className="h-3.5 w-3.5" />Ảnh minh chứng ({imageAssets.length})
                              </p>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {imageAssets.map((asset) => (
                                  <EvidencePhoto
                                    key={asset.id}
                                    submissionId={submission.id}
                                    asset={asset}
                                    onPreview={setPreviewPhoto}
                                  />
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500">
                              <ImageIcon className="h-3.5 w-3.5" />Phiếu này không có tệp ảnh đính kèm.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Card Tiến độ báo cáo tuần */}
            <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <ClipboardCheck className="h-4 w-4 text-blue-700" />Tiến độ báo cáo tuần
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">Tình trạng nộp và điểm chất lượng được ghi nhận.</p>
                  </div>
                  {trackedWeeks.length > 0 && (
                    <span className="shrink-0 text-xs font-semibold text-slate-700">{submittedWeekCount}/{trackedWeeks.length} đã nộp</span>
                  )}
                </div>
                {trackedWeeks.length === 0 ? (
                  <p className="pt-4 text-sm text-slate-500">
                    {loadErrors.includes("Không tải được lịch báo cáo tuần.") || loadErrors.includes("Không tải được dữ liệu báo cáo tuần.")
                      ? "Không đủ dữ liệu để hiển thị tiến độ báo cáo."
                      : "Chưa có lịch hoặc báo cáo tuần cho kỳ thực tập này."}
                  </p>
                ) : (
                  <div className="mt-2 divide-y divide-slate-100">
                    {trackedWeeks.map((week) => {
                      const report = reportByWeek.get(week);
                      const schedule = scheduleByWeek.get(week);
                      const dueDate = schedule?.dueDate ?? report?.dueDate;
                      const isLate = Boolean(report?.submittedAt && dueDate && new Date(report.submittedAt) > new Date(dueDate));
                      const score = evaluation?.weeklyQualityScores?.[week] ?? report?.qualityScore;
                      return (
                        <div key={week} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">Tuần {week} · {report?.title || "Báo cáo tuần"}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {report?.submittedAt ? `Nộp ${formatDate(report.submittedAt)}` : "Chưa nộp"}
                              {dueDate ? ` · Hạn ${formatDate(dueDate)}` : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              report?.submittedAt ? (isLate ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800") : "bg-slate-100 text-slate-600"
                            }`}>
                              {report?.submittedAt ? (isLate ? "Đã nộp trễ" : statusLabel(report.status)) : "Chưa nộp"}
                            </span>
                            <p className="mt-1 text-xs tabular-nums text-slate-600">Chất lượng: {score != null ? `${score}/5` : "—"}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {lateWeekCount > 0 && <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-amber-800">Báo cáo nộp trễ: {lateWeekCount} tuần.</p>}
              </div>
            </div>
          </section>

          {/* ─── HÀNG 3: Báo cáo cuối kỳ + Sản phẩm thực tập ─── */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs">
              <div className="p-4">
                <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
                  <FileCheck2 className="h-4 w-4 text-blue-700" />Báo cáo cuối kỳ
                </h2>
                {finalReport ? (
                  <div className="pt-3">
                    <p className="text-sm font-semibold text-slate-800">{finalReport.title || finalReport.fileName || "Báo cáo thực tập"}</p>
                    <p className="mt-1 text-xs text-slate-500">Nộp {formatDate(finalReport.submittedAt)} · {statusLabel(finalReport.status)}</p>
                  </div>
                ) : (
                  <p className="pt-3 text-sm text-slate-500">Chưa có báo cáo cuối kỳ được ghi nhận.</p>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs">
              <div className="p-4">
                <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
                  <Package className="h-4 w-4 text-blue-700" />Sản phẩm thực tập
                </h2>
                {product ? (
                  <div className="pt-3">
                    <p className="text-sm font-semibold text-slate-800">{product.title || product.fileName || "Sản phẩm thực tập"}</p>
                    <p className="mt-1 text-xs text-slate-500">Nộp {formatDate(product.submittedAt)} · {statusLabel(product.status)}</p>
                  </div>
                ) : (
                  <p className="pt-3 text-sm text-slate-500">Chưa có sản phẩm thực tập được ghi nhận.</p>
                )}
              </div>
            </div>
          </section>

          {/* ─── HÀNG 4: Nhận xét GV + Điểm mạnh / Cần cải thiện ─── */}
          {evaluation && (
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                <div className="p-4">
                  <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
                    <MessageSquare className="h-4 w-4 text-blue-700" />Nhận xét của giảng viên
                  </h2>
                  <p className="whitespace-pre-wrap pt-3 text-sm leading-6 text-slate-700">{evaluation.comments || "Chưa có nhận xét."}</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                <div className="p-4 space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-emerald-800">Điểm mạnh</h2>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{evaluation.strengths || "Chưa có nội dung được cập nhật."}</p>
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <h2 className="text-sm font-bold text-amber-800">Điểm cần cải thiện</h2>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{evaluation.areasForImprovement || "Chưa có nội dung được cập nhật."}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Footer thông tin đánh giá */}
          {evaluation && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" />Ngày đánh giá: {formatDate(evaluation.evaluatedAt)}
              {evaluation.defenseCouncilName ? ` · Hội đồng: ${evaluation.defenseCouncilName}` : ""}
              {evaluation.defenseExaminerName ? ` · Giám khảo: ${evaluation.defenseExaminerName}` : ""}
            </p>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL XEM ẢNH MINH CHỨNG
         ═══════════════════════════════════════════════════════════════════ */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Xem ảnh ${previewPhoto.fileName}`}
          onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewPhoto(null); }}
        >
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <p className="truncate text-sm font-semibold text-slate-900">{previewPhoto.fileName}</p>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                aria-label="Đóng xem ảnh"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3">
              <img src={previewPhoto.url} alt={previewPhoto.fileName} className="mx-auto max-h-[78vh] max-w-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
