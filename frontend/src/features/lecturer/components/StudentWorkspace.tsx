import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  Edit3,
  FileText,
  GraduationCap,
  Mail,
  RefreshCw,
  Target,
  User,
  CalendarCheck,
  XCircle,
  Clock,
} from "lucide-react";
import { Star } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSemester } from "../../../contexts/SemesterContext";
import { useStudentWorkspace } from "../../../hooks/useStudentWorkspace";
import { PageHeader } from "../../../components/common/PageHeader";
import { KpiCard, KpiGrid } from "../../../components/common/KpiCard";
import { Panel } from "../../../components/common/Panel";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { mapInternshipStatusToUi } from "../../../lib/portalMappers";
import { INTERNSHIP_WEEKS } from "../../../config/internship";
import { WeeklyReportTimeline } from "./WeeklyReportTimeline";
import { StudentReportsTab } from "./StudentReportsTab";
import type { EvaluationDetailDto } from "../../../types/api";

import { attendanceService } from "../../../services/attendance.service";
import type { AttendanceRecordDto } from "../../../types/api";
import { getApiErrorMessage } from "../../../lib/apiClient";

export function StudentWorkspace({
  internshipId: initialInternshipId,
  onRefreshParent,
  onShowToast,
}: {
  internshipId?: string;
  onRefreshParent?: () => Promise<void> | void;
  onShowToast?: (msg: string) => void;
}) {
  const navigate = useNavigate();
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
    isLoading,
    error,
    sectionErrors,
    refresh,
  } = useStudentWorkspace(id);

  const totalWeeks = selectedSemester?.totalWeeks || INTERNSHIP_WEEKS;
  // Tuần HK nơi Tuần thực tập 1 bắt đầu (vd 14 → TT 1..6 = HK 14..19) — dùng cho timeline.
  const internshipStartWeek = selectedSemester?.internshipStartWeek || 1;

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

  // Đã có điểm trung bình → tiến độ coi như hoàn thành 100%
  const effectiveProgress = finalGrade != null ? 100 : progressPercent;

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

  // ---- Main render: single unified page ----
  return (
    <div className="space-y-5 max-w-[1500px] mx-auto pb-16 animate-in fade-in duration-200">
      {/* === WORKSPACE HEADER === */}
      <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs overflow-hidden">
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
              onClick={handleRefreshAndNotify}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md border border-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* === KPI CARDS === */}
      <KpiGrid>
        <KpiCard
          tone="blue"
          title="Tiến độ thực tập"
          value={`${effectiveProgress}%`}
          icon={Target}
          footer={finalGrade != null ? "Đã có điểm trung bình — hoàn thành" : `${weeklyReportCount} / ${totalWeeks} tuần đã nộp`}
        />
        <KpiCard
          tone="emerald"
          title="Báo cáo tuần"
          value={weeklyReportCount}
          unit="báo cáo"
          icon={FileText}
          footer={`${approvedReportCount} đã duyệt · ${pendingReportCount} chờ duyệt`}
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
          footer={finalGrade != null ? `Xếp loại: ${finalGrade >= 8.5 ? "Xuất sắc" : finalGrade >= 8 ? "Giỏi" : finalGrade >= 6.5 ? "Khá" : finalGrade >= 5 ? "Trung bình" : "Không đạt"}` : "Chưa có điểm"}
        />
      </KpiGrid>

      {/* === MAIN CONTENT GRID === */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Student info + Internship info + Reports */}
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

          {/* Reports & Submissions */}
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
        </div>

        {/* Right: Progress + quick stats */}
        <div className="lg:col-span-5 space-y-5">
          {/* Progress */}
          <Panel className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                Tiến độ thực tập
              </h3>
              <span className="text-xs font-bold text-blue-700">{effectiveProgress}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${finalGrade != null ? "bg-emerald-500" : "bg-blue-600"}`}
                style={{ width: `${effectiveProgress}%` }}
              />
            </div>
            {finalGrade != null && (
              <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Đã có điểm trung bình ({finalGrade}/10) — tiến độ hoàn thành 100%.
              </p>
            )}
            {assignment?.progressBreakdown && finalGrade == null && (
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
              <MiniStat label="Đã duyệt" value={`${approvedReportCount}/${totalWeeks}`} />
              <MiniStat label="Chờ duyệt" value={String(pendingReportCount)} alert={pendingReportCount > 0} />
              <MiniStat label="Bài nộp" value={String(submissionCount)} />
            </div>
          </Panel>

          {/* Attendance summary (compact) */}
          <AttendanceSummaryCard
            studentId={student.id}
            semesterId={activeSemesterId || ""}
            onShowToast={onShowToast}
          />
        </div>
      </div>

      {/* === WEEKLY TIMELINE (full width) === */}
      <WeeklyReportTimeline
        internshipId={id!}
        weeklyReports={weeklyReports}
        isLoading={isLoading}
        onRefresh={handleRefreshAndNotify}
        onShowToast={onShowToast}
        error={sectionErrors.reports}
        evaluation={evaluation}
        totalWeeks={totalWeeks}
        internshipStartWeek={internshipStartWeek}
      />
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

// ---- Compact attendance card (right column) ----
function AttendanceSummaryCard({
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
    if (!studentId || !semesterId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    let cancelled = false;
    attendanceService
      .getStudentAttendanceForLecturer(studentId, semesterId)
      .then((data) => {
        if (!cancelled) setRecords(data);
      })
      .catch((err) => {
        if (!cancelled) onShowToast?.(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, semesterId]);

  const total = records.length;
  const present = records.filter((r) => r.status === "Present").length;
  const absent = records.filter((r) => r.status === "Absent").length;
  // Chưa có bản ghi điểm danh → hiển thị "—" thay vì 100% vô nghĩa.
  const rate = total > 0 ? `${Math.round((present / total) * 100)}%` : "—";

  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-blue-600" />
          Chuyên cần & điểm danh
        </h3>
        <span className="text-xs text-slate-500">{total} buổi gặp</span>
      </div>

      {isLoading ? (
        <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
          <p className="text-xs">Đang tải chuyên cần...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <MiniStat label="Tỷ lệ có mặt" value={rate} />
            <MiniStat label="Có mặt" value={String(present)} />
            <MiniStat label="Vắng" value={String(absent)} alert={absent >= 2} />
          </div>

          {absent >= 2 && (
            <p className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2.5 py-1.5 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              Vắng {absent} buổi — đủ điều kiện dự thi có thể bị ảnh hưởng (≥ 2 buổi vắng).
            </p>
          )}

          {records.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">
              Chưa có buổi gặp nào có tên sinh viên này được lên lịch trong kỳ.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {records.map((r, idx) => {
                const isPresent = r.status === "Present";
                return (
                  <div
                    key={r.id || idx}
                    className={`p-2.5 rounded-md border flex items-center justify-between gap-3 text-xs ${
                      isPresent ? "bg-white border-slate-200" : "bg-rose-50/40 border-rose-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 shrink-0 ${
                          isPresent
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {isPresent ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {isPresent ? "Có mặt" : "Vắng"}
                      </span>
                      <span className="text-slate-600 truncate">
                        {(r.weekNumber != null ? `T${r.weekNumber} · ` : "")}
                        {r.meetingDate
                          ? new Date(r.meetingDate).toLocaleDateString("vi-VN")
                          : r.markedAt
                            ? new Date(r.markedAt).toLocaleDateString("vi-VN")
                            : "—"}
                        {r.notes ? ` · ${r.notes}` : ""}
                      </span>
                    </div>
                    <CalendarDays className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
