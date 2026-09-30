import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  Briefcase,
  ChevronRight,
  FileText,
  Send,
  Users,
  Target,
  TrendingUp,
  ShieldCheck,
  MessageSquare,
  Clock,
} from "lucide-react";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";
import { useSemester } from "../../../contexts/SemesterContext";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { CompanyAvatar } from "../../../components/common/CompanyAvatar";
import { Toolbar } from "../../../components/common/Toolbar";
import { INTERNSHIP_WEEKS } from "../../../config/internship";
import { mapWeeklyReportStatusToUi } from "../../../lib/portalMappers";
import { weeklyReportService } from "../../../services/weeklyReport.service";
import {
  semesterReportScheduleService,
  type SemesterReportScheduleDto,
} from "../../../services/semesterReportSchedule.service";

function formatDateVi(value?: string | null, style: "short" | "full" = "full") {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(
    "vi-VN",
    style === "short"
      ? { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit" }
      : { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" },
  );
}

function formatDateTimeVi(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}


export interface WeeklyPlanItem {
  week: number;
  title: string;
  goal: string;
  status: string;
  progress: number;
  deliverable: string;
  dueDate?: string;
  isSubmissionOpen?: boolean;
}

export const InternshipView = ({ onShowToast, onNavigate }: { onShowToast: (msg: string) => void; onNavigate?: (tab: string) => void }) => {
  const { profile, internship, internshipId } = useStudentPortal();
  const { selectedSemester } = useSemester();
  const dynamicWeeks = selectedSemester?.totalWeeks || INTERNSHIP_WEEKS;
  const currentSemesterId = internship?.semesterId || selectedSemester?.id;

  const [activeContactModal, setActiveContactModal] = useState<"lecturer" | "mentor" | null>(null);
  const [selectedWeekDetail, setSelectedWeekDetail] = useState<WeeklyPlanItem | null>(null);
  const [apiWeeklyPlans, setApiWeeklyPlans] = useState<{
    week: number;
    title: string;
    goal: string;
    status: string;
    progress: number;
    deliverable: string;
    submittedAt?: string | null;
  }[]>([]);
  const [schedules, setSchedules] = useState<SemesterReportScheduleDto[]>([]);
  const [contactTopic, setContactTopic] = useState("Hỏi về Báo cáo thực tập tuần");
  const [contactMessage, setContactMessage] = useState("");

  const isAssigned = Boolean(
    internship?.id &&
      profile.company &&
      profile.company !== "Chưa có doanh nghiệp",
  );

  useEffect(() => {
    if (!internshipId) return;
    let cancelled = false;
    (async () => {
      try {
        const [reports, fetchedSchedules] = await Promise.all([
          weeklyReportService.getMine(),
          currentSemesterId
            ? semesterReportScheduleService.getSchedules(currentSemesterId).catch(() => [] as SemesterReportScheduleDto[])
            : Promise.resolve([] as SemesterReportScheduleDto[]),
        ]);
        if (cancelled) return;
        setSchedules(fetchedSchedules);
        setApiWeeklyPlans(
          reports.map((r) => ({
            week: r.weekNumber,
            title: r.title,
            goal: r.content.slice(0, 120) + (r.content.length > 120 ? "…" : ""),
            status: mapWeeklyReportStatusToUi(r.status),
            // Tiến độ thật: tuần chỉ hoàn thành khi báo cáo đã được duyệt.
            progress: r.status === "Approved" ? 100 : 0,
            deliverable: r.title,
            submittedAt: r.submittedAt,
          })),
        );
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [internshipId, currentSemesterId]);

  const weeklyPlans = useMemo(() => {
    const byWeek = new Map(apiWeeklyPlans.map((p) => [p.week, p]));
    const scheduleByWeek = new Map(schedules.map((s) => [s.weekNumber, s]));

    return Array.from({ length: dynamicWeeks }, (_, i) => {
      const week = i + 1;
      const report = byWeek.get(week);
      const schedule = scheduleByWeek.get(week);

      if (report) {
        return {
          week,
          title: report.title || schedule?.title || `Báo cáo tuần ${week}`,
          goal: report.goal || schedule?.description || "Báo cáo tiến độ tuần",
          status: report.status,
          progress: report.progress,
          deliverable: report.deliverable || schedule?.title || `Tuần ${week}`,
          dueDate: schedule?.dueDate ? formatDateTimeVi(schedule.dueDate) : undefined,
          isSubmissionOpen: schedule?.isSubmissionOpen ?? true,
        };
      }

      return {
        week,
        title: schedule?.title || `Kế hoạch tuần ${week}`,
        goal: schedule?.description || "Chưa có báo cáo tuần",
        status: "Chưa bắt đầu",
        progress: 0,
        deliverable: schedule?.title || "Báo cáo tiến độ tuần",
        dueDate: schedule?.dueDate ? formatDateTimeVi(schedule.dueDate) : undefined,
        isSubmissionOpen: schedule?.isSubmissionOpen ?? false,
      };
    });
  }, [apiWeeklyPlans, schedules, dynamicWeeks]);

  // Tuần báo cáo được yêu cầu = lịch đang bật trong cấu hình (≤ totalWeeks).
  // Cùng quy tắc với backend InternshipProgressCalculator.ResolveRequiredWeekNumbers.
  const requiredWeeks = useMemo(() => {
    const open = Array.from(
      new Set(
        schedules
          .filter(
            (s) =>
              s.isSubmissionOpen && s.weekNumber >= 1 && s.weekNumber <= dynamicWeeks,
          )
          .map((s) => s.weekNumber),
      ),
    ).sort((a, b) => a - b);
    return open.length ? open : Array.from({ length: dynamicWeeks }, (_, i) => i + 1);
  }, [schedules, dynamicWeeks]);

  const progressSummary = useMemo(() => {
    const approvedWeeks = new Set(
      weeklyPlans
        .filter((w) => w.status === "Đã hoàn thành" || w.progress >= 100)
        .map((w) => w.week),
    );
    const total = requiredWeeks.length || dynamicWeeks;
    const done = requiredWeeks.filter((w) => approvedWeeks.has(w)).length;
    const current =
      requiredWeeks.find((w) => !approvedWeeks.has(w)) ??
      requiredWeeks[requiredWeeks.length - 1] ??
      dynamicWeeks;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { current, total, pct, done };
  }, [weeklyPlans, requiredWeeks, dynamicWeeks]);

  const internshipRange = useMemo(() => {
    const start = internship?.startDate;
    const end = internship?.endDate;
    if (start && end) {
      return `${formatDateVi(start)} — ${formatDateVi(end)}`;
    }
    if (start) return `Từ ${formatDateVi(start)}`;
    if (end) return `Đến ${formatDateVi(end)}`;
    return "—";
  }, [internship?.startDate, internship?.endDate]);

  const workLocation = useMemo(() => {
    if (profile.companyAddress && profile.companyAddress !== "—") {
      return profile.companyAddress;
    }
    return (
      internship?.company?.address?.trim() ||
      internship?.company?.industry?.trim() ||
      "—"
    );
  }, [internship, profile.companyAddress]);

  const timelineSteps = useMemo(() => {
    const start = internship?.startDate;
    const end = internship?.endDate;
    const created = internship?.createdAt;
    const assigned = internship?.assignedAt;
    const status = internship?.status ?? "NotStarted";
    const midWeek = Math.ceil(dynamicWeeks / 2);
    const week = progressSummary.current;
    const scheduleByWeek = new Map(schedules.map((s) => [s.weekNumber, s]));
    const midSchedule = scheduleByWeek.get(midWeek);
    const finalSchedule =
      schedules.find((s) => s.isFinalReport || s.weekNumber > dynamicWeeks) ??
      scheduleByWeek.get(dynamicWeeks);

    const steps = [
      {
        label: "Đăng ký",
        date: created ? formatDateVi(created, "short") : "—",
        phase: 0,
      },
      {
        label: "Được duyệt",
        date: assigned ? formatDateVi(assigned, "short") : "—",
        phase: 1,
      },
      { label: "Bắt đầu", date: formatDateVi(start, "short"), phase: 2 },
      {
        label: "Giữa kỳ",
        date: midSchedule?.dueDate
          ? formatDateVi(midSchedule.dueDate, "short")
          : `Tuần ${midWeek}`,
        phase: 3,
      },
      {
        label: "Cuối kỳ",
        date: finalSchedule?.dueDate
          ? formatDateVi(finalSchedule.dueDate, "short")
          : formatDateVi(end, "short"),
        phase: 4,
      },
      {
        label: "Hoàn thành",
        date: formatDateVi(end, "short"),
        phase: 5,
      },
    ];

    const resolveStatus = (phase: number) => {
      if (status === "Completed" || status === "Graded") return "done";
      if (status === "NotStarted") {
        if (phase === 0) return "done";
        if (phase === 1) return "active";
        return "upcoming";
      }
      if (phase <= 1) return "done";
      if (phase === 2) return week >= 1 ? "done" : "active";
      if (phase === 3) {
        if (week >= midWeek + 1) return "done";
        if (week >= midWeek - 1) return "active";
        return "upcoming";
      }
      if (phase === 4) {
        if (week >= dynamicWeeks) return "active";
        return "upcoming";
      }
      return "upcoming";
    };

    return steps.map((s) => ({ ...s, status: resolveStatus(s.phase) }));
  }, [internship, progressSummary, schedules, dynamicWeeks]);

  const milestones = useMemo(() => {
    const start = internship?.startDate;
    const end = internship?.endDate;
    const nextWeek = weeklyPlans.find((w) => w.progress < 100);
    const scheduleByWeek = new Map(schedules.map((s) => [s.weekNumber, s]));
    const items: {
      title: string;
      date: string;
      nearest: boolean;
      status: string;
    }[] = [];

    if (nextWeek) {
      const nextSchedule = scheduleByWeek.get(nextWeek.week);
      const deadlineStr = nextSchedule?.dueDate
        ? formatDateTimeVi(nextSchedule.dueDate)
        : "—";

      items.push({
        title: nextSchedule?.title || `Nộp báo cáo tuần ${nextWeek.week}`,
        date: deadlineStr,
        nearest: true,
        status: nextWeek.status,
      });
    }

    const midWeekNum = Math.ceil(dynamicWeeks / 2);
    const midSchedule = scheduleByWeek.get(midWeekNum);
    const midReport = weeklyPlans.find((w) => w.week === midWeekNum);
    items.push({
      title: "Đánh giá giữa kỳ",
      date: midSchedule?.dueDate
        ? formatDateTimeVi(midSchedule.dueDate)
        : "—",
      nearest: false,
      status:
        midReport && midReport.status !== "Chưa bắt đầu"
          ? midReport.status
          : "Chưa nộp",
    });

    const finalSchedule =
      schedules.find((s) => s.isFinalReport || s.weekNumber > dynamicWeeks) ??
      scheduleByWeek.get(dynamicWeeks);
    items.push({
      title: finalSchedule?.title || "Nộp báo cáo cuối kỳ",
      date: finalSchedule?.dueDate
        ? formatDateTimeVi(finalSchedule.dueDate)
        : end
          ? formatDateVi(end)
          : "—",
      nearest: false,
      status: "Báo cáo PDF chính thức",
    });

    return items;
  }, [weeklyPlans, schedules, internship?.endDate, dynamicWeeks]);

  const goTo = (tab: string) => {
    if (onNavigate) onNavigate(tab);
    else onShowToast(`Chuyển hướng: ${tab}`);
  };

  if (!isAssigned) {
    return (
      <div className="space-y-5 animate-in fade-in duration-200 max-w-3xl mx-auto py-8">
        <PageHeader
          icon={Briefcase}
          title="Kỳ thực tập của tôi"
          subtitle="Thông tin đơn vị tiếp nhận, đội ngũ hướng dẫn và kế hoạch lộ trình thực tập."
          badge="Chưa phân công"
          badgeColor="bg-amber-100 text-amber-800 border-amber-200"
        />

        <Panel className="p-8 text-center space-y-4" padding="none">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-lg flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h2 className="text-lg font-bold text-slate-900">
              Bạn chưa được phân công doanh nghiệp thực tập
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Hệ thống chưa ghi nhận đơn vị tiếp nhận hoặc hồ sơ của bạn đang
              được Khoa xét duyệt.
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => setActiveContactModal("lecturer")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md transition-all flex items-center gap-2"
            >
              <Mail className="w-4 h-4" /> Liên hệ Giảng viên
            </button>
            <button
              onClick={() => goTo("templates")}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-slate-500" /> Xem Biểu mẫu
            </button>
          </div>
        </Panel>
      </div>
    );
  }
  return (
    <div className="space-y-5 animate-in fade-in duration-200 max-w-7xl mx-auto">
      <PageHeader
        icon={Briefcase}
        title="Kỳ thực tập của tôi"
        subtitle="Thông tin đơn vị tiếp nhận, đội ngũ hướng dẫn và kế hoạch lộ trình thực tập."
        badge={profile.mssv}
        badgeColor="bg-blue-100 text-blue-800 border-blue-200"
        actions={[
          {
            label: "Nộp báo cáo tuần",
            icon: FileText,
            onClick: () => goTo("weekly-reports"),
            variant: "primary",
          },
        ]}
      >
        <span className="px-2 py-0.5 font-semibold text-[10px] rounded-md border bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {profile.statusBadge}
        </span>
      </PageHeader>

      <Toolbar
        left={
          <span className="text-xs font-semibold text-slate-600">
            Tiến độ{" "}
            <span className="text-blue-700 font-bold">
              {weeklyPlans.length > 0
                ? `Tuần ${progressSummary.current} / ${progressSummary.total} (${progressSummary.pct}%)`
                : `${profile.overallProgress}%`}
            </span>
          </span>
        }
        right={
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
            {profile.statusBadge}
          </span>
        }
      />

      <Panel className="space-y-6">
        {/* Company Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <CompanyAvatar name={profile.company} size={48} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {profile.company}
                </h2>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
                  {internship?.company?.industry || "Đơn vị thực tập"}
                </span>
              </div>
              <p className="text-xs font-semibold text-blue-600 mt-0.5">
                Vị trí: {profile.position}
                {internship?.company?.industry
                  ? ` • ${internship.company.industry}`
                  : ""}
              </p>
            </div>
          </div>

          {(profile.supervisorEmail !== "—" || profile.supervisorPhone !== "—") && (
            <div className="self-start md:self-auto flex flex-col gap-1.5 text-xs">
              {profile.supervisorEmail !== "—" && (
                <a
                  href={`mailto:${profile.supervisorEmail}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-md border border-slate-200 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-600" />{" "}
                  {profile.supervisorEmail}
                </a>
              )}
              {profile.supervisorPhone !== "—" && (
                <a
                  href={`tel:${profile.supervisorPhone.replace(/\s/g, "")}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-md border border-slate-200 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />{" "}
                  {profile.supervisorPhone}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Essential Internship Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50/80 rounded-md border border-slate-200/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Địa điểm làm
              việc
            </span>
            <p className="font-bold text-slate-800 line-clamp-2">{workLocation}</p>
          </div>

          <div className="p-3.5 bg-slate-50/80 rounded-md border border-slate-200/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Thời gian thực
              tập
            </span>
            <p className="font-bold text-slate-800">{internshipRange}</p>
            <p className="text-[10px] text-slate-500 font-medium">
              {dynamicWeeks} tuần
            </p>
          </div>

          <div className="p-3.5 bg-slate-50/80 rounded-md border border-slate-200/80 space-y-1 sm:col-span-2 lg:col-span-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Hình thức &
              Thời gian
            </span>
            <p className="font-bold text-slate-800">
              {internship?.notes?.trim() || "Theo quy định doanh nghiệp"}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              Liên hệ mentor nếu cần chi tiết lịch làm việc
            </p>
          </div>
        </div>

        {/* Mentors Section */}
        <div className="pt-2">
          <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-600" /> Đội ngũ Hướng dẫn
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs divide-y md:divide-y-0 md:divide-x divide-slate-100 border border-slate-200 rounded-md overflow-hidden">
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {initials(profile.lecturerName)}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-blue-600 uppercase">
                    Giảng viên hướng dẫn
                  </span>
                  <h4 className="font-bold text-slate-900 truncate">
                    {profile.lecturerName}
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveContactModal("lecturer")}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] rounded-md border border-blue-200/60 shrink-0"
              >
                Liên hệ
              </button>
            </div>

            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {initials(profile.supervisorName)}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">
                    Mentor DN
                  </span>
                  <h4 className="font-bold text-slate-900 truncate">
                    {profile.supervisorName}
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveContactModal("mentor")}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] rounded-md border border-emerald-200/60 shrink-0"
              >
                Liên hệ
              </button>
            </div>
          </div>
        </div>
      </Panel>

      {/* 3. STREAMLINED PROGRESS SUMMARY & TIMELINE */}
      <Panel className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Tiến độ Kỳ thực tập
            </h2>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/80">
            Tuần {progressSummary.current} / {progressSummary.total} ({progressSummary.pct}%)
          </span>
        </div>

        {/* Progress Bar & Quick Stats */}
        <div className="space-y-2">
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
            <div
              className="bg-[#1d4ed8] h-full rounded-full transition-all duration-700"
              style={{ width: `${progressSummary.pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
            <span>Bắt đầu</span>
            <span className="text-blue-700 font-bold">
              Tuần {progressSummary.current} ({progressSummary.pct}%)
            </span>
            <span>Kết thúc</span>
          </div>
        </div>

        {/* Timeline Steps Bar */}
        <div className="pt-2 overflow-x-auto">
          <div className="min-w-[550px] flex items-start justify-between px-2 py-1">
            {timelineSteps.map((step, idx, arr) => {
              const isDone = step.status === "done";
              const isActive = step.status === "active";
              const doneCount = timelineSteps.filter((s) => s.status === "done").length;
              return (
                <React.Fragment key={step.label}>
                  <div className="flex flex-col items-center min-w-[70px] text-center z-10">
                    <div
                      className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center transition-all ${isDone ? "bg-blue-600 text-white shadow-2xs" : isActive ? "bg-blue-600 text-white ring-4 ring-blue-100 font-bold" : "bg-white text-slate-400 border border-slate-300"}`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-bold mt-1.5 ${isActive ? "text-blue-700 font-bold" : isDone ? "text-slate-700" : "text-slate-400"}`}
                    >
                      {step.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {step.date}
                    </span>
                  </div>

                  {idx < arr.length - 1 && (
                    <div className="flex-1 mt-4 h-0.5 bg-slate-200 self-start">
                      <div
                        className={`h-full transition-all duration-300 ${idx < doneCount - 1 ? "bg-blue-600" : "bg-transparent"}`}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* MAIN CONTENT GRID: WEEKLY PLAN & SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Weekly Plan Table */}
        <div className="lg:col-span-2 space-y-6">
          <Panel className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" /> Kế hoạch thực
                  tập (Weekly Plan)
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Lộ trình công việc {dynamicWeeks} tuần đã phê duyệt bởi Giảng viên & Doanh
                  nghiệp.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold">
                    <th className="p-3 w-16">Tuần</th>
                    <th className="p-3">Mục tiêu & Sản phẩm</th>
                    <th className="p-3 w-28">Trạng thái</th>
                    <th className="p-3 w-28">Tiến độ</th>
                    <th className="p-3 text-right w-24">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {weeklyPlans.map((item) => (
                    <tr
                      key={item.week}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="p-3 font-bold text-blue-700">
                        Tuần {item.week}
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-slate-800">{item.title}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {item.goal}
                        </p>
                        {item.dueDate && (
                          <p className="text-[10px] text-slate-400 font-medium mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" /> Hạn nộp: {item.dueDate}
                          </p>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold inline-block ${
                            item.status === "Đã hoàn thành"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : item.status === "Đã nộp" || item.status === "Đã xem"
                                ? "bg-blue-50 text-blue-800 border border-blue-200"
                                : item.status === "Cần chỉnh sửa"
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-600">
                            {item.progress}%
                          </span>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.progress === 100 ? "bg-emerald-500" : "bg-blue-600"}`}
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedWeekDetail(item)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 font-bold text-[11px] rounded-lg transition-colors"
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* Right 1 Col: Milestones & Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Key Milestones */}
          <Panel className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" /> Mốc thời gian quan
              trọng
            </h3>

            <div className="space-y-3 text-xs">
              {milestones.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-md border transition-all ${m.nearest ? "bg-blue-50/70 border-blue-300" : "bg-slate-50/80 border-slate-200"}`}
                >
                  <div className="flex items-center justify-between">
                    <p
                      className={`font-bold ${m.nearest ? "text-blue-900" : "text-slate-800"}`}
                    >
                      {m.title}
                    </p>
                    <span
                      className={`text-[10px] font-bold ${m.nearest ? "text-blue-700" : "text-slate-500"}`}
                    >
                      {m.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Hạn chót: {m.date}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          {/* Quick Actions */}
          <Panel className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Thao tác nhanh
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => goTo("weekly-reports")}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Nộp báo cáo tuần
                </span>
                <ChevronRight className="w-4 h-4 opacity-75" />
              </button>

              <button
                onClick={() => goTo("templates")}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-500" /> Xem biểu
                  mẫu & quy chế
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setActiveContactModal("lecturer")}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-500" /> Liên hệ Giảng viên
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </Panel>
        </div>
      </div>

      {/* CONTACT MODAL */}
      {activeContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-md border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                {activeContactModal === "lecturer"
                  ? "Thông tin liên hệ Giảng viên"
                  : "Thông tin liên hệ Mentor Doanh nghiệp"}
              </h3>
              <button
                onClick={() => setActiveContactModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Người nhận
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                  <p className="font-bold text-slate-900 text-sm">
                    {activeContactModal === "lecturer"
                      ? profile.lecturerName
                      : profile.supervisorName}
                  </p>
                  <p className="text-slate-500 font-medium text-[11px] mt-0.5">
                    {activeContactModal === "lecturer"
                      ? "Giảng viên hướng dẫn"
                      : `Mentor tại ${profile.company}`}
                  </p>
                </div>
              </div>

              {/* Direct channels */}
              <div className="space-y-2 pt-1">
                {activeContactModal === "lecturer" ? (
                  <>
                    {profile.lecturerEmail && profile.lecturerEmail !== "—" && (
                      <a
                        href={`mailto:${profile.lecturerEmail}`}
                        className="flex items-center justify-between p-2.5 rounded-md border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 text-blue-800 transition-colors"
                      >
                        <span className="flex items-center gap-2 font-semibold">
                          <Mail className="w-4 h-4 text-blue-600" /> Email
                        </span>
                        <span className="font-bold">{profile.lecturerEmail}</span>
                      </a>
                    )}
                    {profile.lecturerPhone && profile.lecturerPhone !== "—" && (
                      <a
                        href={`tel:${profile.lecturerPhone.replace(/\s/g, "")}`}
                        className="flex items-center justify-between p-2.5 rounded-md border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-800 transition-colors"
                      >
                        <span className="flex items-center gap-2 font-semibold">
                          <Phone className="w-4 h-4 text-emerald-600" /> Điện thoại
                        </span>
                        <span className="font-bold">{profile.lecturerPhone}</span>
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    {profile.supervisorEmail && profile.supervisorEmail !== "—" && (
                      <a
                        href={`mailto:${profile.supervisorEmail}`}
                        className="flex items-center justify-between p-2.5 rounded-md border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 text-blue-800 transition-colors"
                      >
                        <span className="flex items-center gap-2 font-semibold">
                          <Mail className="w-4 h-4 text-blue-600" /> Email
                        </span>
                        <span className="font-bold">{profile.supervisorEmail}</span>
                      </a>
                    )}
                    {profile.supervisorPhone && profile.supervisorPhone !== "—" && (
                      <a
                        href={`tel:${profile.supervisorPhone.replace(/\s/g, "")}`}
                        className="flex items-center justify-between p-2.5 rounded-md border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-800 transition-colors"
                      >
                        <span className="flex items-center gap-2 font-semibold">
                          <Phone className="w-4 h-4 text-emerald-600" /> Điện thoại
                        </span>
                        <span className="font-bold">{profile.supervisorPhone}</span>
                      </a>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chủ đề cần hỗ trợ
                </label>
                <select
                  value={contactTopic}
                  onChange={(e) => setContactTopic(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md font-medium outline-none"
                >
                  <option>Hỏi về Báo cáo thực tập tuần</option>
                  <option>Xin hỗ trợ tài liệu dự án</option>
                  <option>Xin nghỉ phép 1 ngày tại Doanh nghiệp</option>
                  <option>Khác...</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nội dung tin nhắn
                </label>
                <textarea
                  rows={4}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Nhập nội dung thắc mắc hoặc đề xuất hỗ trợ..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-md font-medium outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setActiveContactModal(null)}
                className="px-4 py-2 bg-slate-100 text-xs font-bold rounded-md text-slate-700 hover:bg-slate-200"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  const targetEmail = activeContactModal === "lecturer" ? profile.lecturerEmail : profile.supervisorEmail;
                  if (targetEmail && targetEmail !== "—") {
                    window.location.href = `mailto:${targetEmail}?subject=${encodeURIComponent(`[InternLink] ${contactTopic} - SV ${profile.name} (${profile.mssv})`)}&body=${encodeURIComponent(contactMessage || "")}`;
                  }
                  setActiveContactModal(null);
                  onShowToast(
                    `Đã mở trình gửi email đến ${activeContactModal === "lecturer" ? "Giảng viên" : "Mentor"}`,
                  );
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md shadow-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Gửi email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WEEKLY DETAIL MODAL */}
      {selectedWeekDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4 shadow-md border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                  Chi tiết Tuần {selectedWeekDetail.week}
                </span>
                <h3 className="font-bold text-slate-900 text-base mt-1">
                  {selectedWeekDetail.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedWeekDetail(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {selectedWeekDetail.dueDate && (
                <div className="p-3 bg-blue-50/60 rounded-md border border-blue-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-blue-700 uppercase flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Hạn chót nộp bài
                  </span>
                  <p className="text-slate-900 font-bold">
                    {selectedWeekDetail.dueDate}
                  </p>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Mục tiêu công việc
                </span>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {selectedWeekDetail.goal}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Sản phẩm / Bài nộp yêu cầu
                </span>
                <p className="text-blue-700 font-bold">
                  {selectedWeekDetail.deliverable}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Trạng thái
                  </span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {selectedWeekDetail.status}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Mức độ hoàn thành
                  </span>
                  <p className="font-bold text-blue-600 mt-0.5">
                    {selectedWeekDetail.progress}%
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedWeekDetail(null)}
                className="px-4 py-2 bg-slate-100 text-xs font-bold rounded-md text-slate-700"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setSelectedWeekDetail(null);
                  goTo("weekly-reports");
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md shadow-xs"
              >
                Nộp báo cáo tuần {selectedWeekDetail.week}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { InternshipView as StudentInternshipView };
