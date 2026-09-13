import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  FileText,
  GraduationCap,
  Mail,
  RefreshCw,
  Save,
  Sliders,
  Star,
  Target,
  User,
  CalendarCheck,
  XCircle,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSemester } from "../../../contexts/SemesterContext";
import { useStudentWorkspace } from "../../../hooks/useStudentWorkspace";
import { PageHeader } from "../../../components/common/PageHeader";
import { KpiCard, KpiGrid } from "../../../components/common/KpiCard";
import { Panel } from "../../../components/common/Panel";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { mapInternshipStatusToUi, mapWeeklyReportStatusToUi } from "../../../lib/portalMappers";
import { INTERNSHIP_WEEKS } from "../../../config/internship";
import { WeeklyReportTimeline } from "./WeeklyReportTimeline";
import { StudentReportsTab } from "./StudentReportsTab";
import { StudentEvaluationTab } from "./StudentEvaluationTab";
import type { EvaluationDetailDto } from "../../../types/api";

import { attendanceService } from "../../../services/attendance.service";
import type { AttendanceRecordDto } from "../../../types/api";

type TabId = "overview" | "progress" | "reports" | "evaluation" | "attendance";

const TABS: { id: TabId; label: string; icon: typeof Target }[] = [
  { id: "overview", label: "Tổng quan", icon: Target },
  { id: "progress", label: "Tiến độ 6 tuần", icon: Clock },
  { id: "reports", label: "Báo cáo & Bài nộp", icon: FileText },
  { id: "evaluation", label: "Đánh giá", icon: Star },
];

