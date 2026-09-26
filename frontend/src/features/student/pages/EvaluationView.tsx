import { Award, CalendarDays, CheckCircle2, ClipboardCheck, FileCheck2, FileText, MessageSquare, Package, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";
import { useSemester } from "../../../contexts/SemesterContext";
import { Panel } from "../../../components/common/Panel";
import { evaluationService } from "../../../services/evaluation.service";
import { submissionApiService } from "../../../services/submissionApi.service";
import { weeklyReportService } from "../../../services/weeklyReport.service";
import {
  semesterReportScheduleService,
  type SemesterReportScheduleDto,
} from "../../../services/semesterReportSchedule.service";
import type { EvaluationDetailDto, SubmissionDto, WeeklyReportDto } from "../../../types/api";

export const EvaluationView = ({
  onShowToast,
}: {
  onShowToast: (msg: string) => void;
}) => {
  const { profile, internshipId } = useStudentPortal();
  const { selectedSemester, activeSemesterId } = useSemester();
  const [evaluation, setEvaluation] = useState<EvaluationDetailDto | null>(null);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReportDto[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionDto[]>([]);
  const [schedules, setSchedules] = useState<SemesterReportScheduleDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadEvaluation = useCallback(async () => {
    if (!internshipId) {
      setEvaluation(null);
      setWeeklyReports([]);
      setSubmissions([]);
      setSchedules([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [detailResult, reportsResult, submissionsResult, schedulesResult] = await Promise.allSettled([
        evaluationService.getByInternship(internshipId),
        weeklyReportService.getMine(),
        submissionApiService.getMine(),
        activeSemesterId
          ? semesterReportScheduleService.getSchedules(activeSemesterId)
          : Promise.resolve([] as SemesterReportScheduleDto[]),
      ]);
      setEvaluation(detailResult.status === "fulfilled" ? detailResult.value : null);
      setWeeklyReports(
        reportsResult.status === "fulfilled"
          ? reportsResult.value.filter((report) => report.internshipId === internshipId)
          : [],
      );
      setSubmissions(
        submissionsResult.status === "fulfilled"
          ? submissionsResult.value.filter((submission) => submission.internshipId === internshipId)
          : [],
      );
      setSchedules(schedulesResult.status === "fulfilled" ? schedulesResult.value : []);
    } catch {
      setEvaluation(null);
      setWeeklyReports([]);
      setSubmissions([]);
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  }, [internshipId, activeSemesterId]);

  useEffect(() => {
    void loadEvaluation();
  }, [loadEvaluation]);

  const currentGrade = evaluation?.finalGrade ?? profile.currentGrade;
  const semesterTotalWeeks = selectedSemester?.totalWeeks || 6;
  const openWeeklySchedules = useMemo(
    () =>
      schedules.filter(
        (schedule) =>
          schedule.isSubmissionOpen &&
          schedule.weekNumber >= 1 &&
          schedule.weekNumber <= semesterTotalWeeks,
      ),
    [schedules, semesterTotalWeeks],
  );
  const trackedWeeks =
    openWeeklySchedules.length > 0
      ? openWeeklySchedules.map((schedule) => schedule.weekNumber)
      : Array.from({ length: profile.progressBreakdown?.requiredWeeksCount || semesterTotalWeeks }, (_, index) => index + 1);
  const finalReport = submissions.find((item) => item.type.toLowerCase() === "finalreport" && item.status.toLowerCase() !== "rejected");
  const product = submissions.find((item) => item.type.toLowerCase() === "product" && item.status.toLowerCase() !== "rejected");
  const reportByWeek = new Map(weeklyReports.map((report) => [report.weekNumber, report]));
  const now = new Date();
  const missingCount = trackedWeeks.filter((week) => {
    const report = reportByWeek.get(week);
    const schedule = openWeeklySchedules.find((item) => item.weekNumber === week);
    const due = schedule?.dueDate ?? report?.dueDate;
    return !report?.submittedAt && due && new Date(due) < now;
  }).length;
  const lateCount = trackedWeeks.filter((week) => {
    const report = reportByWeek.get(week);
    const schedule = openWeeklySchedules.find((item) => item.weekNumber === week);
    const due = schedule?.dueDate ?? report?.dueDate;
    return report?.submittedAt && due && new Date(report.submittedAt) > new Date(due);
  }).length;
  const ratedQuality = evaluation?.weeklyQualityScores ? Object.values(evaluation.weeklyQualityScores) : [];
  const qualityScore = ratedQuality.length > 0
    ? ratedQuality.reduce((sum, score) => sum + score, 0) / ratedQuality.length
    : evaluation?.qualityLevel ?? null;
  const submittedWeekCount = trackedWeeks.filter((week) => reportByWeek.get(week)?.submittedAt).length;
  const processScore = Math.min(10, Math.max(0, 2 - missingCount * 0.5) + (submittedWeekCount > 0 ? Math.max(0, 2 - lateCount * 0.5) : 0) + (qualityScore ?? 0) + (evaluation?.hasCreativeProduct ? 1 : 0));
  const classification = currentGrade >= 8.5 ? "Xuất sắc" : currentGrade >= 8 ? "Giỏi" : currentGrade >= 6.5 ? "Khá" : currentGrade >= 5 ? "Trung bình" : currentGrade > 0 ? "Không đạt" : "—";
  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString("vi-VN") : "—";
  const statusLabel = (status: string) => ({
    Draft: "Bản nháp",
    Submitted: "Đã nộp",
    Reviewed: "Đã xem",
    Approved: "Đã duyệt",
    RevisionRequested: "Cần sửa",
  }[status] ?? status);

  return (
    <div className="mx-auto max-w-[1000px] space-y-4 animate-in fade-in duration-200">
      <Panel className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-3 text-white"><Award className="h-6 w-6" /></div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Kết quả đánh giá thực tập</h1>
          <p className="text-xs text-slate-500">Theo dõi điểm số, nhận xét và trạng thái công bố từ giảng viên.</p>
        </div>
      </Panel>

      {isLoading ? <Panel className="py-12 text-center text-sm text-slate-500">Đang tải bảng tổng hợp...</Panel> : <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.1fr_2fr]">
        <Panel className="flex flex-col items-center justify-center text-center">
          <p className="text-xs font-medium text-slate-500">Điểm tổng kết</p>
          <p className="mt-2 text-5xl font-black text-slate-900">
            {evaluation ? evaluation.finalGrade.toFixed(1) : currentGrade || "—"}
          </p>
          <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            evaluation?.isFinalized
              ? "bg-emerald-100 text-emerald-700"
              : evaluation
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-500"
          }`}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {evaluation?.isFinalized ? "Đã công bố" : evaluation ? "Đã cập nhật điểm" : "Chưa có kết quả"}
          </span>
          <p className="mt-3 text-xs text-slate-500">
            {evaluation ? `Cập nhật ngày ${formatDate(evaluation.updatedAt ?? evaluation.evaluatedAt)}` : "Kết quả sẽ hiển thị sau khi giảng viên lưu đánh giá."}
          </p>
        </Panel>

        <Panel>
          <div className="mb-3 flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Các cột điểm tổng hợp</h2>
          </div>
          {evaluation ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-slate-500">Điểm QT</p>
                  <strong className="text-sm text-slate-900">{processScore.toFixed(1)}/10</strong>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                  <p className="text-[11px] text-blue-600">Điểm thi vấn đáp</p>
                  <strong className="text-sm text-blue-900">{evaluation.oralExamScore != null ? `${evaluation.oralExamScore}/10` : "Chưa nhập"}</strong>
                </div>
                <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2">
                  <p className="text-[11px] text-indigo-600">Chất lượng báo cáo</p>
                  <strong className="text-sm text-indigo-900">{evaluation.qualityLevel != null ? `${evaluation.qualityLevel}/5` : "Chưa chấm"}</strong>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <p className="text-[11px] text-emerald-600">Sản phẩm sáng tạo</p>
                  <strong className="text-sm text-emerald-900">{evaluation.hasCreativeProduct ? "+1.0 điểm" : "Không cộng"}</strong>
                </div>
                <div className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2">
                  <p className="text-[11px] text-violet-600">Xếp loại</p>
                  <strong className="text-sm text-violet-900">{classification}</strong>
                </div>
              </div>
              {evaluation.weeklyQualityScores && Object.keys(evaluation.weeklyQualityScores).length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="mb-2 text-xs font-semibold text-slate-700">Chất lượng từng báo cáo tuần</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(evaluation.weeklyQualityScores)
                      .sort(([first], [second]) => Number(first) - Number(second))
                      .map(([week, score]) => (
                        <span key={week} className="rounded-md bg-white px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                          Tuần {week}: <strong className="text-slate-900">{score}/5</strong>
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Chưa có dữ liệu chi tiết.</p>
          )}
        </Panel>
      </div>

      <Panel>
        <div className="mb-3 flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">Theo dõi báo cáo theo tuần</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead><tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500"><th className="px-3 py-2">Tuần</th><th className="px-3 py-2">Báo cáo</th><th className="px-3 py-2">Hạn nộp</th><th className="px-3 py-2">Đã nộp</th><th className="px-3 py-2">Trạng thái</th><th className="px-3 py-2 text-center">Điểm chất lượng</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {trackedWeeks.map((week) => {
                const report = reportByWeek.get(week);
                const schedule = openWeeklySchedules.find((item) => item.weekNumber === week);
                const score = evaluation?.weeklyQualityScores?.[week];
                return <tr key={week}><td className="px-3 py-2.5 font-semibold">Tuần {week}</td><td className="px-3 py-2.5">{report?.title || schedule?.title || "Chưa nộp"}</td><td className="px-3 py-2.5 text-slate-500">{formatDate(schedule?.dueDate ?? report?.dueDate)}</td><td className="px-3 py-2.5 text-slate-500">{formatDate(report?.submittedAt)}</td><td className="px-3 py-2.5"><span className={`rounded-full px-2 py-1 text-xs ${report ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{report ? statusLabel(report.status) : "Chưa nộp"}</span></td><td className="px-3 py-2.5 text-center font-semibold">{score != null ? `${score}/5` : "—"}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel>
          <div className="mb-3 flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-bold text-slate-900">Báo cáo cuối kỳ</h2></div>
          {finalReport ? <div className="space-y-1 text-sm"><p className="font-semibold text-slate-900">{finalReport.title || finalReport.fileName || "Báo cáo thực tập tốt nghiệp"}</p><p className="text-xs text-slate-500">Nộp ngày {formatDate(finalReport.submittedAt)} · {statusLabel(finalReport.status)}</p></div> : <p className="text-sm text-slate-500">Chưa nộp báo cáo cuối kỳ.</p>}
        </Panel>
        <Panel>
          <div className="mb-3 flex items-center gap-2"><Package className="h-4 w-4 text-emerald-600" /><h2 className="text-sm font-bold text-slate-900">Sản phẩm thực tế</h2></div>
          {product ? <div className="space-y-1 text-sm"><p className="font-semibold text-slate-900">{product.title || product.fileName || "Sản phẩm thực tế"}</p><p className="text-xs text-slate-500">Nộp ngày {formatDate(product.submittedAt)} · {statusLabel(product.status)}</p></div> : <p className="text-sm text-slate-500">Chưa nộp sản phẩm. Không cộng điểm sáng tạo.</p>}
        </Panel>
      </div>

      {evaluation && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel>
            <div className="mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Nhận xét của giảng viên</h2>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{evaluation.comments || "Chưa có nhận xét."}</p>
          </Panel>
          <Panel className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-emerald-700">Điểm mạnh</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{evaluation.strengths || "Chưa cập nhật."}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-700">Cần cải thiện</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{evaluation.areasForImprovement || "Chưa cập nhật."}</p>
            </div>
          </Panel>
        </div>
      )}
      </>}

      {evaluation && (
        <Panel className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" /> {evaluation.evaluatedBy?.fullName || "Giảng viên phụ trách"}</span>
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Đánh giá ngày {formatDate(evaluation.evaluatedAt)}</span>
        </Panel>
      )}
    </div>
  );
};
