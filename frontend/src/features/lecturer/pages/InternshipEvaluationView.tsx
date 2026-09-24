import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ClipboardCheck,
  RefreshCw,
  Loader2,
  AlertCircle,
  Search,
  Save,
  Sparkles,
  FileText,
  Clock,
  XCircle,
  CheckCircle2,
  Hourglass,
  Table2,
  Download,
  CalendarDays,
  UserCheck,
  UserX,
  CalendarClock,
  Lock,
  Hourglass as HourglassIcon,
  ShieldAlert,
} from "lucide-react";
import { useSemester } from "../../../contexts/SemesterContext";
import {
  semesterReportScheduleService,
  type SemesterReportScheduleDto,
} from "../../../services/semesterReportSchedule.service";
import {
  internshipGradingService,
  type StudentGrade,
  type GradingWeekStatus,
  type GradingSummaryResponse,
} from "../../../services/internshipGrading.service";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { parseBackendDate } from "../../../lib/formatDateTimeVi";
import {
  GR_QUALITY_RUBRIC_LEVELS,
  computeGrade,
  getClassificationTone,
} from "../../../lib/gradingRules";
import { formatDateTimeVi } from "../../../lib/formatDateTimeVi";
import { lecturerExportService } from "../../../services/lecturerExport.service";

// ────────────────────────────────────────────────────────────────────────────
// Tab 1: Cấu hình báo cáo & deadline
// ────────────────────────────────────────────────────────────────────────────

type Phase = "upcoming" | "active" | "closing" | "closed";

function phaseOf(schedule: SemesterReportScheduleDto, now: Date): Phase {
  if (!schedule.isSubmissionOpen) return "closed";
  const start = parseBackendDate(schedule.startDate) ?? parseBackendDate(schedule.dueDate);
  const deadline = parseBackendDate(schedule.dueDate);
  if (start && now < start) return "upcoming";
  if (deadline) {
    const hoursLeft = (deadline.getTime() - now.getTime()) / 3600000;
    if (hoursLeft < 0) return "closed";
    if (hoursLeft <= 48) return "closing";
  }
  return "active";
}

