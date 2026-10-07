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
  FileSpreadsheet,
  Eye,
  CalendarDays,
  UserCheck,
  UserX,
  CalendarClock,
  Lock,
  BarChart3,
  X,
  ChevronLeft,
  ChevronRight,
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
import { Panel } from "../../../components/common/Panel";
import { LecturerSubPageHeader } from "../components/LecturerSubPageHeader";
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
import { lecturerInternshipsService, type LecturerSemesterOptionDto } from "../../../services/lecturerInternships.service";
import { submissionApiService } from "../../../services/submissionApi.service";

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
  active: { label: "Đang diễn ra", cls: "bg-[#7bc043]/10 text-[#446d20] border-[#7bc043]/30" },
  closing: { label: "Sắp hết hạn", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  closed: { label: "Đã đóng", cls: "bg-slate-100 text-slate-500 border-slate-200" },
  upcoming: { label: "Sắp diễn ra", cls: "bg-sky-100 text-sky-700 border-sky-200" },
};

function toDateTimeLocalValue(iso?: string | null): string {
  if (!iso) return "";
  const d = parseBackendDate(iso);
  if (!d) return "";
  // Always display in Vietnam timezone (UTC+7) regardless of browser timezone
  const vnOffset = 7 * 60; // +7 hours in minutes
  const vnTime = new Date(d.getTime() + vnOffset * 60000);
  return vnTime.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string): string | null {
  if (!value) return null;
  // Input is in Vietnam time (UTC+7), convert back to UTC
  const vnOffset = 7 * 60; // +7 hours in minutes
  const d = new Date(value + ":00.000Z"); // Parse as UTC
  if (isNaN(d.getTime())) return null;
  const utc = new Date(d.getTime() - vnOffset * 60000);
  return utc.toISOString();
}

interface DraftRow {
  startDate: string;
  dueDate: string;
  isSubmissionOpen: boolean;
  allowLateSubmission: boolean;
}

