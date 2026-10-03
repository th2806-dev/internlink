import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Target,
  FileCheck2,
  Award,
  Clock,
  CheckCircle2,
  Circle,
  ArrowRight,
  Building2,
  MessageSquare,
  Bell,
  Calendar as CalendarIcon,
  UserCheck,
  ExternalLink,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  LayoutDashboard,
  Lock,
} from "lucide-react";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";
import { useSemester } from "../../../contexts/SemesterContext";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { CompanyAvatar } from "../../../components/common/CompanyAvatar";
import { useWeeklyReports } from "../../../hooks/useWeeklyReports";
import { useStudentNotifications } from "../../../hooks/useStudentNotifications";
import { getApiErrorMessage } from "../../../lib/apiClient";
import {
  EducationDashboardChart,
  buildProgressChartData,
  gradeLabel,
} from "../components/EducationDashboardChart";
import { KpiCard, KpiGrid } from "../../../components/common/KpiCard";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { INTERNSHIP_WEEKS } from "../../../config/internship";
import { evaluationService } from "../../../services/evaluation.service";
import { submissionApiService } from "../../../services/submissionApi.service";
import { semesterReportScheduleService, type SemesterReportScheduleDto } from "../../../services/semesterReportSchedule.service";
import type { EvaluationDetailDto } from "../../../types/api";

const DEFAULT_AVATAR = "";