const PHASE_BADGE: Record<Phase, { label: string; cls: string }> = {
  active: { label: "Đang diễn ra", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  closing: { label: "Sắp hết hạn", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  closed: { label: "Đã đóng", cls: "bg-slate-100 text-slate-500 border-slate-200" },
  upcoming: { label: "Sắp diễn ra", cls: "bg-sky-100 text-sky-700 border-sky-200" },
};

function toDateTimeLocalValue(iso?: string | null): string {
  if (!iso) return "";
  const d = parseBackendDate(iso);
  if (!d) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

interface DraftRow {
  startDate: string;
  dueDate: string;
  isSubmissionOpen: boolean;
  allowLateSubmission: boolean;
}

function ScheduleConfigTab({
  onShowToast,
}: {
  onShowToast?: (msg: string, type?: string) => void;
}) {
  const { activeSemesterId } = useSemester();
  const semesterId = activeSemesterId;

  const [schedules, setSchedules] = useState<SemesterReportScheduleDto[]>([]);
  const [drafts, setDrafts] = useState<Record<number, DraftRow>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirtyWeeks, setDirtyWeeks] = useState<Set<number>>(new Set());
  const [now] = useState(() => new Date());

  const load = useCallback(async () => {
    if (!semesterId) return;
    setIsLoading(true);
    setError(null);
    try {
      let data = await semesterReportScheduleService.getSchedules(semesterId);
      if (data.length === 0) {
        data = await semesterReportScheduleService.generateDefaults(semesterId);
      }
      setSchedules(data);
      setDrafts(
        Object.fromEntries(
          data.map((s) => [
            s.weekNumber,
            {
              startDate: toDateTimeLocalValue(s.startDate),
              dueDate: toDateTimeLocalValue(s.dueDate),
              isSubmissionOpen: s.isSubmissionOpen,
              allowLateSubmission: s.allowLateSubmission,
            } satisfies DraftRow,
          ])
        )
      );
      setDirtyWeeks(new Set());
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setError(msg);
      onShowToast?.(msg, "error");
    } finally {
      setIsLoading(false);
    }
  }, [semesterId, onShowToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateDraft = (weekNumber: number, patch: Partial<DraftRow>) => {
    setDrafts((prev) => ({ ...prev, [weekNumber]: { ...prev[weekNumber], ...patch } }));
    setDirtyWeeks((prev) => new Set(prev).add(weekNumber));
  };

  const saveAll = async () => {
    if (!semesterId || dirtyWeeks.size === 0 || isSaving) return;
    setIsSaving(true);
    let ok = 0;
    try {
      for (const schedule of schedules) {
        if (!dirtyWeeks.has(schedule.weekNumber)) continue;
        const draft = drafts[schedule.weekNumber];
        if (!draft) continue;
        await semesterReportScheduleService.updateSchedule(semesterId, schedule.weekNumber, {
          title: schedule.title,
          startDate: fromDateTimeLocalValue(draft.startDate),
          dueDate: fromDateTimeLocalValue(draft.dueDate) ?? undefined,
          isSubmissionOpen: draft.isSubmissionOpen,
          allowLateSubmission: draft.allowLateSubmission,
        });
        ok++;
      }
      onShowToast?.(`Đã lưu cấu hình cho ${ok} báo cáo.`, "success");
      await load();
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setError(msg);
      onShowToast?.(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const stats = useMemo(() => {
    const phases = schedules.map((s) => phaseOf(s, now));
    return {
      active: phases.filter((p) => p === "active").length,
      closing: phases.filter((p) => p === "closing").length,
      closed: phases.filter((p) => p === "closed").length,
    };
  }, [schedules, now]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Panel className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Đang diễn ra</p>
            <p className="text-xl font-semibold text-slate-900">{stats.active}</p>
          </div>
        </Panel>
        <Panel className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-100 p-2.5 text-amber-600">
            <HourglassIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Sắp hết hạn (≤48h)</p>
            <p className="text-xl font-semibold text-slate-900">{stats.closing}</p>
          </div>
        </Panel>
        <Panel className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-100 p-2.5 text-slate-500">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Đã đóng</p>
            <p className="text-xl font-semibold text-slate-900">{stats.closed}</p>
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarClock className="h-4 w-4" /> Sáu báo cáo tuần và báo cáo cuối kỳ
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Tải lại
            </button>
            <button
              type="button"
              onClick={saveAll}
              disabled={isSaving || dirtyWeeks.size === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Lưu thay đổi{dirtyWeeks.size > 0 ? ` (${dirtyWeeks.size})` : ""}
            </button>
          </div>
        </div>

        {isLoading && schedules.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2.5">Kỳ</th>
                  <th className="px-3 py-2.5">Trạng thái</th>
                  <th className="px-3 py-2.5">Mở nộp (start)</th>
                  <th className="px-3 py-2.5">Hạn chót (deadline)</th>
                  <th className="px-3 py-2.5 text-center">Kích hoạt nộp</th>
                  <th className="px-3 py-2.5 text-center">Nộp trễ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.map((schedule) => {
                  const draft = drafts[schedule.weekNumber];
                  const badge = PHASE_BADGE[phaseOf(schedule, now)];
                  const isFinal = schedule.isFinalReport;
                  return (
                    <tr key={schedule.id} className={isFinal ? "bg-indigo-50/40" : undefined}>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {isFinal ? (
                            <Sparkles className="h-4 w-4 text-indigo-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-slate-400" />
                          )}
                          <div>
                            <p className="font-medium text-slate-900">{schedule.title}</p>
                            <p className="text-xs text-slate-400">
                              {isFinal ? "Điều kiện dự thi" : `TUẦN ${schedule.weekNumber}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="datetime-local"
                          value={draft?.startDate ?? ""}
                          onChange={(e) => updateDraft(schedule.weekNumber, { startDate: e.target.value })}
                          className="w-52 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="datetime-local"
                          value={draft?.dueDate ?? ""}
                          onChange={(e) => updateDraft(schedule.weekNumber, { dueDate: e.target.value })}
                          className="w-52 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={draft?.isSubmissionOpen}
                          onClick={() => updateDraft(schedule.weekNumber, { isSubmissionOpen: !draft?.isSubmissionOpen })}
                          className={`relative h-6 w-11 rounded-full transition-colors ${
                            draft?.isSubmissionOpen ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              draft?.isSubmissionOpen ? "translate-x-[22px]" : ""
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={draft?.allowLateSubmission}
                          onClick={() => updateDraft(schedule.weekNumber, { allowLateSubmission: !draft?.allowLateSubmission })}
                          className={`relative h-6 w-11 rounded-full transition-colors ${
                            draft?.allowLateSubmission ? "bg-blue-500" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              draft?.allowLateSubmission ? "translate-x-[22px]" : ""
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tab 2: Chấm điểm & đánh giá chất lượng (side panel)
// ────────────────────────────────────────────────────────────────────────────

const WEEK_STATUS_BADGE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  on_time: { label: "Đúng hạn", cls: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  late: { label: "Trễ", cls: "bg-amber-100 text-amber-700", icon: <Clock className="h-3 w-3" /> },
  missing: { label: "Không nộp", cls: "bg-red-100 text-red-700", icon: <XCircle className="h-3 w-3" /> },
  pending: { label: "Chưa đến hạn", cls: "bg-slate-100 text-slate-500", icon: <Hourglass className="h-3 w-3" /> },
};

const ATTENDANCE_BADGE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  present: { label: "Có mặt", cls: "bg-emerald-100 text-emerald-700", icon: <UserCheck className="h-3 w-3" /> },
  absent: { label: "Vắng", cls: "bg-red-100 text-red-700", icon: <UserX className="h-3 w-3" /> },
  no_session: { label: "Không có buổi", cls: "bg-slate-100 text-slate-400", icon: <CalendarDays className="h-3 w-3" /> },
};

function GradingTab({
  onShowToast,
}: {
  onShowToast?: (msg: string, type?: string) => void;
}) {
  const { activeSemesterId } = useSemester();
  const semesterId = activeSemesterId;

  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quality, setQuality] = useState<number | null>(null);
  const [weeklyQuality, setWeeklyQuality] = useState<Record<number, number>>({});
  const [creative, setCreative] = useState(false);
  const [oralExam, setOralExam] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (!semesterId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await internshipGradingService.getSummary(semesterId);
      setStudents(data.students);
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setError(msg);
      onShowToast?.(msg, "error");
    } finally {
      setIsLoading(false);
    }
  }, [semesterId, onShowToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
    );
  }, [students, search]);

  const selected = useMemo(
    () => students.find((s) => s.studentId === selectedId) ?? null,
    [students, selectedId]
  );

  const openPanel = (student: StudentGrade) => {
    setSelectedId(student.studentId);
    setQuality(student.qualityScore);
    setWeeklyQuality(student.weeklyQualityScores ?? {});
    setCreative(student.hasCreativeProduct);
    setOralExam(student.oralExamScore != null ? String(student.oralExamScore) : "");
  };

  const preview = useMemo(() => {
    if (!selected) return null;
    const oralNum = oralExam.trim() === "" ? null : Number(oralExam);
    const result = computeGrade({
      weeks: selected.weeks.map((week) => ({
        weekNumber: week.weekNumber,
        submittedAt: week.submittedAt,
        deadline: week.deadline,
      })),
      absentWeekCount: selected.absentCount,
      weeklyQualityLevels: Object.values(weeklyQuality),
      finalReportSubmittedAt: selected.finalReportSubmitted ? "1970-01-01T00:00:00Z" : null,
      qualityLevel: quality,
      hasCreativeProduct: creative,
      oralExamScore: oralNum != null && !isNaN(oralNum) ? oralNum : null,
    });
    return {
      qt: result.processScore,
      eligible: result.isEligible,
      average: result.averageScore,
      classification: result.classification,
    };
  }, [selected, quality, weeklyQuality, creative, oralExam]);

  const saveGrade = async () => {
    if (!semesterId || !selected) return;
    setIsSaving(true);
    try {
      const oralNum = oralExam.trim() === "" ? null : Number(oralExam);
      // Không gửi Điểm thi khi SV không đủ điều kiện (backend cũng chặn — bảo vệ 2 lớp)
      const eligibleOral =
        preview?.eligible && oralNum != null && !isNaN(oralNum) ? oralNum : null;
      const updated = await internshipGradingService.saveGrade(semesterId, {
        studentId: selected.studentId,
        qualityScore: Object.keys(weeklyQuality).length > 0 ? null : quality,
        weeklyQualityScores: weeklyQuality,
        hasCreativeProduct: creative,
        oralExamScore: eligibleOral,
      });
      setStudents((prev) => prev.map((s) => (s.studentId === updated.studentId ? updated : s)));
      onShowToast?.(`Đã lưu điểm cho ${updated.fullName}.`, "success");
    } catch (err) {
      const msg = getApiErrorMessage(err);
      onShowToast?.(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Panel className="xl:col-span-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ClipboardCheck className="h-4 w-4" /> Danh sách sinh viên
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm tên / MSSV / lớp..."
                  className="w-56 rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <button
                type="button"
                onClick={() => void load()}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {isLoading && students.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Không có sinh viên nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2.5">Sinh viên</th>
                    <th className="px-3 py-2.5 text-center">Trễ / Thiếu nộp</th>
                    <th className="px-3 py-2.5 text-center">Vắng</th>
                    <th className="px-3 py-2.5 text-center">Điểm QT</th>
                    <th className="px-3 py-2.5 text-center">Điều kiện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((student) => (
                    <tr
                      key={student.studentId}
                      onClick={() => openPanel(student)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                        selectedId === student.studentId ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <InitialsAvatar name={student.fullName} className="h-8 w-8 text-xs" />
                          <div>
                            <p className="font-medium text-slate-900">{student.fullName}</p>
                            <p className="text-xs text-slate-400">
                              {student.studentCode} · {student.className}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="font-medium text-amber-600">{student.lateCount}</span>
                        {" / "}
                        <span className="font-medium text-red-600">{student.missingCount}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-semibold ${student.absentCount >= 2 ? "text-red-600" : "text-slate-600"}`}>
                          {student.absentCount}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold">{student.processScore.toFixed(1)}</td>
                      <td className="px-3 py-2.5 text-center">
                        {student.isEligible ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Đủ
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            Không đủ
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel className="xl:col-span-2">
          {!selected ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center text-slate-400">
              <FileText className="mb-2 h-8 w-8" />
              <p className="text-sm">Chọn một sinh viên để chấm điểm</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <InitialsAvatar name={selected.fullName} className="h-10 w-10" />
                <div>
                  <p className="font-semibold text-slate-900">{selected.fullName}</p>
                  <p className="text-xs text-slate-400">
                    {selected.studentCode} · {selected.className}
                  </p>
                </div>
              </div>

              {/* Nộp bài + điểm danh theo tuần */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Nộp bài & điểm danh theo tuần
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.weeks.map((w) => {
                    const badge = WEEK_STATUS_BADGE[w.status];
                    const at = ATTENDANCE_BADGE[w.attendanceStatus] ?? ATTENDANCE_BADGE.no_session;
                    return (
                      <span
                        key={w.weekNumber}
                        title={`T${w.weekNumber}: ${badge.label}${w.submittedAt ? ` (${formatDateTimeVi(w.submittedAt)})` : ""} · ${at.label}`}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${badge.cls} ${
                          w.isAttendanceAbsent ? "ring-2 ring-red-300" : ""
                        }`}
                      >
                        {badge.icon} T{w.weekNumber}
                        {w.attendanceStatus === "absent" && <UserX className="h-3 w-3 text-red-600" />}
                      </span>
                    );
                  })}
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                      WEEK_STATUS_BADGE[selected.finalReportStatus].cls
                    }`}
                  >
                    <Sparkles className="h-3 w-3" /> Cuối kỳ
                  </span>
                </div>
              </div>

              {/* Cụm 1 — đánh giá chất lượng theo từng báo cáo tuần */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Chất lượng từng báo cáo (tính trung bình, tối đa 5 điểm)
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {selected.weeks.map((week) => (
                    <label key={week.weekNumber} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <span className="font-medium">Tuần {week.weekNumber}</span>
                      <select value={weeklyQuality[week.weekNumber] ?? ""} onChange={(event) => setWeeklyQuality((current) => ({ ...current, ...(event.target.value ? { [week.weekNumber]: Number(event.target.value) } : (() => { const next = { ...current }; delete next[week.weekNumber]; return next; })()) }))} className="rounded border border-slate-200 px-2 py-1 text-xs">
                        <option value="">Chưa chấm</option>
                        {GR_QUALITY_RUBRIC_LEVELS.map((level) => <option key={level.value} value={level.value}>{level.value.toFixed(1)} - {level.label}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              </div>

              {/* Cụm 2 — Thưởng sáng tạo */}
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Có sản phẩm sáng tạo
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs font-medium text-emerald-600">+1.0đ</span>
                  <input
                    type="checkbox"
                    checked={creative}
                    onChange={(e) => setCreative(e.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                </span>
              </label>
              <p className="text-[11px] text-slate-500">
                {selected.productSubmitted ? "Sinh viên đã nộp sản phẩm. Giảng viên tick để xác nhận cộng 1 điểm." : "Chưa ghi nhận sản phẩm sinh viên."}
              </p>

              {/* Cụm 3 — tự đếm + QT tạm tính */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Hệ thống tự đếm
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
                    <span className="text-slate-500">Thiếu nộp: </span>
                    <span className="font-semibold text-red-600">{selected.missingCount}</span>
                  </div>
                  <div className="rounded-md bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
                    <span className="text-slate-500">Trễ: </span>
                    <span className="font-semibold text-amber-600">{selected.lateCount}</span>
                  </div>
                  <div className="rounded-md bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
                    <span className="text-slate-500">Vắng buổi hẹn: </span>
                    <span className={`font-semibold ${selected.absentCount >= 2 ? "text-red-600" : ""}`}>
                      {selected.absentCount}
                    </span>
                  </div>
                  <div className="rounded-md bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
                    <span className="text-slate-500">Báo cáo cuối kỳ: </span>
                    <span className={`font-semibold ${selected.finalReportSubmitted ? "text-emerald-600" : "text-red-600"}`}>
                      {selected.finalReportSubmitted ? "Đã nộp" : "Chưa"}
                    </span>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between rounded-md bg-blue-600 px-3 py-2 text-white">
                  <span className="text-xs font-medium">Điểm QT tạm tính</span>
                  <span className="text-lg font-bold">{preview?.qt.toFixed(1) ?? selected.processScore.toFixed(1)}</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
                  QT = MIN(10, Nộp đủ(2) + Đúng hạn(2) + Chất lượng(5) + Sáng tạo(+1)). Số buổi vắng ≥ 2 ảnh hưởng điều kiện dự thi, không trừ điểm QT.
                </p>
              </div>

              {/* Điểm thi vấn đáp + preview TB */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Điểm thi vấn đáp (thang 10)
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.25}
                  value={oralExam}
                  onChange={(e) => setOralExam(e.target.value)}
                  placeholder="Nhập điểm thi..."
                  disabled={!preview?.eligible}
                  title={
                    preview?.eligible
                      ? undefined
                      : `Không đủ điều kiện dự thi: ${selected.ineligibleReasons.join("; ")}`
                  }
                  className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                    !preview?.eligible ? "cursor-not-allowed bg-slate-100 text-slate-400" : ""
                  }`}
                />
                {preview && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-blue-50 px-3 py-2 ring-1 ring-blue-100">
                      <p className="text-[11px] text-blue-500">Điểm TB (real-time)</p>
                      <p className="text-lg font-bold text-blue-700">
                        {preview.average != null ? preview.average.toFixed(1) : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                      <p className="text-[11px] text-slate-500">Xếp loại</p>
                      <p className="text-sm font-bold text-slate-700">
                        {preview.classification || "—"}
                      </p>
                    </div>
                  </div>
                )}
                {!preview?.eligible && (
                  <p className="mt-2 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-600">
                    Không đủ điều kiện dự thi — Điểm TB = 0, xếp loại "không thực tập"
                    {selected.ineligibleReasons.length > 0 && ` (${selected.ineligibleReasons.join("; ")})`}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={saveGrade}
                disabled={isSaving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Lưu điểm
              </button>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tab 3: Bảng tổng hợp + Export Excel
// ────────────────────────────────────────────────────────────────────────────

const WEEK_CELL_STYLE: Record<GradingWeekStatus["status"], string> = {
  on_time: "bg-emerald-50 text-emerald-700 font-medium",
  late: "bg-amber-50 text-amber-700 font-medium",
  missing: "bg-red-100 text-red-700 font-bold",
  pending: "bg-slate-50 text-slate-400",
};

function weekCellLabel(w: GradingWeekStatus): string {
  if (w.status === "on_time") return "✓";
  if (w.status === "late") return "Trễ";
  if (w.status === "missing") return "X";
  return "–";
}

function attendanceCellLabel(status: GradingWeekStatus["attendanceStatus"]): string {
  if (status === "present") return "✓";
  if (status === "absent") return "V";
  return "–";
}

function SummaryTab({
  onShowToast,
}: {
  onShowToast?: (msg: string, type?: string) => void;
}) {
  const { activeSemesterId } = useSemester();
  const semesterId = activeSemesterId;

  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [oralDrafts, setOralDrafts] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  // Lịch tuần của kỳ (từ API summary) — nguồn cho header cột T1..TN đúng số tuần
  const [data, setData] = useState<GradingSummaryResponse | null>(null);

  const load = useCallback(async () => {
    if (!semesterId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await internshipGradingService.getSummary(semesterId);
      setData(data);
      setStudents(data.students);
      setOralDrafts(
        Object.fromEntries(
          data.students.map((s) => [
            s.studentId,
            s.oralExamScore != null ? String(s.oralExamScore) : "",
          ])
        )
      );
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setError(msg);
      onShowToast?.(msg, "error");
    } finally {
      setIsLoading(false);
    }
  }, [semesterId, onShowToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const schedule = useMemo(() => data?.schedule ?? [], [data]);
  const rowPreview = useMemo(() => {
    const map: Record<string, { average: number | null; classification: string; isEligible: boolean }> = {};
    for (const s of students) {
      const oralRaw = oralDrafts[s.studentId] ?? "";
      const oralNum = oralRaw.trim() === "" ? null : Number(oralRaw);
      // Tính cùng input với tab Chấm điểm (GradingTab.preview): đủ weeks + isAbsent,
      // absentWeekCount và weeklyQualityScores — hai bảng phải ra cùng kết quả cho cùng SV.
      const result = computeGrade({
        weeks: s.weeks.map((week) => ({
          weekNumber: week.weekNumber,
          submittedAt: week.submittedAt,
          deadline: week.deadline,
          isAbsent: week.isAttendanceAbsent,
        })),
        absentWeekCount: s.absentCount,
        weeklyQualityLevels: Object.values(s.weeklyQualityScores ?? {}),
        finalReportSubmittedAt: s.finalReportSubmitted ? "1970-01-01T00:00:00Z" : null,
        qualityLevel: s.qualityScore,
        hasCreativeProduct: s.hasCreativeProduct,
        oralExamScore: oralNum != null && !isNaN(oralNum) ? oralNum : null,
      });
      map[s.studentId] = { average: result.averageScore, classification: result.classification, isEligible: result.isEligible };
    }
    return map;
  }, [students, oralDrafts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
    );
  }, [students, search]);

  const commitOralScore = async (studentId: string) => {
    if (!semesterId) return;
    const target = students.find((s) => s.studentId === studentId);
    if (target && !target.isEligible) {
      onShowToast?.(
        `${target.fullName} không đủ điều kiện dự thi (${target.ineligibleReasons.join("; ")}) — không thể nhập Điểm thi.`,
        "error"
      );
      return;
    }
    const raw = (oralDrafts[studentId] ?? "").trim();
    const num = raw === "" ? null : Number(raw);
    if (num != null && (isNaN(num) || num < 0 || num > 10)) {
      onShowToast?.("Điểm thi phải trong khoảng 0–10.", "error");
      return;
    }
    setSavingIds((prev) => new Set(prev).add(studentId));
    try {
      const updated = await internshipGradingService.saveGrade(semesterId, {
        studentId,
        hasCreativeProduct: students.find((s) => s.studentId === studentId)?.hasCreativeProduct ?? false,
        oralExamScore: num,
      });
      setStudents((prev) => prev.map((s) => (s.studentId === updated.studentId ? updated : s)));
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }
  };

  const exportExcel = async () => {
    if (!semesterId) return;
    setIsExporting(true);
    try {
      await lecturerExportService.downloadInternshipExcel(semesterId);
      onShowToast?.("Đã xuất file Excel danh sách thực tập.", "success");
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    } finally {
      setIsExporting(false);
    }
  };

  const stats = useMemo(() => {
    let eligible = 0;
    let ineligible = 0;
    for (const s of students) {
      if (!s.isEligible) ineligible++;
      else eligible++;
    }
    return { eligible, ineligible };
  }, [students]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Panel className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-600">
            <Table2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Đủ điều kiện dự thi</p>
            <p className="text-xl font-semibold text-slate-900">{stats.eligible}/{students.length}</p>
          </div>
        </Panel>
        <Panel className="flex items-center gap-3">
          <div className="rounded-lg bg-red-100 p-2.5 text-red-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Không đủ điều kiện</p>
            <p className="text-xl font-semibold text-slate-900">{stats.ineligible}</p>
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Table2 className="h-4 w-4" /> Tổng hợp điểm thực tập
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên / MSSV / lớp..."
                className="w-56 rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={exportExcel}
              disabled={isExporting || students.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export Excel
            </button>
          </div>
        </div>

        {isLoading && students.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Không có dữ liệu.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
              <span><strong className="text-slate-700">Trên:</strong> bài nộp (✓ đúng hạn, Trễ, X chưa nộp)</span>
              <span><strong className="text-slate-700">Dưới:</strong> điểm danh (✓ có mặt, V vắng, – không có buổi)</span>
            </div>
            <table className="w-full min-w-[1150px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2.5">STT</th>
                  <th className="px-2 py-2.5">HỌ TÊN</th>
                  <th className="px-2 py-2.5">LỚP</th>
                  <th className="px-2 py-2.5 text-center">ĐIỂM QT</th>
                  <th className="px-2 py-2.5 text-center">ĐIỂM THI</th>
                  <th className="px-2 py-2.5 text-center">ĐIỂM TB</th>
                  <th className="px-2 py-2.5 text-center">XẾP LOẠI</th>
                  {/* Cột tuần render theo lịch kỳ (schedule) — không hardcode T1..T6 */}
                  {schedule.map((week) => (
                    <th key={week.weekNumber} className="px-2 py-2.5 text-center">T{week.weekNumber}</th>
                  ))}
                  <th className="px-2 py-2.5 text-center">NỘP BC</th>
                  <th className="px-2 py-2.5 text-center">VẮNG</th>
                  <th className="px-2 py-2.5 text-center">TỔNG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s, idx) => {
                  const preview = rowPreview[s.studentId];
                  const isSaving = savingIds.has(s.studentId);
                  return (
                    <tr key={s.studentId} className={s.isEligible ? undefined : "bg-red-50/50"}>
                      <td className="px-2 py-2.5 text-center text-slate-500">{idx + 1}</td>
                      <td className="px-2 py-2.5">
                        <p className="font-medium text-slate-900">{s.fullName}</p>
                        <p className="text-xs text-slate-400">{s.studentCode}</p>
                      </td>
                      <td className="px-2 py-2.5 text-center">{s.className || "—"}</td>
                      <td className="px-2 py-2.5 text-center font-semibold">{s.processScore.toFixed(1)}</td>
                      <td className="px-2 py-2.5 text-center">
                        <input
                          type="number"
                          min={0}
                          max={10}
                          step={0.25}
                          value={oralDrafts[s.studentId] ?? ""}
                          onChange={(e) =>
                            setOralDrafts((prev) => ({ ...prev, [s.studentId]: e.target.value }))
                          }
                          onBlur={() => void commitOralScore(s.studentId)}
                          onKeyDown={(e) => e.key === "Enter" && void commitOralScore(s.studentId)}
                          placeholder="—"
                          disabled={!s.isEligible}
                          title={
                            s.isEligible
                              ? undefined
                              : `Không đủ điều kiện dự thi: ${s.ineligibleReasons.join("; ")}`
                          }
                          className={`w-16 rounded-md border border-slate-200 px-1.5 py-1 text-center text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                            !s.isEligible ? "cursor-not-allowed bg-slate-100 text-slate-400" : ""
                          }`}
                        />
                        {isSaving && <Loader2 className="mx-auto mt-0.5 h-3 w-3 animate-spin text-blue-500" />}
                      </td>
                      <td className="px-2 py-2.5 text-center font-bold text-blue-700">
                        {preview?.average != null ? preview.average.toFixed(1) : "—"}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getClassificationTone(
                            preview?.classification ?? ""
                          )}`}
                        >
                          {preview?.classification || "—"}
                        </span>
                      </td>
                      {s.weeks.map((w) => (
                        <td key={w.weekNumber} className="px-2 py-2.5 text-center">
                          <span
                            title={`Bài nộp: ${w.status === "on_time" ? "Đúng hạn" : w.status === "late" ? "Trễ" : w.status === "missing" ? "Chưa nộp" : "Chưa đến hạn"} · Điểm danh: ${w.attendanceStatus === "present" ? "Có mặt" : w.attendanceStatus === "absent" ? "Vắng" : "Không có buổi"}`}
                            className="inline-flex w-10 flex-col items-center gap-0.5"
                          >
                            <span className={`inline-flex min-h-5 w-full justify-center rounded px-1 py-0.5 text-[10px] ${WEEK_CELL_STYLE[w.status]}`}>
                              {weekCellLabel(w)}
                            </span>
                            <span className={`inline-flex min-h-4 w-full justify-center rounded px-1 text-[10px] font-semibold ${
                              w.attendanceStatus === "absent"
                                ? "bg-red-100 text-red-700"
                                : w.attendanceStatus === "present"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-50 text-slate-400"
                            }`}>
                              {attendanceCellLabel(w.attendanceStatus)}
                            </span>
                          </span>
                        </td>
                      ))}
                      <td className="px-2 py-2.5 text-center">
                        <span
                          className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${
                            s.finalReportSubmitted
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-100 text-red-700 font-bold"
                          }`}
                        >
                          {s.finalReportSubmitted ? "Đã nộp" : "X"}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span className={`font-semibold ${s.absentCount >= 2 ? "text-red-600" : "text-slate-600"}`}>
                          {s.absentCount}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        {!s.isEligible && (
                          <span
                            title={s.ineligibleReasons.join("; ")}
                            className="inline-flex rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white"
                          >
                            Không đủ ĐK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Trang gộp: tabs Cấu hình / Chấm điểm / Tổng hợp
// ────────────────────────────────────────────────────────────────────────────

export const InternshipEvaluationView: React.FC<{
  onShowToast?: (msg: string, type?: string) => void;
  initialTab?: string;
}> = ({ onShowToast, initialTab }) => {
  const [tab, setTab] = useState<"schedule" | "grading" | "summary">(
    initialTab === "grading" ? "grading" : initialTab === "summary" ? "summary" : "schedule"
  );

  const tabs: { id: typeof tab; label: string; icon: typeof CalendarClock }[] = [
    { id: "schedule", label: "Cấu hình báo cáo", icon: CalendarClock },
    { id: "grading", label: "Chấm điểm", icon: ClipboardCheck },
    { id: "summary", label: "Tổng hợp & Xuất file", icon: Table2 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardCheck}
        title="Đánh giá thực tập"
        subtitle="Cấu hình báo cáo, đánh giá chất lượng, nhập điểm thi và tổng hợp kết quả theo quy định hiện hành."
      />

      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "schedule" && <ScheduleConfigTab onShowToast={onShowToast} />}
      {tab === "grading" && <GradingTab onShowToast={onShowToast} />}
      {tab === "summary" && <SummaryTab onShowToast={onShowToast} />}
    </div>
  );
};