export function ScheduleConfigTab({
  onShowToast,
  semesterId: selectedSemesterId,
}: {
  onShowToast?: (msg: string, type?: string) => void;
  semesterId?: string;
}) {
  const { activeSemesterId, selectedSemester } = useSemester();
  const semesterId = selectedSemesterId || (
    selectedSemester?.id && selectedSemester.id !== "all"
      ? selectedSemester.id
      : activeSemesterId
  );

  const [schedules, setSchedules] = useState<SemesterReportScheduleDto[]>([]);
  const [drafts, setDrafts] = useState<Record<number, DraftRow>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirtyWeeks, setDirtyWeeks] = useState<Set<number>>(new Set());
  const [now] = useState(() => new Date());

  const load = useCallback(async () => {
    if (!semesterId) {
      setSchedules([]);
      setDrafts({});
      setError(null);
      setIsLoading(false);
      return;
    }
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

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-xs shadow-2xs" aria-label="Tổng quan trạng thái deadline">
        <span className="text-slate-500">Đang diễn ra: <strong className="text-[#446d20]">{stats.active}</strong></span>
        <span className="text-slate-500">Sắp hết hạn (≤48h): <strong className="text-amber-700">{stats.closing}</strong></span>
        <span className="text-slate-500">Đã đóng: <strong className="text-slate-700">{stats.closed}</strong></span>
      </div>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarClock className="h-4 w-4 text-[#026aa7]" /> Báo cáo tuần và báo cáo cuối kỳ
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={isLoading}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-300 px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Tải lại
            </button>
            <button
              type="button"
              onClick={saveAll}
              disabled={isSaving || dirtyWeeks.size === 0}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#026aa7] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:opacity-50"
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
                    <tr key={schedule.id} className={isFinal ? "bg-[#026aa7]/5" : undefined}>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {isFinal ? (
                            <Sparkles className="h-4 w-4 text-[#026aa7]" />
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
                          className="w-52 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-[#026aa7] focus:ring-2 focus:ring-[#026aa7]/20"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="datetime-local"
                          value={draft?.dueDate ?? ""}
                          onChange={(e) => updateDraft(schedule.weekNumber, { dueDate: e.target.value })}
                          className="w-52 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-[#026aa7] focus:ring-2 focus:ring-[#026aa7]/20"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={draft?.isSubmissionOpen}
                          onClick={() => updateDraft(schedule.weekNumber, { isSubmissionOpen: !draft?.isSubmissionOpen })}
                          className={`relative h-6 w-11 rounded-full transition-colors ${
                            draft?.isSubmissionOpen ? "bg-[#7bc043]" : "bg-slate-300"
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
                            draft?.allowLateSubmission ? "bg-[#026aa7]" : "bg-slate-300"
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
  on_time: { label: "Đúng hạn", cls: "bg-[#7bc043]/10 text-[#446d20]", icon: <CheckCircle2 className="h-3 w-3" /> },
  late: { label: "Trễ", cls: "bg-amber-100 text-amber-700", icon: <Clock className="h-3 w-3" /> },
  missing: { label: "Không nộp", cls: "bg-red-100 text-red-700", icon: <XCircle className="h-3 w-3" /> },
  pending: { label: "Chưa đến hạn", cls: "bg-slate-100 text-slate-500", icon: <Hourglass className="h-3 w-3" /> },
};

const ATTENDANCE_BADGE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  present: { label: "Có mặt", cls: "bg-[#7bc043]/10 text-[#446d20]", icon: <UserCheck className="h-3 w-3" /> },
  absent: { label: "Vắng", cls: "bg-red-100 text-red-700", icon: <UserX className="h-3 w-3" /> },
  no_session: { label: "Không có buổi", cls: "bg-slate-100 text-slate-400", icon: <CalendarDays className="h-3 w-3" /> },
};

function GradingTab({
  onShowToast,
}: {
  onShowToast?: (msg: string, type?: string) => void;
}) {
  const { activeSemesterId, selectedSemester } = useSemester();
  const semesterId = selectedSemester?.id && selectedSemester.id !== "all"
    ? selectedSemester.id
    : activeSemesterId;

  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quality, setQuality] = useState<number | null>(null);
  const [weeklyQuality, setWeeklyQuality] = useState<Record<number, number>>({});
  const [creative, setCreative] = useState(false);
  const [oralExam, setOralExam] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingEmployerProof, setIsDownloadingEmployerProof] = useState(false);
  const [isPreviewingEmployerProof, setIsPreviewingEmployerProof] = useState(false);
  const [employerProofPreview, setEmployerProofPreview] = useState<{ url: string; mimeType: string; fileName: string } | null>(null);

  useEffect(() => {
    const previewUrl = employerProofPreview?.url;
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [employerProofPreview?.url]);

  const load = useCallback(async () => {
    if (!semesterId) {
      setStudents([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setStudents([]);
    setSelectedId(null);
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
  const openWeeks = useMemo(
    () => selected?.weeks.filter((week) => week.isSubmissionOpen) ?? [],
    [selected],
  );
  const openWeeklyQuality = useMemo(
    () => openWeeks.map((week) => weeklyQuality[week.weekNumber]).filter((score): score is number => score != null),
    [openWeeks, weeklyQuality],
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
      finalReportSubmitted: selected.finalReportSubmitted,
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

  const downloadEmployerProof = async () => {
    if (!selected?.employerEvidenceSubmissionId || isDownloadingEmployerProof) return;
    setIsDownloadingEmployerProof(true);
    try {
      if (selected.employerEvidenceAssetId) {
        await submissionApiService.downloadAsset(
          selected.employerEvidenceSubmissionId,
          selected.employerEvidenceAssetId,
          selected.employerEvidenceFileName ?? "Phieu-danh-gia-doanh-nghiep",
        );
      } else {
        await submissionApiService.download(
          selected.employerEvidenceSubmissionId,
          selected.employerEvidenceFileName ?? "Phieu-danh-gia-doanh-nghiep",
        );
      }
    } catch (error) {
      onShowToast?.(getApiErrorMessage(error), "error");
    } finally {
      setIsDownloadingEmployerProof(false);
    }
  };

  const previewEmployerProof = async () => {
    if (!selected?.employerEvidenceSubmissionId || isPreviewingEmployerProof) return;
    setIsPreviewingEmployerProof(true);
    try {
      const fallbackName = selected.employerEvidenceFileName ?? "Phieu-danh-gia-doanh-nghiep";
      const result = selected.employerEvidenceAssetId
        ? await submissionApiService.downloadAsset(
            selected.employerEvidenceSubmissionId,
            selected.employerEvidenceAssetId,
            fallbackName,
            false,
          )
        : await submissionApiService.download(selected.employerEvidenceSubmissionId, fallbackName, false);
      const url = URL.createObjectURL(result.blob);
      setEmployerProofPreview({
        url,
        mimeType: result.filename.toLowerCase().endsWith(".pdf")
          ? "application/pdf"
          : result.blob.type || "image/*",
        fileName: result.filename,
      });
    } catch (error) {
      onShowToast?.(getApiErrorMessage(error), "error");
    } finally {
      setIsPreviewingEmployerProof(false);
    }
  };

  const closeEmployerProofPreview = () => {
    setEmployerProofPreview(null);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-3 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel className="rounded-xl border border-slate-200/90 shadow-2xs xl:col-span-3">
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
                  className="min-h-10 w-56 rounded-full border border-slate-300 py-1.5 pl-8 pr-3 text-xs outline-none transition-colors hover:border-slate-400 focus:border-[#026aa7] focus:ring-2 focus:ring-[#026aa7]/20"
                />
              </div>
              <button
                type="button"
                onClick={() => void load()}
                disabled={isLoading}
                aria-label="Làm mới danh sách sinh viên"
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-300 px-3 text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {isLoading && students.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="space-y-3 py-10 text-center text-xs text-rose-700" role="alert">
              <p>Không thể tải danh sách sinh viên: {error}</p>
              <button type="button" onClick={() => void load()} className="min-h-9 rounded-full bg-[#026aa7] px-4 font-semibold text-white hover:bg-[#025a8e]">Thử lại</button>
            </div>
          ) : !semesterId ? (
            <div className="space-y-2 py-10 text-center text-xs text-slate-500">
              <CalendarDays className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
              <p className="font-semibold text-slate-700">Chưa chọn học kỳ</p>
              <p>Chọn học kỳ trên banner để tải danh sách sinh viên và điểm thực tập.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="space-y-2 py-10 text-center text-xs text-slate-500">
              <UserCheck className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
              <p className="font-semibold text-slate-700">Không có sinh viên phù hợp</p>
              <p>Thử điều chỉnh từ khóa tìm kiếm.</p>
            </div>
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
                        selectedId === student.studentId ? "bg-[#026aa7]/5" : ""
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
                        <span className={`font-semibold ${student.absentCount >= 2 ? "text-rose-600" : "text-slate-600"}`}>
                          {student.absentCount}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold">{student.processScore.toFixed(1)}</td>
                      <td className="px-3 py-2.5 text-center">
                        {student.isEligible ? (
                          <span className="inline-flex rounded-full bg-[#7bc043]/10 px-2 py-0.5 text-xs font-medium text-[#446d20]">
                            Đủ
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
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

        <Panel className="rounded-xl border border-slate-200/90 shadow-2xs xl:col-span-2">
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
                  {openWeeks.map((w) => {
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

              {/* Cụm 1 — đánh giá chất lượng theo từng báo cáo tuần (nhận từ duyệt báo cáo tuần, không cho chọn lại) */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Chất lượng từng báo cáo (nhận từ duyệt báo cáo)
                  </p>
                  {openWeeklyQuality.length > 0 && (
                    <span className="text-xs font-bold text-[#025a8e] bg-[#026aa7]/5 px-2 py-0.5 rounded border border-[#026aa7]/20">
                      TB: {(openWeeklyQuality.reduce((sum, score) => sum + score, 0) / openWeeklyQuality.length).toFixed(1)} / 5.0đ
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {openWeeks.map((week) => {
                    const score = weeklyQuality[week.weekNumber];
                    const level = score != null ? GR_QUALITY_RUBRIC_LEVELS.find((l) => l.value === score) : null;

                    return (
                      <div
                        key={week.weekNumber}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">Tuần {week.weekNumber}</span>
                          <span className="text-[11px] text-slate-400">
                            ({WEEK_STATUS_BADGE[week.status]?.label ?? "Chưa nộp"})
                          </span>
                        </div>
                        {score != null && level ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#7bc043]/10 px-2.5 py-1 text-xs font-semibold text-[#446d20] border border-[#7bc043]/30">
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#7bc043]" />
                            {score.toFixed(1)}đ — {level.label}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                            <Hourglass className="h-3 w-3 text-slate-400" />
                            Chưa đánh giá khi duyệt
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {openWeeks.length === 0 && (
                    <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                      Chưa mở deadline tuần nào trong học kỳ này.
                    </p>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1">
                  <Lock className="h-3 w-3 text-slate-400 shrink-0" />
                  Kết quả xếp loại được tự động đồng bộ từ mục Duyệt báo cáo (/lecturer/reports).
                </p>
              </div>

              {/* Cụm 2 — Thưởng sáng tạo */}
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Có sản phẩm sáng tạo
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#446d20]">+1.0đ</span>
                  <input
                    type="checkbox"
                    checked={creative}
                    onChange={(e) => setCreative(e.target.checked)}
                    className="h-4 w-4 accent-[#7bc043]"
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
                    <span className={`font-semibold ${selected.finalReportSubmitted ? "text-[#446d20]" : "text-rose-600"}`}>
                      {selected.finalReportSubmitted ? "Đã nộp" : "Chưa"}
                    </span>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between rounded-xl bg-[#026aa7] px-3 py-2 text-white">
                  <span className="text-xs font-medium">Điểm QT tạm tính</span>
                  <span className="text-lg font-bold">{preview?.qt.toFixed(1) ?? selected.processScore.toFixed(1)}</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
                  QT = MIN(10, Nộp đủ(2) + Đúng hạn(2) + Chất lượng(5) + Sáng tạo(+1)). Số buổi vắng ≥ 2 ảnh hưởng điều kiện dự thi, không trừ điểm QT.
                </p>
              </div>

              {/* Điểm thi vấn đáp + preview TB */}
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2.5">
                  <div>
                    <p className="text-xs font-semibold text-sky-900">Đánh giá doanh nghiệp</p>
                    <p className="mt-0.5 text-sm font-bold text-sky-800">
                      {selected.employerScore != null ? `${selected.employerScore.toFixed(1)} / 10` : "Chưa nộp điểm"}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium text-sky-700">Tham khảo, không tính vào điểm tổng kết</p>
                  </div>
                  {selected.employerEvidenceSubmissionId ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {/\.(pdf|png|jpe?g|gif|webp)$/i.test(selected.employerEvidenceFileName ?? "") && (
                        <button
                          type="button"
                          onClick={() => void previewEmployerProof()}
                          disabled={isPreviewingEmployerProof}
                          className="il-btn il-btn-secondary inline-flex items-center gap-1.5 text-xs disabled:opacity-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {isPreviewingEmployerProof ? "Đang mở…" : "Xem trước"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void downloadEmployerProof()}
                        disabled={isDownloadingEmployerProof}
                        className="il-btn il-btn-secondary inline-flex items-center gap-1.5 text-xs disabled:opacity-50"
                        title={selected.employerEvidenceFileName ?? "Tải phiếu minh chứng"}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {isDownloadingEmployerProof ? "Đang tải…" : selected.employerEvidenceFileName ?? "Tải phiếu minh chứng"}
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500">Chưa có phiếu minh chứng</span>
                  )}
                </div>
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
                  className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#026aa7] focus:ring-2 focus:ring-[#026aa7]/20 ${
                    !preview?.eligible ? "cursor-not-allowed bg-slate-100 text-slate-400" : ""
                  }`}
                />
                {preview && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-[#026aa7]/5 px-3 py-2 ring-1 ring-[#026aa7]/15">
                      <p className="text-[11px] text-[#025a8e]">Điểm TB (tạm tính)</p>
                      <p className="text-lg font-bold text-[#026aa7]">
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
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#026aa7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Lưu điểm
              </button>
            </div>
          )}
        </Panel>
      </div>
      {employerProofPreview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Xem trước minh chứng doanh nghiệp"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeEmployerProofPreview(); }}
        >
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <p className="truncate text-sm font-semibold text-slate-900">{employerProofPreview.fileName}</p>
              <button
                type="button"
                onClick={closeEmployerProofPreview}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Đóng xem trước"
                title="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3">
              {employerProofPreview.mimeType === "application/pdf" ? (
                <iframe title={employerProofPreview.fileName} src={employerProofPreview.url} className="h-[75vh] w-full border-0 bg-white" />
              ) : (
                <img src={employerProofPreview.url} alt={employerProofPreview.fileName} className="mx-auto max-h-[75vh] max-w-full object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tab 3: Bảng tổng hợp + Export Excel
// ────────────────────────────────────────────────────────────────────────────

const WEEK_CELL_STYLE: Record<GradingWeekStatus["status"], string> = {
  on_time: "bg-[#7bc043]/10 text-[#446d20] font-medium",
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
  const { activeSemesterId, selectedSemester } = useSemester();
  const semesterId = selectedSemester?.id && selectedSemester.id !== "all"
    ? selectedSemester.id
    : activeSemesterId;

  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "finalized" | "pending">("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [oralDrafts, setOralDrafts] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  // Lịch tuần của kỳ (từ API summary) — nguồn cho header cột T1..TN đúng số tuần
  const [data, setData] = useState<GradingSummaryResponse | null>(null);

  const load = useCallback(async () => {
    if (!semesterId) {
      setData(null);
      setStudents([]);
      setOralDrafts({});
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setData(null);
    setStudents([]);
    setOralDrafts({});
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
        finalReportSubmitted: s.finalReportSubmitted,
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
    return students.filter((s) => {
      const matchesQuery = !q || [
        s.fullName,
        s.studentCode,
        s.className,
        s.companyName,
      ].some((value) => value?.toLowerCase().includes(q));
      const isFinalized = s.averageScore != null;
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "finalized" && isFinalized)
        || (statusFilter === "pending" && !isFinalized);
      return matchesQuery && matchesStatus;
    });
  }, [students, search, statusFilter]);

  useEffect(() => {
    setPageIndex(0);
  }, [search, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const pagedStudents = useMemo(
    () => filtered.slice(safePageIndex * pageSize, safePageIndex * pageSize + pageSize),
    [filtered, safePageIndex, pageSize],
  );

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

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!semesterId && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white p-5 text-xs text-slate-600 shadow-2xs">
          <CalendarDays className="h-5 w-5 shrink-0 text-[#026aa7]" aria-hidden="true" />
          Chọn học kỳ trên banner để xem bảng tổng hợp điểm.
        </div>
      )}
      <Panel padding="none" className="overflow-hidden rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Table2 className="h-4 w-4" /> Tổng hợp điểm thực tập
            </h3>
            <p className="mt-1 text-[11px] text-slate-500">
              Trên: bài nộp (✓ đúng hạn, Trễ, X chưa nộp) · Dưới: điểm danh (✓ có mặt, V vắng, – không có buổi)
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-0 sm:w-52">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên, MSSV, lớp…"
                aria-label="Tìm sinh viên"
                className="min-h-9 w-full rounded-full border border-slate-300 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus:ring-2 focus:ring-[#026aa7]/20"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              aria-label="Lọc theo trạng thái điểm"
              className="min-h-9 rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus:ring-2 focus:ring-[#026aa7]/20"
            >
              <option value="all">Mọi trạng thái</option>
              <option value="finalized">Đã chốt điểm</option>
              <option value="pending">Chưa hoàn tất</option>
            </select>
            <button
              type="button"
              onClick={() => void load()}
              disabled={isLoading}
              aria-label="Làm mới bảng điểm"
              title="Làm mới"
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-slate-300 px-3 text-xs text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={exportExcel}
              disabled={isExporting || !semesterId || students.length === 0}
              className="il-btn il-btn-primary justify-center disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Bảng điểm Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2.5 text-center">STT</th>
                <th className="px-2 py-2.5">Họ tên</th>
                <th className="px-2 py-2.5 text-center">Lớp</th>
                <th className="px-2 py-2.5 text-center">Điểm QT</th>
                <th className="px-2 py-2.5 text-center">Điểm thi</th>
                <th className="px-2 py-2.5 text-center">Điểm TB</th>
                <th className="px-2 py-2.5 text-center">Xếp loại</th>
                {schedule.map((week) => (
                  <th key={week.weekNumber} className="px-1.5 py-2.5 text-center">T{week.weekNumber}</th>
                ))}
                <th className="px-2 py-2.5 text-center">Nộp BC</th>
                <th className="px-2 py-2.5 text-center">Vắng</th>
                <th className="px-2 py-2.5 text-center">Tổng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && students.length === 0 ? (
                <tr><td colSpan={10 + schedule.length} className="px-4 py-10 text-center text-slate-500">Đang tải bảng điểm…</td></tr>
              ) : error ? (
              <tr><td colSpan={10 + schedule.length} className="px-4 py-10 text-center text-rose-700">Không thể tải bảng điểm: {error}</td></tr>
              ) : !semesterId ? (
              <tr><td colSpan={10 + schedule.length} className="px-4 py-10 text-center text-slate-500">Chưa chọn học kỳ.</td></tr>
              ) : filtered.length === 0 ? (
              <tr><td colSpan={10 + schedule.length} className="px-4 py-10 text-center text-slate-500">Không có sinh viên phù hợp.</td></tr>
              ) : (
                pagedStudents.map((s, idx) => {
                  const preview = rowPreview[s.studentId];
                  const isSaving = savingIds.has(s.studentId);
                  return (
                    <tr key={s.studentId} className={s.isEligible ? "hover:bg-slate-50" : "bg-rose-50/40 hover:bg-rose-50/70"}>
                      <td className="px-2 py-2.5 text-center text-slate-500">{safePageIndex * pageSize + idx + 1}</td>
                      <td className="px-2 py-2.5">
                        <p className="font-semibold text-slate-900">{s.fullName}</p>
                        <p className="text-[11px] text-slate-400">{s.studentCode}</p>
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
                          className={`w-16 rounded-md border border-slate-200 px-1.5 py-1 text-center text-xs outline-none focus:border-[#026aa7] focus:ring-2 focus:ring-[#026aa7]/20 ${
                            !s.isEligible ? "cursor-not-allowed bg-slate-100 text-slate-400" : ""
                          }`}
                        />
                        {isSaving && <Loader2 className="mx-auto mt-0.5 h-3 w-3 animate-spin text-[#026aa7]" />}
                      </td>
                      <td className="px-2 py-2.5 text-center font-bold text-[#026aa7]">
                        {preview?.average != null ? preview.average.toFixed(1) : "—"}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span
                          className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold ${getClassificationTone(
                            preview?.classification ?? ""
                          )}`}
                        >
                          {preview?.classification || "—"}
                        </span>
                      </td>
                      {schedule.map((weekColumn) => {
                        const w = s.weeks.find((week) => week.weekNumber === weekColumn.weekNumber);
                        const attendanceStatus = w?.attendanceStatus ?? "no_session";
                        const attendanceTone = attendanceStatus === "present"
                          ? "bg-[#7bc043]/10 text-[#446d20]"
                          : attendanceStatus === "absent"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-50 text-slate-400";
                        return (
                        <td key={weekColumn.weekNumber} className="px-1.5 py-2 text-center">
                          <span
                            title={`Bài nộp: ${w?.status === "on_time" ? "Đúng hạn" : w?.status === "late" ? "Trễ" : w?.status === "missing" ? "Chưa nộp" : "Chưa đến hạn"} · Điểm danh: ${attendanceStatus === "present" ? "Có mặt" : attendanceStatus === "absent" ? "Vắng" : "Không có buổi"}`}
                            className="mx-auto flex w-8 flex-col gap-0.5"
                          >
                            <span className={`inline-flex min-h-5 items-center justify-center rounded px-1 text-[10px] ${w ? WEEK_CELL_STYLE[w.status] : "bg-slate-50 text-slate-400"}`}>
                              {w ? weekCellLabel(w) : "–"}
                            </span>
                            <span className={`inline-flex min-h-4 items-center justify-center rounded px-1 text-[10px] font-semibold ${attendanceTone}`}>
                              {attendanceCellLabel(attendanceStatus === "no_session" ? null : attendanceStatus)}
                            </span>
                          </span>
                        </td>
                        );
                      })}
                      <td className="px-2 py-2.5 text-center">
                        <span
                          className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            s.finalReportSubmitted
                              ? "bg-[#7bc043]/10 text-[#446d20]"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {s.finalReportSubmitted ? "Đã nộp" : "X"}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span className={`font-semibold ${s.absentCount >= 2 ? "text-rose-600" : "text-slate-600"}`}>
                          {s.absentCount}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span
                          title={s.isEligible ? "Đủ điều kiện dự thi" : s.ineligibleReasons.join("; ")}
                          className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${s.isEligible ? "bg-[#7bc043]/10 text-[#446d20]" : "bg-rose-600 text-white"}`}
                        >
                          {s.isEligible ? "Đủ ĐK" : "Không đủ ĐK"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-100 px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="text-slate-500">
            Hiển thị {filtered.length ? safePageIndex * pageSize + 1 : 0}–{Math.min((safePageIndex + 1) * pageSize, filtered.length)} / {filtered.length} sinh viên
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-slate-500">
              Số dòng
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-slate-800"
              >
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => setPageIndex((page) => Math.max(0, page - 1))}
              disabled={safePageIndex === 0}
              className="rounded bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200 disabled:opacity-40"
              aria-label="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-12 text-center font-semibold text-slate-700">{safePageIndex + 1} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setPageIndex((page) => Math.min(totalPages - 1, page + 1))}
              disabled={safePageIndex >= totalPages - 1}
              className="rounded bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200 disabled:opacity-40"
              aria-label="Trang sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

type SemesterComparisonRow = {
  semester: LecturerSemesterOptionDto;
  studentCount: number;
  companyCount: number;
  averageScore: number | null;
  eligibleCount: number;
  eligibleRate: number | null;
  onTimeRate: number | null;
  error?: string;
};

function SemesterComparisonTab() {
  const { activeSemesterId } = useSemester();
  const [semesters, setSemesters] = useState<LecturerSemesterOptionDto[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rows, setRows] = useState<SemesterComparisonRow[]>([]);
  const [isLoadingSemesters, setIsLoadingSemesters] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void lecturerInternshipsService.getAssignedSemesters()
      .then((items) => {
        if (cancelled) return;
        setSemesters(items);
        const activeIndex = items.findIndex((item) => item.id === activeSemesterId);
        const ordered = activeIndex < 0
          ? items
          : [items[activeIndex], ...items.filter((item) => item.id !== activeSemesterId)];
        setSelectedIds(ordered.slice(0, 3).map((item) => item.id));
        setLoadError(null);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(getApiErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSemesters(false);
      });
    return () => { cancelled = true; };
  }, [activeSemesterId]);

  useEffect(() => {
    let cancelled = false;
    const selected = semesters.filter((semester) => selectedIds.includes(semester.id));
    if (selected.length === 0) {
      setRows([]);
      setIsLoadingResults(false);
      return;
    }

    setIsLoadingResults(true);
    void Promise.all(selected.map(async (semester): Promise<SemesterComparisonRow> => {
      try {
        const summary = await internshipGradingService.getSummary(semester.id);
        const graded = summary.students
          .map((student) => student.averageScore)
          .filter((score): score is number => score != null && Number.isFinite(score));
        const closedWeeks = summary.students.flatMap((student) => student.weeks)
          .filter((week) => week.status !== "pending");
        const onTimeCount = closedWeeks.filter((week) => week.status === "on_time").length;
        const eligibleCount = summary.students.filter((student) => student.isEligible).length;

        return {
          semester,
          studentCount: summary.students.length,
          companyCount: new Set(summary.students.map((student) => student.companyName).filter(Boolean)).size,
          averageScore: graded.length > 0 ? graded.reduce((total, score) => total + score, 0) / graded.length : null,
          eligibleCount,
          eligibleRate: summary.students.length > 0 ? eligibleCount * 100 / summary.students.length : null,
          onTimeRate: closedWeeks.length > 0 ? onTimeCount * 100 / closedWeeks.length : null,
        };
      } catch (error) {
        return {
          semester,
          studentCount: 0,
          companyCount: 0,
          averageScore: null,
          eligibleCount: 0,
          eligibleRate: null,
          onTimeRate: null,
          error: getApiErrorMessage(error),
        };
      }
    })).then((results) => {
      if (!cancelled) setRows(results);
    }).finally(() => {
      if (!cancelled) setIsLoadingResults(false);
    });

    return () => { cancelled = true; };
  }, [semesters, selectedIds]);

  const toggleSemester = (semesterId: string) => {
    setSelectedIds((current) => {
      if (current.includes(semesterId)) return current.filter((id) => id !== semesterId);
      return current.length < 5 ? [...current, semesterId] : current;
    });
  };

  const formatRate = (value: number | null) => value == null ? "—" : `${value.toFixed(1)}%`;
  const formatAverage = (value: number | null) => value == null ? "—" : value.toFixed(2);

  return (
    <div className="space-y-4">
      <Panel className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <BarChart3 className="h-4 w-4 text-[#026aa7]" /> So sánh kết quả theo kỳ
        </h2>
        {loadError ? (
          <p role="alert" className="text-xs text-rose-700">{loadError}</p>
        ) : isLoadingSemesters ? (
          <p className="text-xs text-slate-500">Đang tải danh sách kỳ...</p>
        ) : semesters.length === 0 ? (
          <p className="text-xs text-slate-500">Chưa có kỳ nào được phân công.</p>
        ) : (
          <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <legend className="sr-only">Chọn kỳ thực tập để so sánh</legend>
            {semesters.map((semester) => {
              const checked = selectedIds.includes(semester.id);
              return (
                <label key={semester.id} className={`flex items-start gap-2 rounded-xl border p-3 text-xs transition-colors ${checked ? "border-[#026aa7]/40 bg-[#026aa7]/5" : "border-slate-200 bg-white"}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && selectedIds.length >= 5}
                    onChange={() => toggleSemester(semester.id)}
                    className="mt-0.5 rounded border-slate-300 accent-[#026aa7]"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-800">{semester.name}</span>
                    <span className="text-slate-500">{semester.term} · {semester.academicYear}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}
      </Panel>

      {selectedIds.length < 2 && !isLoadingSemesters && !loadError ? (
        <Panel className="text-center text-xs text-slate-500">Chọn ít nhất hai kỳ để đối chiếu.</Panel>
      ) : (
        <Panel padding="none" className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">Kỳ thực tập</th>
                <th className="px-4 py-3 font-bold text-right">Sinh viên</th>
                <th className="px-4 py-3 font-bold text-right">Doanh nghiệp</th>
                <th className="px-4 py-3 font-bold text-right">Điểm TB</th>
                <th className="px-4 py-3 font-bold text-right">Đủ điều kiện</th>
                <th className="px-4 py-3 font-bold text-right">Nộp đúng hạn</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.semester.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{row.semester.name}</p>
                    <p className="text-[11px] text-slate-500">{row.semester.term} · {row.semester.academicYear}</p>
                    {row.error && <p role="alert" className="mt-1 text-[11px] text-rose-700">{row.error}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">{row.error ? "—" : row.studentCount}</td>
                  <td className="px-4 py-3 text-right">{row.error ? "—" : row.companyCount}</td>
                  <td className="px-4 py-3 text-right font-semibold">{row.error ? "—" : formatAverage(row.averageScore)}</td>
                  <td className="px-4 py-3 text-right">{row.error ? "—" : `${row.eligibleCount} · ${formatRate(row.eligibleRate)}`}</td>
                  <td className="px-4 py-3 text-right">{row.error ? "—" : formatRate(row.onTimeRate)}</td>
                </tr>
              ))}
              {isLoadingResults && rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Đang tải kết quả...</td></tr>
              )}
              {!isLoadingResults && rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Chọn kỳ để xem kết quả.</td></tr>
              )}
            </tbody>
          </table>
        </Panel>
      )}
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
  const [tab, setTab] = useState<"grading" | "summary" | "comparison">(
    initialTab === "summary" ? "summary" : initialTab === "comparison" ? "comparison" : "grading"
  );

  const tabs: { id: typeof tab; label: string; icon: typeof ClipboardCheck }[] = [
    { id: "grading", label: "Chấm điểm", icon: ClipboardCheck },
    { id: "summary", label: "Tổng hợp & Xuất file", icon: Table2 },
    { id: "comparison", label: "So sánh kỳ", icon: BarChart3 },
  ];

  return (
    <div className="mx-auto max-w-[1300px] animate-in fade-in duration-200 space-y-4 pb-12 font-sans">
      <LecturerSubPageHeader
        icon={ClipboardCheck}
        title="Đánh giá thực tập"
        subtitle="Đánh giá chất lượng, nhập điểm thi và tổng hợp kết quả theo quy định hiện hành."
      />

      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200/90 bg-white p-1 shadow-2xs" role="tablist" aria-label="Các chức năng đánh giá thực tập">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 ${
                tab === t.id
                  ? "bg-[#026aa7] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "grading" && <GradingTab onShowToast={onShowToast} />}
      {tab === "summary" && <SummaryTab onShowToast={onShowToast} />}
      {tab === "comparison" && <SemesterComparisonTab />}
    </div>
  );
};