export const DashboardView = ({
  onNavigate,
  onShowToast,
}: {
  onNavigate?: (tab: string) => void;
  onShowToast?: (msg: string, type?: string) => void;
}) => {
  const { profile, internship, internshipId } = useStudentPortal();
  const { selectedSemester, activeSemesterId } = useSemester();
  const hasActiveSemester = !!activeSemesterId;
  const { reports, loading: reportsLoading, error: reportsError } = useWeeklyReports();
  const { notifications, loading: notificationsLoading } = useStudentNotifications();
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<{
    id: string;
    senderName: string;
    senderRole: string;
    avatar: string;
    timeAgo: string;
    preview: string;
    detail: string;
    status: string;
    reportRef: string;
    sortKey: string;
  } | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitWeek, _setSubmitWeek] = useState("Báo cáo tuần");
  const [evaluation, setEvaluation] = useState<EvaluationDetailDto | null>(null);
  const [reportSchedules, setReportSchedules] = useState<SemesterReportScheduleDto[]>([]);
  const [submissionComments, setSubmissionComments] = useState<
    { id: string; title: string; comment: string; date: string }[]
  >([]);

  const semesterWeeks = selectedSemester?.totalWeeks || INTERNSHIP_WEEKS;
  const scheduleSemesterId = internship?.semesterId ?? selectedSemester?.id ?? activeSemesterId;
  const totalWeeks = Math.max(
    profile.progressBreakdown?.requiredWeeksCount ?? 0,
    profile.totalReports,
    reports.length,
    semesterWeeks,
  );

  const loadExtra = useCallback(async () => {
    if (internshipId) {
      const ev = await evaluationService.getByInternship(internshipId);
      setEvaluation(ev);
    } else {
      setEvaluation(null);
    }
    try {
      const subs = await submissionApiService.getMine();
      setSubmissionComments(
        subs.flatMap((sub) =>
          (sub.feedbacks ?? [])
            .filter((f) => f.isPublic)
            .map((f) => ({
              id: f.id,
              title: sub.title ?? sub.type,
              comment: f.comment,
              date: f.createdAt,
            })),
        ),
      );
    } catch {
      setSubmissionComments([]);
    }
  }, [internshipId]);

  useEffect(() => {
    loadExtra();
  }, [loadExtra]);

  useEffect(() => {
    let cancelled = false;
    if (!scheduleSemesterId) {
      setReportSchedules([]);
      return;
    }
    semesterReportScheduleService.getSchedules(scheduleSemesterId)
      .then((schedules) => {
        if (!cancelled) setReportSchedules(schedules);
      })
      .catch(() => {
        if (!cancelled) setReportSchedules([]);
      });
    return () => {
      cancelled = true;
    };
  }, [scheduleSemesterId]);

  useEffect(() => {
    if (reportsError) {
      onShowToast?.(getApiErrorMessage(reportsError));
    }
  }, [reportsError, onShowToast]);

  const currentGrade = evaluation?.finalGrade ?? profile.currentGrade ?? 0;

  const chartData = useMemo(
    () => buildProgressChartData(reports, totalWeeks),
    [reports, totalWeeks],
  );

  const approvedCount = reports.filter((r) => r.status === "approved").length;

  const onTimeRate = useMemo(() => {
    const submitted = reports.filter((r) => r.status !== "draft").length;
    if (!submitted) return 0;
    return Math.round((approvedCount / submitted) * 100);
  }, [reports, approvedCount]);

  const tasks = useMemo(() => {
    return reports
      .filter((r) => r.status !== "approved")
      .map((report) => ({
        id: report.id,
        weekNumber: report.weekNumber,
        title: `Báo cáo tuần ${report.weekNumber}: ${report.title}`,
        deadline: reportSchedules.find((schedule) => schedule.weekNumber === report.weekNumber)?.dueDate
          ? new Date(reportSchedules.find((schedule) => schedule.weekNumber === report.weekNumber)!.dueDate).toLocaleDateString("vi-VN")
          : "Chưa cấu hình hạn nộp",
        priority:
          report.status === "revised" || report.status === "draft"
            ? "Cao"
            : report.status === "submitted"
              ? "Trung bình"
              : "Bình thường",
        actionLabel:
          report.status === "submitted"
            ? "Chờ duyệt"
            : report.status === "revised"
              ? "Chỉnh sửa"
              : "Nộp bài",
        completed: false,
        category: "Báo cáo",
      }));
  }, [reports, reportSchedules]);

  const feedbacks = useMemo(() => {
    const fromReports = reports
      .filter((r) => r.lecturerComment)
      .map((r) => ({
        id: r.id,
        senderName: profile.lecturerName,
        senderRole: "Giảng viên",
        avatar: DEFAULT_AVATAR,
        timeAgo: r.updatedAt
          ? new Date(r.updatedAt).toLocaleString("vi-VN")
          : "Vừa xong",
        preview: r.lecturerComment || "",
        detail: r.lecturerComment || "",
        status: "Đã phản hồi",
        reportRef: `Báo cáo tuần ${r.weekNumber}`,
        sortKey: r.updatedAt ?? "",
      }));

    const fromSubs = submissionComments.map((s) => ({
      id: s.id,
      senderName: profile.lecturerName,
      senderRole: "Giảng viên",
      avatar: DEFAULT_AVATAR,
      timeAgo: new Date(s.date).toLocaleString("vi-VN"),
      preview: s.comment,
      detail: s.comment,
      status: "Đã phản hồi",
      reportRef: s.title,
      sortKey: s.date,
    }));

    return [...fromReports, ...fromSubs]
      .sort(
        (a, b) =>
          new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime(),
      )
      .slice(0, 5);
  }, [reports, submissionComments, profile.lecturerName]);

  const nextReport = reports.find(
    (r) => r.status === "draft" || r.status === "revised",
  );
  const nextReportSchedule = (nextReport
    ? reportSchedules.find((schedule) => schedule.weekNumber === nextReport.weekNumber && schedule.isSubmissionOpen)
    : undefined) ?? reportSchedules
      .filter((schedule) => schedule.isSubmissionOpen && !schedule.isFinalReport)
      .filter((schedule) => !reports.some((report) =>
        report.weekNumber === schedule.weekNumber && report.status !== "draft" && report.status !== "revised",
      ))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  const daysUntilNextReport = nextReportSchedule
    ? Math.ceil((new Date(nextReportSchedule.dueDate).getTime() - Date.now()) / 86_400_000)
    : null;

  const milestones = useMemo(() => {
    return reports
      .filter((r) => r.status === "draft" || r.status === "revised")
      .sort((a, b) => a.weekNumber - b.weekNumber)
      .slice(0, 4)
      .map((r) => ({
        id: r.id,
        title: `Báo cáo tuần ${r.weekNumber}`,
        subtitle: r.title,
        urgent: r.status === "revised",
        label:
          r.status === "revised"
            ? "Cần chỉnh sửa"
            : r.submittedAt
              ? new Date(r.submittedAt).toLocaleDateString("vi-VN")
              : "Chưa nộp",
      }));
  }, [reports]);

  const currentWeekLabel =
    reports.length > 0
      ? `Tuần ${Math.max(...reports.map((r) => r.weekNumber))}`
      : "—";

  const isArchived = selectedSemester?.status === "completed";

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 animate-in fade-in duration-200">
      <PageHeader
        icon={LayoutDashboard}
        title={`Xin chào, ${profile.name}`}
        subtitle={`Thực tập sinh tại ${profile.company} · ${profile.position} · GVHD: ${profile.lecturerName}`}
        badge={profile.mssv}
        badgeColor="bg-blue-100 text-blue-800 border-blue-200"
      >
        <span className="max-w-full break-words rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800">
          {profile.statusBadge}
        </span>
      </PageHeader>

      {isArchived && (
        <div className="flex flex-col gap-2 rounded-md border border-slate-300 bg-slate-100 px-4 py-3 text-xs text-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2.5">
            <Lock className="w-4 h-4 text-slate-600 shrink-0" />
            <span className="min-w-0">
              Đợt thực tập <strong>{selectedSemester.name}</strong> đã kết thúc & đóng dữ liệu. Tài khoản của bạn đang ở chế độ <strong>Lưu trữ (Chỉ xem)</strong>.
            </span>
          </div>
          <span className="ml-6 w-fit shrink-0 rounded border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700 sm:ml-0">
            Hồ sơ đã lưu trữ
          </span>
        </div>
      )}

      {!hasActiveSemester && (
        <div className="flex items-start gap-2.5 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
          <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="min-w-0">
            Chưa có kỳ thực tập nào đang hoạt động. Dữ liệu sẽ tự động hiển thị khi Quản trị hệ thống bắt đầu kỳ thực tập.
          </span>
        </div>
      )}

      {showEmptyState ? (
        <Panel className="mx-auto max-w-2xl space-y-4 px-5 py-8 text-center sm:px-8" padding="none">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-700">
            <Building2 className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900">
              Bạn chưa bắt đầu kỳ thực tập
            </h3>
            <p className="mx-auto max-w-md text-sm leading-6 text-slate-600">
              Vui lòng hoàn tất đăng ký đợt thực tập, chọn doanh nghiệp nguyện
              vọng hoặc nộp hồ sơ xác nhận tiếp nhận để mở khóa toàn bộ tính
              năng báo cáo.
            </p>
          </div>
          <div className="flex flex-col items-stretch justify-center gap-2 pt-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => {
                setShowEmptyState(false);
                onShowToast?.(
                  "Đang mở Hướng dẫn Đăng ký thực tập đợt I - 2026",
                );
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-blue-700 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <span>Xem hướng dẫn đăng ký đợt</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.("student-templates")}
              className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Tải mẫu đơn đăng ký
            </button>
          </div>
        </Panel>
      ) : (
        <>
          <KpiGrid>
            <KpiCard
              tone="blue"
              title="Tiến độ thực tập"
              value={`${profile.overallProgress}%`}
              icon={Target}
              footer={`${profile.progressBreakdown?.submittedReportsCount ?? 0} / ${profile.progressBreakdown?.requiredWeeksCount ?? totalWeeks} báo cáo đã nộp`}
            />
            <KpiCard
              tone="emerald"
              title="Báo cáo đã nộp"
              value={`${profile.reportsSubmitted} / ${profile.totalReports}`}
              icon={FileCheck2}
              footer={`${reports.filter((r) => r.status !== "draft").length} báo cáo đã nộp`}
            />
            <KpiCard
              tone="amber"
              title="Điểm hiện tại"
              value={currentGrade || "—"}
              unit={currentGrade ? "/ 10" : undefined}
              icon={Award}
              footer={
                currentGrade
                  ? `Xếp loại: ${gradeLabel(currentGrade)}`
                  : "Chưa có điểm"
              }
            />
            <KpiCard
              tone="rose"
              title="Hạn nộp tiếp theo"
              value={daysUntilNextReport == null ? "—" : String(Math.abs(daysUntilNextReport))}
              unit={daysUntilNextReport == null ? undefined : daysUntilNextReport < 0 ? "ngày quá hạn" : "ngày còn lại"}
              icon={Clock}
              footer={
                nextReportSchedule
                  ? `Tuần ${nextReport?.weekNumber ?? nextReportSchedule.weekNumber}: ${nextReport?.title ?? nextReportSchedule.title}`
                  : nextReport
                    ? "Chưa có hạn nộp đang mở"
                    : "Không có báo cáo cần nộp"
              }
              onClick={() => {
                if (nextReport) onNavigate("student-weekly-reports");
              }}
            />
          </KpiGrid>

          {/* PROGRESS BREAKDOWN: operational progress only */}
          {profile.progressBreakdown && (
            <Panel className="space-y-3">
              <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-700">
                    <Target className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Chi tiết tiến độ thực tập
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {profile.progressBreakdown.summaryText || "Đo lường minh bạch từ hoạt động thực tế"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    Tổng tiến độ
                  </span>
                  <span className="font-display text-sm font-bold tabular-nums text-blue-800">
                    {profile.overallProgress}%
                  </span>
                </div>
              </div>

              {/* Reports account for 80%; final evaluation accounts for 20%. */}
              <div
                role="progressbar"
                aria-label="Tiến độ thực tập"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(Math.max(profile.overallProgress, 0), 100)}
                className="my-3 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
              >
                <div
                  style={{ width: `${profile.progressBreakdown.reportPercent}%` }}
                  className="h-full bg-blue-700 transition-[width] duration-300"
                  title={`Báo cáo tuần: ${profile.progressBreakdown.reportPercent}% / 80%`}
                />
                <div
                  style={{ width: `${profile.progressBreakdown.evaluationPercent}%` }}
                  className="h-full bg-emerald-600 transition-[width] duration-300"
                  title={`Đánh giá cuối kỳ: ${profile.progressBreakdown.evaluationPercent}% / 20%`}
                />
              </div>

              <div className="grid grid-cols-1 divide-y divide-slate-100 text-xs sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <div className="flex flex-col justify-between gap-1.5 py-2 sm:pr-4">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                    <span className="text-slate-700">Báo cáo tuần</span>
                    <span className={profile.progressBreakdown.reportPercent > 0 ? "text-blue-800" : "text-slate-500"}>
                      {profile.progressBreakdown.reportPercent}/80%
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    <span className="text-slate-600 font-semibold">
                      {profile.progressBreakdown.submittedReportsCount}/{profile.progressBreakdown.requiredWeeksCount} tuần
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-1.5 py-2 sm:pl-4">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                    <span className="text-slate-700">Đánh giá cuối kỳ</span>
                    <span className={profile.progressBreakdown.evaluationPercent > 0 ? "text-emerald-700" : "text-slate-500"}>
                      {profile.progressBreakdown.evaluationPercent}/20%
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    {profile.progressBreakdown.evaluationPercent > 0 ? (
                      <span className="flex items-center gap-1 font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> Đã chốt điểm
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Circle className="w-3 h-3" /> Cuối kỳ
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Panel>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <Panel className="lg:col-span-8">
              <EducationDashboardChart
                data={chartData}
                totalWeeks={totalWeeks}
              />
            </Panel>
            <Panel className="lg:col-span-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">
                  Tình hình học thuật
                </h3>
                <span className="text-[10px] font-semibold text-slate-500">
                  {currentWeekLabel}
                </span>
              </div>
              <dl className="divide-y divide-slate-100">
                <div className="flex items-center justify-between gap-3 py-2 first:pt-0">
                  <dt className="text-xs font-medium text-slate-600">Điểm hiện tại</dt>
                  <dd className="font-display text-xl font-bold tabular-nums text-emerald-800">
                    {currentGrade || "—"}
                    {currentGrade > 0 && <span className="ml-1 text-xs font-medium text-slate-500">/ 10</span>}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-xs font-medium text-slate-600">Báo cáo được duyệt</dt>
                  <dd className="font-display text-xl font-bold tabular-nums text-blue-800">
                    {reports.length ? `${onTimeRate}%` : "—"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3 py-2 last:pb-0">
                  <dt className="text-xs font-medium text-slate-600">Đánh giá cuối kỳ</dt>
                  <dd className="text-right text-xs font-semibold text-slate-900">
                    {evaluation?.isFinalized
                      ? `${currentGrade}/10 · ${gradeLabel(currentGrade)}`
                      : evaluation
                        ? "Đang chấm"
                        : "Chưa có đánh giá"}
                  </dd>
                </div>
              </dl>
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <div className="lg:col-span-2 space-y-5">
              <Panel className="space-y-4">
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" /> Nhiệm
                      vụ cần hoàn thành
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Các công việc ưu tiên giúp duy trì tiến độ thực tập.
                    </p>
                  </div>
                  <span className="w-fit rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-slate-700">
                    {tasks.length} việc cần làm
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {reportsLoading ? (
                    <p className="text-xs text-slate-500 py-4">Đang tải...</p>
                  ) : tasks.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4">
                      Tất cả báo cáo đã hoàn thành
                    </p>
                  ) : (
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${task.priority === "Cao" ? "bg-rose-600" : task.priority === "Trung bình" ? "bg-amber-500" : "bg-slate-400"}`} aria-hidden="true" />
                          <div className="space-y-1 min-w-0">
                            <p className="break-words text-xs font-semibold leading-snug text-slate-900 md:text-sm">
                              {task.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              <span
                                className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${task.priority === "Cao" ? "bg-rose-50 text-rose-800" : task.priority === "Trung bình" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700"}`}
                              >
                                Ưu tiên: {task.priority}
                              </span>
                              <span className="text-slate-500 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />{" "}
                                {task.deadline}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onNavigate?.("student-weekly-reports")
                          }
                          className={`inline-flex min-h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${task.priority === "Cao" ? "bg-rose-700 text-white hover:bg-rose-800" : "bg-blue-700 text-white hover:bg-blue-800"}`}
                        >
                          {task.actionLabel}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </Panel>

              <Panel className="space-y-4">
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-blue-600" /> Báo cáo
                      tuần gần đây
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Danh sách các kỳ báo cáo định kỳ theo lộ trình đào tạo của
                      Khoa.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate?.("student-weekly-reports")}
                    className="inline-flex min-h-10 w-fit items-center gap-1 whitespace-nowrap text-xs font-semibold text-blue-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                  >
                    Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {reports.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4">
                      Chưa có báo cáo nào
                    </p>
                  ) : (
                    [...reports]
                      .sort((a, b) => b.weekNumber - a.weekNumber)
                      .slice(0, 4)
                      .map((report) => (
                        <div
                          key={report.id}
                          className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900">
                              Báo cáo tuần {report.weekNumber}
                            </p>
                            <p className="break-words text-[11px] text-slate-500">
                              {report.title}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onNavigate?.("student-weekly-reports")
                            }
                            className="inline-flex min-h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                          >
                            Chi tiết
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </Panel>

              <Panel className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-600" /> Phản
                      hồi mới nhất
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Nhận xét trực tiếp giúp sinh viên kịp thời điều chỉnh nội
                      dung thực tập.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate?.("student-feedback")}
                    className="inline-flex min-h-10 items-center gap-1 whitespace-nowrap text-xs font-semibold text-blue-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                  >
                    Xem tất cả
                  </button>
                </div>

                <ul className="divide-y divide-slate-100">
                  {feedbacks.length === 0 ? (
                    <li className="py-4 text-xs text-slate-500">
                      Chưa có phản hồi
                    </li>
                  ) : (
                    feedbacks.map((fb) => (
                      <li
                        key={fb.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 -mx-1 px-1 rounded-md transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <InitialsAvatar name={fb.senderName} size={32} seed={fb.senderName} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-slate-800">
                                {fb.senderName}
                              </p>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800">
                                {fb.senderRole}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                              {fb.preview}
                            </p>
                            <span className="text-[10px] text-slate-400">
                              {fb.reportRef} · {fb.timeAgo}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedFeedback(fb)}
                          className="inline-flex min-h-10 shrink-0 items-center justify-center whitespace-nowrap self-end rounded-md bg-blue-700 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:self-center"
                        >
                          Xem chi tiết
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </Panel>
            </div>

            <div className="lg:col-span-1 space-y-5">
              <Panel className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" /> Doanh nghiệp
                  </h3>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                    Chính thức
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CompanyAvatar name={profile.company} size={48} />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {profile.company}
                      </h4>
                      <p className="text-xs text-blue-600 font-bold">
                        {profile.position}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        Mentor:{" "}
                        <strong className="text-slate-800">
                          {profile.supervisorName}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{profile.supervisorEmail}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{profile.supervisorPhone}</span>
                    </div>
                    <div className="flex items-start gap-2 pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-tight text-slate-500">
                        {profile.companyAddress}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate?.("student-internship")}
                    className="w-full py-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Xem chi tiết hồ sơ</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Panel>

              <Panel className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-blue-600" /> Mốc quan
                    trọng
                  </h3>
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md border border-blue-100">
                    {milestones.length} việc
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {milestones.length === 0 ? (
                    <p className="text-slate-500 py-2">Không có mốc khẩn cấp</p>
                  ) : (
                    milestones.map((m) => (
                      <div
                        key={m.id}
                        className={`p-2.5 rounded-md border flex items-center justify-between ${m.urgent ? "bg-rose-50 border-rose-200/80" : "bg-slate-50 border-slate-200"}`}
                      >
                        <div
                          className={`flex items-center gap-2 font-bold ${m.urgent ? "text-rose-800" : "text-slate-700"}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${m.urgent ? "bg-rose-600" : "bg-blue-600"}`}
                          />
                          <span>{m.title}</span>
                        </div>
                        <span
                          className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${m.urgent ? "text-rose-700 bg-rose-100/80" : "text-slate-600 bg-slate-200/70"}`}
                        >
                          {m.label}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Panel>

              <Panel className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-600" /> Thông báo
                  </h3>
                  <button
                    onClick={() => onNavigate?.("student-notifications")}
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    Xem tất cả
                  </button>
                </div>

                <div className="space-y-2">
                  {notificationsLoading ? (
                    <p className="text-xs text-slate-500 py-2">Đang tải...</p>
                  ) : notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">
                      Không có thông báo
                    </p>
                  ) : (
                    notifications.slice(0, 4).map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 rounded-md text-xs space-y-1 transition-colors ${n.unread ? "bg-blue-50/90 border border-blue-200 font-semibold" : "bg-slate-50 text-slate-600"}`}
                      >
                        <p className="text-slate-800 leading-snug">{n.title}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {n.timeAgo}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}

      {selectedFeedback && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4 shadow-md border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <InitialsAvatar
                  name={selectedFeedback.senderName}
                  size={40}
                  seed={selectedFeedback.senderName}
                />
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {selectedFeedback.senderName}
                  </h3>
                  <p className="text-xs text-blue-600 font-semibold">
                    {selectedFeedback.senderRole} • {selectedFeedback.timeAgo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold bg-blue-50 text-blue-800 px-2.5 py-1 rounded-md border border-blue-100 inline-block">
                {selectedFeedback.reportRef}
              </span>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                {selectedFeedback.detail}
              </p>
            </div>

            <button
              onClick={() => {
                setSelectedFeedback(null);
                onNavigate?.("student-feedback");
              }}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md"
            >
              Xem tại trang Phản hồi
            </button>
          </div>
        </div>
      )}

      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-md border border-slate-200">
            <h3 className="font-bold text-slate-900">{submitWeek}</h3>
            <p className="text-xs text-slate-600">
              Vui lòng nộp báo cáo qua trang Báo cáo tuần.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-md"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  onNavigate?.("student-weekly-reports");
                }}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-md"
              >
                Đi tới Báo cáo tuần
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { DashboardView as StudentDashboardView };
