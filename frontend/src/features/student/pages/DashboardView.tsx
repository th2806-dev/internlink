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
import type { EvaluationDetailDto } from "../../../types/api";

const DEFAULT_AVATAR = "";

export const DashboardView = ({
  onNavigate,
  onShowToast,
}: {
  onNavigate?: (tab: string) => void;
  onShowToast?: (msg: string, type?: string) => void;
}) => {
  const { profile, internshipId } = useStudentPortal();
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
  const [submissionComments, setSubmissionComments] = useState<
    { id: string; title: string; comment: string; date: string }[]
  >([]);

  const semesterWeeks = selectedSemester?.totalWeeks || INTERNSHIP_WEEKS;
  const totalWeeks = Math.max(profile.totalReports, reports.length, semesterWeeks);

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
        deadline: report.submittedAt
          ? new Date(report.submittedAt).toLocaleDateString("vi-VN")
          : "Chưa nộp",
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
  }, [reports]);

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
  const toggleTask = () => {
    onShowToast?.("Vui lòng nộp báo cáo qua trang Báo cáo tuần", "info");
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <PageHeader
        icon={LayoutDashboard}
        title={`Xin chào, ${profile.name}`}
        subtitle={`Thực tập sinh tại ${profile.company} (${profile.position}) • Hướng dẫn: ${profile.lecturerName}`}
        badge={profile.mssv}
        badgeColor="bg-blue-100 text-blue-800 border-blue-200"
      >
        <span className="px-2 py-0.5 font-semibold text-[10px] rounded-md border bg-emerald-100 text-emerald-800 border-emerald-200">
          {profile.statusBadge}
        </span>
      </PageHeader>

      {isArchived && (
        <div className="px-4 py-3 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-slate-600 shrink-0" />
            <span>
              Đợt thực tập <strong>{selectedSemester.name}</strong> đã kết thúc & đóng dữ liệu. Tài khoản của bạn đang ở chế độ <strong>Lưu trữ (Chỉ xem)</strong>.
            </span>
          </div>
          <span className="px-2.5 py-0.5 bg-slate-200 text-slate-700 font-bold rounded text-[10px] shrink-0">
            Hồ sơ đã lưu trữ
          </span>
        </div>
      )}

      {!hasActiveSemester && (
        <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2.5">
          <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Chưa có kỳ thực tập nào đang hoạt động. Dữ liệu sẽ tự động hiển thị khi Super Admin bắt đầu kỳ thực tập.
          </span>
        </div>
      )}

      {showEmptyState ? (
        <Panel className="p-8 text-center space-y-4 max-w-2xl mx-auto" padding="none">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Building2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-800">
              Bạn chưa bắt đầu kỳ thực tập
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Vui lòng hoàn tất đăng ký đợt thực tập, chọn doanh nghiệp nguyện
              vọng hoặc nộp hồ sơ xác nhận tiếp nhận để mở khóa toàn bộ tính
              năng báo cáo.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setShowEmptyState(false);
                onShowToast?.(
                  "Đang mở Hướng dẫn Đăng ký thực tập đợt I - 2026",
                );
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-md transition-colors flex items-center gap-2"
            >
              <span>Xem hướng dẫn đăng ký đợt</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate?.("student-templates")}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md transition-colors"
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
              footer={`${approvedCount} / ${totalWeeks} tuần hoàn thành`}
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
              value={nextReport ? `Tuần ${nextReport.weekNumber}` : "—"}
              icon={Clock}
              footer={
                nextReport ? nextReport.title : "Không có báo cáo cần nộp"
              }
              onClick={() => {
                if (nextReport) onNavigate("student-weekly-reports");
              }}
            />
          </KpiGrid>

          {/* PROGRESS BREAKDOWN 5-MILESTONE CARD */}
          {profile.progressBreakdown && (
            <Panel className="p-4 bg-gradient-to-r from-slate-50 via-blue-50/20 to-slate-50 border border-slate-200/80 rounded-xl shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Chi tiết tiến độ thực tập (5 tiêu chí)
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {profile.progressBreakdown.summaryText || "Đo lường minh bạch từ hoạt động thực tế"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    Tổng: <span className="text-blue-600 text-sm font-black">{profile.overallProgress}%</span> / 100%
                  </span>
                </div>
              </div>

              {/* Multi-segment progress bar */}
              <div className="w-full bg-slate-200 rounded-full h-2.5 my-3 flex overflow-hidden">
                <div
                  style={{ width: `${profile.progressBreakdown.accountPercent}%` }}
                  className="bg-sky-500 h-full transition-all duration-300"
                  title={`Tài khoản: ${profile.progressBreakdown.accountPercent}%`}
                />
                <div
                  style={{ width: `${profile.progressBreakdown.profilePercent}%` }}
                  className="bg-indigo-500 h-full transition-all duration-300"
                  title={`Hồ sơ: ${profile.progressBreakdown.profilePercent}%`}
                />
                <div
                  style={{ width: `${profile.progressBreakdown.companyPercent}%` }}
                  className="bg-teal-500 h-full transition-all duration-300"
                  title={`Doanh nghiệp: ${profile.progressBreakdown.companyPercent}%`}
                />
                <div
                  style={{ width: `${profile.progressBreakdown.reportPercent}%` }}
                  className="bg-blue-600 h-full transition-all duration-300"
                  title={`Báo cáo tuần: ${profile.progressBreakdown.reportPercent}%`}
                />
                <div
                  style={{ width: `${profile.progressBreakdown.evaluationPercent}%` }}
                  className="bg-emerald-500 h-full transition-all duration-300"
                  title={`Đánh giá: ${profile.progressBreakdown.evaluationPercent}%`}
                />
              </div>

              {/* 5 Milestones */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1 text-xs">
                <div className="p-2.5 rounded-lg border bg-white shadow-2xs border-slate-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-600">1. Tài khoản</span>
                    <span className={profile.progressBreakdown.accountPercent > 0 ? "text-sky-600" : "text-slate-400"}>
                      {profile.progressBreakdown.accountPercent}/10%
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    {profile.progressBreakdown.accountPercent > 0 ? (
                      <span className="text-sky-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Đã kích hoạt
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Circle className="w-3 h-3" /> Chưa đăng nhập
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border bg-white shadow-2xs border-slate-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-600">2. Hồ sơ cá nhân</span>
                    <span className={profile.progressBreakdown.profilePercent > 0 ? "text-indigo-600" : "text-slate-400"}>
                      {profile.progressBreakdown.profilePercent}/15%
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    {profile.progressBreakdown.profilePercent >= 15 ? (
                      <span className="text-indigo-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Đầy đủ thông tin
                      </span>
                    ) : profile.progressBreakdown.profilePercent > 0 ? (
                      <span className="text-amber-600 font-semibold">Cơ bản</span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Circle className="w-3 h-3" /> Chưa cập nhật
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border bg-white shadow-2xs border-slate-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-600">3. Doanh nghiệp</span>
                    <span className={profile.progressBreakdown.companyPercent > 0 ? "text-teal-600" : "text-slate-400"}>
                      {profile.progressBreakdown.companyPercent}/20%
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    {profile.progressBreakdown.companyPercent > 0 ? (
                      <span className="text-teal-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Đã phân bổ
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Circle className="w-3 h-3" /> Chờ phân bổ
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border bg-white shadow-2xs border-slate-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-600">4. Báo cáo tuần</span>
                    <span className={profile.progressBreakdown.reportPercent > 0 ? "text-blue-600" : "text-slate-400"}>
                      {profile.progressBreakdown.reportPercent}/35%
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    <span className="text-slate-600 font-semibold">
                      {profile.progressBreakdown.submittedReportsCount}/{profile.progressBreakdown.requiredWeeksCount} tuần
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border bg-white shadow-2xs border-slate-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-600">5. Đánh giá cuối kỳ</span>
                    <span className={profile.progressBreakdown.evaluationPercent > 0 ? "text-emerald-600" : "text-slate-400"}>
                      {profile.progressBreakdown.evaluationPercent}/20%
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    {profile.progressBreakdown.evaluationPercent > 0 ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Đã chốt điểm
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
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
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">
                    Điểm TB
                  </p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">
                    {currentGrade || "—"}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">
                    Đúng hạn
                  </p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">
                    {reports.length ? `${onTimeRate}%` : "—"}
                  </p>
                </div>
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-md col-span-2">
                  <p className="text-[10px] font-bold text-blue-700 uppercase">
                    Đánh giá
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {evaluation?.isFinalized
                      ? `${currentGrade}/10 · ${gradeLabel(currentGrade)}`
                      : evaluation
                        ? "Đang chấm"
                        : "Chưa có đánh giá"}
                  </p>
                </div>
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <div className="lg:col-span-2 space-y-5">
              <Panel className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" /> Nhiệm
                      vụ cần hoàn thành
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Các công việc ưu tiên giúp duy trì tiến độ thực tập.
                    </p>
                  </div>
                  <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-full border border-blue-100">
                    {tasks.length} việc cần làm
                  </span>
                </div>

                <div className="space-y-2.5">
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
                        className={`p-3.5 rounded-md border transition-all flex items-start justify-between gap-3 ${task.priority === "Cao" ? "bg-rose-50/30 border-rose-200/80 hover:border-rose-300" : "bg-white border-slate-200 hover:border-blue-300"}`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            onClick={toggleTask}
                            className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                          >
                            <Circle className="w-5 h-5" />
                          </button>
                          <div className="space-y-1 min-w-0">
                            <p className="text-xs md:text-sm font-bold text-slate-800 leading-snug">
                              {task.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${task.priority === "Cao" ? "bg-rose-100 text-rose-800" : task.priority === "Trung bình" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}
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
                          onClick={() =>
                            onNavigate?.("student-weekly-reports")
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${task.priority === "Cao" ? "bg-rose-600 hover:bg-rose-700 text-white shadow-2xs" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                        >
                          {task.actionLabel}
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
                      <FileCheck2 className="w-4 h-4 text-blue-600" /> Báo cáo
                      tuần gần đây
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Danh sách các kỳ báo cáo định kỳ theo lộ trình đào tạo của
                      Khoa.
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate?.("student-weekly-reports")}
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
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
                          className="p-3.5 rounded-md border bg-white border-slate-200"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-800">
                                Báo cáo tuần {report.weekNumber}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {report.title}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                onNavigate?.("student-weekly-reports")
                              }
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Chi tiết
                            </button>
                          </div>
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
                    onClick={() => onNavigate?.("student-feedback")}
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
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
                          onClick={() => setSelectedFeedback(fb)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md transition-colors shrink-0 self-end sm:self-center"
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