export function StudentWorkspace({
  internshipId: initialInternshipId,
  initialTab = "overview",
  onRefreshParent,
  onShowToast,
}: {
  internshipId?: string;
  initialTab?: TabId;
  onRefreshParent?: () => Promise<void> | void;
  onShowToast?: (msg: string) => void;
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedSemester, activeSemesterId } = useSemester();

  // Read internshipId from URL params if not provided as prop
  const { internshipId: urlInternshipId } = useParams<{ internshipId?: string }>();
  const id = initialInternshipId ?? urlInternshipId;

  const {
    detail,
    assignment,
    weeklyReports,
    submissions,
    evaluation,
    rubric,
    isLoading,
    error,
    sectionErrors,
    refresh,
  } = useStudentWorkspace(id);

  const totalWeeks = selectedSemester?.totalWeeks || INTERNSHIP_WEEKS;
  const tabs = useMemo(
    () => [
      { id: "overview" as TabId, label: "Tổng quan", icon: Target },
      { id: "progress" as TabId, label: `Tiến độ ${totalWeeks} tuần`, icon: Clock },
      { id: "reports" as TabId, label: "Báo cáo & Bài nộp", icon: FileText },
      { id: "evaluation" as TabId, label: "Đánh giá", icon: Star },
      { id: "attendance" as TabId, label: "Chuyên cần", icon: CalendarCheck },
    ],
    [totalWeeks],
  );

  const queryTab = searchParams.get("tab") as TabId | null;
  const activeTab: TabId = tabs.some((tab) => tab.id === queryTab) ? queryTab! : initialTab;

  const selectTab = (tab: TabId) => {
    setSearchParams((previous) => {
      previous.set("tab", tab);
      return previous;
    });
  };

  // ---- Derived data ----
  const student = detail?.student;
  const company = detail?.company;
  const internshipStatus = assignment?.internshipStatus ?? detail?.status ?? "NotStarted";
  const evaluationStatus = evaluation
    ? evaluation.isFinalized
      ? "Đã chốt"
      : "Đang chấm"
    : "Chưa chấm";

  const weeklyReportCount = weeklyReports.length;
  const approvedReportCount = weeklyReports.filter((r) => r.status === "Approved").length;
  const pendingReportCount = assignment?.pendingReportCount ?? 0;
  const submissionCount = submissions.length;
  const progressPercent = assignment?.progressPercent ?? 0;
  const finalGrade = assignment?.finalGrade ?? evaluation?.finalGrade ?? null;

  const statusClass = useMemo(() => {
    if (internshipStatus === "Completed" || internshipStatus === "Graded")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (internshipStatus === "BehindSchedule" || internshipStatus === "RequiresRevision")
      return "bg-rose-50 text-rose-700 border-rose-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  }, [internshipStatus]);

  const evalStatusClass = useMemo(() => {
    if (evaluationStatus === "Đã chốt")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (evaluationStatus === "Đang chấm")
      return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  }, [evaluationStatus]);

  const handleRefreshAndNotify = async () => {
    await refresh();
    await onRefreshParent?.();
    onShowToast?.("Đã làm mới dữ liệu");
  };

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="space-y-5 max-w-[1500px] mx-auto">
        <div className="bg-white p-8 rounded-lg border border-slate-200 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <p className="text-xs text-slate-500">Đang tải hồ sơ sinh viên...</p>
        </div>
      </div>
    );
  }

  // ---- Error / Not found state ----
  if (error || !detail || !student) {
    return (
      <div className="space-y-5 max-w-[1500px] mx-auto">
        <PageHeader
          icon={GraduationCap}
          title="Hồ sơ sinh viên"
          subtitle="Không tìm thấy dữ liệu phân công"
          actions={[
            {
              label: "Quay lại danh sách",
              icon: ArrowLeft,
              onClick: () => navigate("/lecturer/students"),
              variant: "secondary",
            },
          ]}
        />
        <Panel className="p-6 text-sm text-slate-600">
          {error ?? "Sinh viên không thuộc nhóm hướng dẫn hoặc dữ liệu thực tập không còn tồn tại."}
          <button
            type="button"
            onClick={() => navigate("/lecturer/students")}
            className="ml-2 font-bold text-blue-600 hover:text-blue-800"
          >
            Quay lại danh sách
          </button>
        </Panel>
      </div>
    );
  }

  // ---- Main render ----
  return (
    <div className="space-y-5 max-w-[1500px] mx-auto pb-16 animate-in fade-in duration-200">
      {/* === WORKSPACE HEADER (Evaluation style) === */}
      <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Top bar: back + student info + badges */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => navigate("/lecturer/students")}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors border border-slate-200 shrink-0 mt-0.5"
              title="Quay lại danh sách"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <InitialsAvatar name={student.fullName} seed={student.studentCode} size={56} className="text-lg" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight truncate">
                  {student.fullName}
                </h2>
                <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border inline-flex items-center gap-1 ${statusClass}`}>
                  <CheckCircle2 className="w-3 h-3" />
                  {mapInternshipStatusToUi(internshipStatus)}
                </span>
                <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border inline-flex items-center gap-1 ${evalStatusClass}`}>
                  {evaluationStatus === "Đã chốt" ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : evaluationStatus === "Đang chấm" ? (
                    <Edit3 className="w-3 h-3" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                  {evaluationStatus}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono font-bold text-blue-600">{student.studentCode}</span>
                </span>
                <span>•</span>
                <span>{student.class ?? "—"}</span>
                <span>•</span>
                <span>{student.major ?? "—"}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  {student.email ?? "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => selectTab("evaluation")}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Sliders className="w-3.5 h-3.5" />
              Đánh giá
            </button>
            <button
              onClick={handleRefreshAndNotify}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md border border-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Làm mới
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="border-t border-slate-200 px-5">
          <nav className="flex gap-0 overflow-x-auto" role="tablist">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => selectTab(tab.id)}
                  className={`relative px-4 py-3 text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                    isActive
                      ? "text-blue-700"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* === TAB CONTENT === */}
      {activeTab === "overview" && (
        <OverviewTab
          detail={detail}
          assignment={assignment}
          student={student}
          company={company}
          submissions={submissions}
          progressPercent={progressPercent}
          weeklyReportCount={weeklyReportCount}
          pendingReportCount={pendingReportCount}
          submissionCount={submissionCount}
          finalGrade={finalGrade}
          internshipStatus={internshipStatus}
          evaluation={evaluation}
          internshipId={id!}
          totalWeeks={totalWeeks}
          onNavigate={selectTab}
          onRefresh={handleRefreshAndNotify}
          onShowToast={onShowToast}
        />
      )}

      {activeTab === "progress" && (
        <WeeklyReportTimeline
          internshipId={id!}
          weeklyReports={weeklyReports}
          isLoading={isLoading}
          onRefresh={handleRefreshAndNotify}
          onShowToast={onShowToast}
          error={sectionErrors.reports}
          evaluation={evaluation}
          totalWeeks={totalWeeks}
        />
      )}

      {activeTab === "reports" && (
        <StudentReportsTab
          internshipId={id!}
          studentName={student.fullName}
          studentCode={student.studentCode}
          weeklyReports={weeklyReports}
          submissions={submissions}
          isLoading={isLoading}
          onRefresh={handleRefreshAndNotify}
          onShowToast={onShowToast}
          errors={sectionErrors}
        />
      )}

      {activeTab === "evaluation" && (
        <StudentEvaluationTab
          internshipId={id!}
          evaluation={evaluation}
          rubric={rubric}
          student={{
            name: student.fullName,
            mssv: student.studentCode,
            class: student.class ?? "—",
            major: student.major ?? "—",
            company: company?.companyName ?? "Chưa có DN",
            supervisor: detail.supervisorName ?? "—",
            internshipId: id!,
            evaluationId: evaluation?.id,
            semesterId: activeSemesterId || undefined,
          }}
          isFinalized={evaluation?.isFinalized ?? false}
          onRefresh={handleRefreshAndNotify}
          onShowToast={onShowToast}
          error={sectionErrors.rubric ?? sectionErrors.evaluation}
        />
      )}

      {activeTab === "attendance" && (
        <StudentAttendanceTab
          studentId={student.id}
          semesterId={activeSemesterId || ""}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
}

// ---- Overview Tab ----
import { evaluationService } from "../../../services/evaluation.service";
import { getApiErrorMessage } from "../../../lib/apiClient";

function OverviewTab({
  detail,
  assignment,
  student,
  company,
  submissions,
  progressPercent,
  weeklyReportCount,
  pendingReportCount,
  submissionCount,
  finalGrade,
  internshipStatus,
  evaluation,
  internshipId,
  totalWeeks,
  onNavigate,
  onRefresh,
  onShowToast,
}: {
  detail: any;
  assignment: any;
  student: any;
  company: any;
  submissions: any[];
  progressPercent: number;
  weeklyReportCount: number;
  pendingReportCount: number;
  submissionCount: number;
  finalGrade: number | null;
  internshipStatus: string;
  evaluation?: EvaluationDetailDto | null;
  internshipId?: string;
  totalWeeks: number;
  onNavigate: (tab: TabId) => void;
  onRefresh: () => Promise<void>;
  onShowToast?: (msg: string) => void;
}) {
  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <KpiGrid>
        <KpiCard
          tone="blue"
          title="Tiến độ thực tập"
          value={`${progressPercent}%`}
          icon={Target}
          footer={`${weeklyReportCount} / ${totalWeeks} tuần đã nộp`}
        />
        <KpiCard
          tone="emerald"
          title="Báo cáo tuần"
          value={weeklyReportCount}
          unit="báo cáo"
          icon={FileText}
          footer={`${pendingReportCount} chờ duyệt`}
        />
        <KpiCard
          tone="amber"
          title="Bài nộp sản phẩm"
          value={submissionCount}
          unit="bài"
          icon={Download}
          footer={`${submissions.length ?? 0} đã nộp`}
        />
        <KpiCard
          tone="sky"
          title="Điểm cuối kỳ"
          value={finalGrade != null ? String(finalGrade) : "—"}
          unit={finalGrade != null ? "/ 10" : undefined}
          icon={Star}
          footer={finalGrade != null ? `Xếp loại: ${finalGrade >= 8 ? "Giỏi" : finalGrade >= 6.5 ? "Khá" : finalGrade >= 5 ? "TB" : "Chưa đạt"}` : "Chưa có điểm"}
        />
      </KpiGrid>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Student info + Internship info */}
        <div className="lg:col-span-7 space-y-5">
          {/* Student Info Card */}
          <Panel className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Thông tin sinh viên
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <InfoRow label="Họ tên" value={student.fullName} />
              <InfoRow label="MSSV" value={student.studentCode} mono />
              <InfoRow label="Email" value={student.email ?? "—"} />
              <InfoRow label="Số điện thoại" value={student.phone ?? "—"} />
              <InfoRow label="Lớp" value={student.class ?? "—"} />
              <InfoRow label="Ngành" value={student.major ?? "—"} />
            </div>
          </Panel>

          {/* Internship Info Card */}
          <Panel className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Thông tin thực tập
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <InfoRow label="Doanh nghiệp" value={company?.companyName ?? "Chưa có"} highlight />
              <InfoRow label="Vị trí" value={detail.position ?? "—"} />
              <InfoRow label="Mentor DN" value={detail.supervisorName ?? "—"} />
              <InfoRow label="Trạng thái" value={mapInternshipStatusToUi(internshipStatus)} />
              <InfoRow
                label="Thời gian"
                value={`${detail.startDate?.slice(0, 10) ?? "—"} → ${detail.endDate?.slice(0, 10) ?? "—"}`}
              />
            </div>
          </Panel>
        </div>

        {/* Right: Quick actions + Progress */}
        <div className="lg:col-span-5 space-y-5">
          {/* Progress */}
          <Panel className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                Tiến độ thực tập
              </h3>
              <span className="text-xs font-bold text-blue-700">{progressPercent}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {assignment?.progressBreakdown && (
              <div className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200/60 rounded-md p-2 space-y-1">
                <div className="flex justify-between font-semibold text-slate-600">
                  <span>TK: {assignment.progressBreakdown.accountPercent}%</span>
                  <span>HS: {assignment.progressBreakdown.profilePercent}%</span>
                  <span>DN: {assignment.progressBreakdown.companyPercent}%</span>
                  <span>BC: {assignment.progressBreakdown.reportPercent}%</span>
                  <span>ĐG: {assignment.progressBreakdown.evaluationPercent}%</span>
                </div>
                <div className="text-slate-500 font-medium text-[9px] truncate">
                  {assignment.progressBreakdown.summaryText}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <MiniStat label="Báo cáo tuần" value={`${weeklyReportCount}/${totalWeeks}`} />
              <MiniStat label="Chờ duyệt" value={String(pendingReportCount)} alert={pendingReportCount > 0} />
              <MiniStat label="Bài nộp" value={String(submissionCount)} />
              <MiniStat label="Điểm" value={finalGrade != null ? String(finalGrade) : "—"} />
            </div>
          </Panel>

          {/* Quick actions */}
          <Panel className="space-y-3">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Thao tác nhanh</h3>
            </div>
            <button
              onClick={() => onNavigate("reports")}
              className="w-full p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-md text-xs font-bold text-slate-800 hover:text-blue-700 flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Xem báo cáo & bài nộp
              </span>
              <span className="text-slate-400">→</span>
            </button>
            <button
              onClick={() => onNavigate("evaluation")}
              className="w-full p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-md text-xs font-bold text-slate-800 hover:text-blue-700 flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                Đánh giá & chấm điểm
              </span>
              <span className="text-slate-400">→</span>
            </button>
            <button
              onClick={() => onNavigate("progress")}
              className="w-full p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-md text-xs font-bold text-slate-800 hover:text-blue-700 flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Xem tiến độ {totalWeeks} tuần
              </span>
              <span className="text-slate-400">→</span>
            </button>
          </Panel>

          {internshipId && (
            <DefenseOverviewPanel
              internshipId={internshipId}
              evaluation={evaluation}
              onRefresh={onRefresh}
              onShowToast={onShowToast ?? (() => {})}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Small helper components ----
function InfoRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 p-2.5 bg-slate-50 border border-slate-200/70 rounded-md">
      <span className="text-[10px] font-bold uppercase text-slate-400">{label}</span>
      <span
        className={`text-xs font-bold ${mono ? "font-mono text-blue-600" : highlight ? "text-blue-700" : "text-slate-800"}`}
      >
        {value}
      </span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-md">
      <span className="text-[10px] font-bold uppercase text-slate-400 block">{label}</span>
      <span className={`text-lg font-bold ${alert ? "text-amber-600" : "text-slate-900"}`}>
        {value}
      </span>
    </div>
  );
}

// ---- Overview defense panel ----
function DefenseOverviewPanel({
  internshipId,
  evaluation,
  onRefresh,
  onShowToast,
}: {
  internshipId: string;
  evaluation?: EvaluationDetailDto | null;
  onRefresh: () => Promise<void>;
  onShowToast: (msg: string) => void;
}) {
  const [defenseDate, setDefenseDate] = useState(evaluation?.defenseDate?.slice(0, 10) ?? "");
  const [defenseStatus, setDefenseStatus] = useState<EvaluationDetailDto["defenseStatus"]>(evaluation?.defenseStatus ?? "NotScheduled");
  const [defenseCouncilName, setDefenseCouncilName] = useState(evaluation?.defenseCouncilName ?? "");
  const [defenseExaminerName, setDefenseExaminerName] = useState(evaluation?.defenseExaminerName ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const saveDefense = async () => {
    setIsSaving(true);
    try {
      await evaluationService.scheduleDefense(internshipId, {
        defenseDate: defenseDate || null,
        defenseStatus,
        defenseCouncilName: defenseCouncilName.trim() || null,
        defenseExaminerName: defenseExaminerName.trim() || null,
      });
      await onRefresh();
      onShowToast("Đã cập nhật lịch bảo vệ.");
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-indigo-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Lịch bảo vệ</h3>
            <p className="text-[11px] text-slate-500">Quản lý lịch phòng vệ từ tổng quan.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={saveDefense}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:pointer-events-none disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {isSaving ? "Đang lưu..." : "Lưu lịch"}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 text-xs">
        <label className="font-bold text-slate-700">
          Trạng thái
          <select value={defenseStatus} onChange={(event) => setDefenseStatus(event.target.value as EvaluationDetailDto["defenseStatus"])} className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-medium outline-none focus:border-indigo-500">
            <option value="NotScheduled">Chưa xếp lịch</option>
            <option value="Scheduled">Đã xếp lịch</option>
            <option value="Completed">Đã bảo vệ</option>
          </select>
        </label>
        <label className="font-bold text-slate-700">
          Ngày bảo vệ
          <input type="date" value={defenseDate} onChange={(event) => setDefenseDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-medium outline-none focus:border-indigo-500" />
        </label>
        <label className="font-bold text-slate-700">
          Hội đồng
          <input value={defenseCouncilName} onChange={(event) => setDefenseCouncilName(event.target.value)} placeholder="Ví dụ: Hội đồng CNTT 01" className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-medium outline-none focus:border-indigo-500" />
        </label>
        <label className="font-bold text-slate-700">
          Người phản biện
          <input value={defenseExaminerName} onChange={(event) => setDefenseExaminerName(event.target.value)} placeholder="Tên giảng viên phản biện" className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-medium outline-none focus:border-indigo-500" />
        </label>
      </div>

      {evaluation && (defenseDate || defenseCouncilName || defenseExaminerName) && (
        <div className="rounded-md border border-indigo-200 bg-indigo-50/60 px-3 py-3 text-xs">
          <p className="font-bold text-indigo-900">Thông tin bảo vệ</p>
          <p className="mt-1 text-indigo-800">
            {evaluation.defenseStatus === "Completed" ? "Đã bảo vệ" : evaluation.defenseStatus === "Scheduled" ? "Đã xếp lịch" : "Chưa xếp lịch"}
            {evaluation.defenseDate ? ` · ${new Date(evaluation.defenseDate).toLocaleDateString("vi-VN")}` : ""}
            {evaluation.defenseCouncilName ? ` · ${evaluation.defenseCouncilName}` : ""}
            {evaluation.defenseExaminerName ? ` · Phản biện: ${evaluation.defenseExaminerName}` : ""}
          </p>
        </div>
      )}
    </Panel>
  );
}

// ---- Attendance Tab in StudentWorkspace ----
function StudentAttendanceTab({
  studentId,
  semesterId,
  onShowToast,
}: {
  studentId: string;
  semesterId: string;
  onShowToast?: (msg: string) => void;
}) {
  const [records, setRecords] = useState<AttendanceRecordDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!studentId || !semesterId) return;
    setIsLoading(true);
    attendanceService
      .getStudentAttendanceForLecturer(studentId, semesterId)
      .then((data) => setRecords(data))
      .catch((err) => onShowToast?.(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [studentId, semesterId, onShowToast]);

  const total = records.length;
  const present = records.filter((r) => r.status === "Present").length;
  const absent = records.filter((r) => r.status === "Absent").length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 100;

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <p className="text-xs">Đang tải lịch sử chuyên cần...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <KpiGrid>
        <KpiCard
          tone="blue"
          title="Tỷ lệ chuyên cần"
          value={`${rate}%`}
          icon={CalendarCheck}
          footer={`${present} / ${total} buổi có mặt`}
        />
        <KpiCard
          tone="emerald"
          title="Số buổi có mặt"
          value={present}
          unit="buổi"
          icon={CheckCircle2}
          footer="Tham dự đầy đủ"
        />
        <KpiCard
          tone={absent > 0 ? "rose" : "blue"}
          title="Số buổi vắng"
          value={absent}
          unit="buổi"
          icon={XCircle}
          footer={absent === 0 ? "Không vắng buổi nào" : "Cần nhắc nhở sinh viên"}
        />
      </KpiGrid>

      <Panel className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-600" />
            Chi tiết các buổi gặp & điểm danh
          </h3>
          <span className="text-xs text-slate-500">{total} buổi gặp</span>
        </div>

        {records.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            Chưa có buổi gặp nào có tên sinh viên này được lên lịch trong kỳ.
          </p>
        ) : (
          <div className="space-y-2.5">
            {records.map((r, idx) => {
              const isPresent = r.status === "Present";
              return (
                <div
                  key={r.id || idx}
                  className={`p-3.5 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                    isPresent ? "bg-white border-slate-200" : "bg-rose-50/30 border-rose-200"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1 ${
                          isPresent
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {isPresent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {isPresent ? "Có mặt" : "Vắng"}
                      </span>
                      {r.markedAt && (
                        <span className="text-[11px] text-slate-400">
                          Điểm danh: {new Date(r.markedAt).toLocaleDateString("vi-VN")} bởi {r.markedBy || "GV"}
                        </span>
                      )}
                    </div>
                    {r.notes && (
                      <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-200/60 mt-1 italic">
                        "Nhận xét: {r.notes}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

