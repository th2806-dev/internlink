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
  Target,
  TrendingUp,
  ShieldCheck,
  MessageSquare,
  Clock,
} from "lucide-react";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";
import { useSemester } from "../../../contexts/SemesterContext";
import { CompanyAvatar } from "../../../components/common/CompanyAvatar";
import { StudentSubPageHeader } from "../components/StudentSubPageHeader";
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

function initials(name?: string | null) {
  if (!name) return "?";
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

export const InternshipView = ({
  onShowToast,
  onNavigate,
}: {
  onShowToast: (msg: string, type?: "success" | "error" | "info") => void;
  onNavigate?: (tab: string) => void;
}) => {
  const { profile, internship, internshipId, refresh } = useStudentPortal();
  const { selectedSemester } = useSemester();
  const dynamicWeeks = selectedSemester?.totalWeeks || INTERNSHIP_WEEKS;
  const currentSemesterId = internship?.semesterId || selectedSemester?.id;

  const [isRefreshing, setIsRefreshing] = useState(false);
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
      profile.company !== "Chưa có doanh nghiệp" &&
      profile.company !== "—",
  );

  useEffect(() => {
    if (!internshipId) return;
    let cancelled = false;
    (async () => {
      try {
        const [reports, fetchedSchedules] = await Promise.all([
          weeklyReportService.getMine().catch(() => []),
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
            // Tiến độ thật: tuần hoàn thành khi báo cáo được duyệt
            progress: r.status === "Approved" ? 100 : 0,
            deliverable: r.title,
            submittedAt: r.submittedAt,
          })),
        );
      } catch {
        // Fallback gracefully
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [internshipId, currentSemesterId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
      if (internshipId) {
        const [reports, fetchedSchedules] = await Promise.all([
          weeklyReportService.getMine().catch(() => []),
          currentSemesterId
            ? semesterReportScheduleService.getSchedules(currentSemesterId).catch(() => [] as SemesterReportScheduleDto[])
            : Promise.resolve([] as SemesterReportScheduleDto[]),
        ]);
        setSchedules(fetchedSchedules);
        setApiWeeklyPlans(
          reports.map((r) => ({
            week: r.weekNumber,
            title: r.title,
            goal: r.content.slice(0, 120) + (r.content.length > 120 ? "…" : ""),
            status: mapWeeklyReportStatusToUi(r.status),
            progress: r.status === "Approved" ? 100 : 0,
            deliverable: r.title,
            submittedAt: r.submittedAt,
          })),
        );
      }
      onShowToast("Đã làm mới dữ liệu thực tập thành công", "success");
    } finally {
      setIsRefreshing(false);
    }
  };

  // d2: Danh sách Năm học & Học kỳ
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
    else onShowToast(`Chuyển hướng: ${tab}`, "info");
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 animate-in fade-in duration-200 font-sans pb-12">
      {/* 1. TOP CARD (Chuẩn banner xanh #026aa7 + thông tin thực tế) */}
      <div className="space-y-3">
        <StudentSubPageHeader
          icon={Briefcase}
          title="Kỳ thực tập của tôi"
          subtitle="Theo dõi thông tin, tiến độ và lịch thực tập của bạn."
          semesterName={selectedSemester?.name}
          onRefresh={() => void handleRefresh()}
          isRefreshing={isRefreshing}
        />


      </div>

      {/* 2. TRẠNG THÁI CHƯA PHÂN CÔNG (Nếu chưa có doanh nghiệp) */}
      {!isAssigned ? (
        <div className="overflow-hidden rounded-xl border border-amber-200/90 bg-white shadow-2xs p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Building2 className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-slate-900">
              Bạn chưa có đơn vị tiếp nhận thực tập
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Hệ thống chưa ghi nhận doanh nghiệp tiếp nhận thực tập cho hồ sơ của bạn trong đợt này. Vui lòng liên hệ Giảng viên hướng dẫn hoặc xem hướng dẫn đăng ký.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setActiveContactModal("lecturer")}
              className="px-4 py-2 bg-[#026aa7] hover:bg-[#025a8f] text-white font-bold text-xs rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Mail className="w-4 h-4" /> Liên hệ Giảng viên
            </button>
            <button
              type="button"
              onClick={() => goTo("templates")}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-slate-500" /> Xem Biểu mẫu & Quy chế
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 3. KHỐI THÔNG TIN DOANH NGHIỆP & ĐỘI NGŨ HƯỚNG DẪN */}
          <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
            {/* Header thanh lịch */}
            <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#026aa7]" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Đơn vị tiếp nhận & Đội ngũ hướng dẫn
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {profile.statusBadge}
                </span>
                <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                  • Vị trí: <strong className="text-slate-800">{profile.position}</strong>
                </span>
              </div>
            </div>

            {/* Nội dung chi tiết doanh nghiệp */}
            <div className="p-4 sm:p-5 space-y-4 text-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <CompanyAvatar name={profile.company} size={48} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900 truncate">
                        {profile.company}
                      </h4>
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 shrink-0">
                        {internship?.company?.industry || "Doanh nghiệp đối tác"}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#026aa7] mt-0.5">
                      Vị trí thực tập: {profile.position}
                    </p>
                  </div>
                </div>

                {(profile.supervisorEmail !== "—" || profile.supervisorPhone !== "—") && (
                  <div className="flex flex-wrap items-center gap-2">
                    {profile.supervisorEmail !== "—" && (
                      <a
                        href={`mailto:${profile.supervisorEmail}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold rounded-lg border border-slate-200 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5 text-blue-600" /> {profile.supervisorEmail}
                      </a>
                    )}
                    {profile.supervisorPhone !== "—" && (
                      <a
                        href={`tel:${profile.supervisorPhone.replace(/\s/g, "")}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-semibold rounded-lg border border-slate-200 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" /> {profile.supervisorPhone}
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Lưới 3 thông số: Địa điểm, Thời gian, Quy chế */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/70 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> Địa điểm làm việc
                  </span>
                  <p className="font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                    {workLocation}
                  </p>
                </div>

                <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/70 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Thời gian thực tập
                  </span>
                  <p className="font-semibold text-slate-800">{internshipRange}</p>
                  <p className="text-[10.5px] text-slate-500 font-medium">
                    Kế hoạch {dynamicWeeks} tuần theo quy định
                  </p>
                </div>

                <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/70 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Hình thức & Thời gian
                  </span>
                  <p className="font-semibold text-slate-800">
                    {internship?.notes?.trim() || "Theo lịch làm việc của Doanh nghiệp"}
                  </p>
                  <p className="text-[10.5px] text-slate-500 font-medium">
                    Liên hệ Mentor nếu có lịch thay đổi
                  </p>
                </div>
              </div>

              {/* Đội ngũ hướng dẫn: Giảng viên & Mentor */}
              <div className="pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Giảng viên hướng dẫn */}
                  <div className="p-3.5 rounded-lg border border-slate-200/90 bg-white flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#026aa7] text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {initials(profile.lecturerName)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-[#026aa7] uppercase tracking-wide">
                          Giảng viên hướng dẫn
                        </span>
                        <h5 className="font-bold text-slate-900 truncate text-xs sm:text-sm">
                          {profile.lecturerName && profile.lecturerName !== "—" ? profile.lecturerName : "TS. Nguyễn Văn An"}
                        </h5>
                        <p className="text-[11px] text-slate-500 truncate">
                          {profile.lecturerEmail && profile.lecturerEmail !== "—" ? profile.lecturerEmail : "gvhd@khoacntt.edu.vn"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveContactModal("lecturer")}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#026aa7] font-semibold text-xs rounded-lg border border-blue-200/80 shrink-0 transition-colors cursor-pointer"
                    >
                      Liên hệ
                    </button>
                  </div>

                  {/* Mentor Doanh nghiệp */}
                  <div className="p-3.5 rounded-lg border border-slate-200/90 bg-white flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {initials(profile.supervisorName)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                          Mentor Doanh nghiệp
                        </span>
                        <h5 className="font-bold text-slate-900 truncate text-xs sm:text-sm">
                          {profile.supervisorName && profile.supervisorName !== "—" ? profile.supervisorName : "Quản lý / Người hướng dẫn"}
                        </h5>
                        <p className="text-[11px] text-slate-500 truncate">
                          {profile.supervisorEmail && profile.supervisorEmail !== "—" ? profile.supervisorEmail : "mentor@doanhnghiep.vn"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveContactModal("mentor")}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-lg border border-emerald-200/80 shrink-0 transition-colors cursor-pointer"
                    >
                      Liên hệ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. KHỐI LỘ TRÌNH & TIẾN ĐỘ THỰC TẬP */}
          <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#026aa7]" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Lộ trình & Tiến độ thực tập
                </h3>
              </div>
              <span className="text-xs font-bold text-[#026aa7] bg-blue-50 px-3 py-1 rounded-full border border-blue-200/80">
                Tuần {progressSummary.current} / {progressSummary.total} ({progressSummary.pct}%)
              </span>
            </div>

            {/* Thanh tiến độ chính */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                <div
                  className="bg-[#026aa7] h-full rounded-full transition-all duration-700"
                  style={{ width: `${progressSummary.pct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>Bắt đầu</span>
                <span className="text-[#026aa7] font-bold">
                  Đã hoàn thành {progressSummary.done} / {progressSummary.total} tuần ({progressSummary.pct}%)
                </span>
                <span>Kết thúc</span>
              </div>
            </div>

            {/* Các mốc lộ trình (Desktop + Mobile) */}
            <div className="pt-2">
              <div className="hidden sm:flex items-start justify-between px-2">
                {timelineSteps.map((step, idx, arr) => {
                  const isDone = step.status === "done";
                  const isActive = step.status === "active";
                  const doneCount = timelineSteps.filter((s) => s.status === "done").length;
                  return (
                    <React.Fragment key={step.label}>
                      <div className="flex flex-col items-center min-w-[70px] text-center z-10">
                        <div
                          className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center transition-all ${
                            isDone
                              ? "bg-[#026aa7] text-white shadow-2xs"
                              : isActive
                                ? "bg-[#026aa7] text-white ring-4 ring-blue-100 font-bold"
                                : "bg-white text-slate-400 border border-slate-300"
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="w-4 h-4 text-white" /> : idx + 1}
                        </div>
                        <span
                          className={`text-[11px] font-bold mt-1.5 ${
                            isActive ? "text-[#026aa7]" : isDone ? "text-slate-800" : "text-slate-400"
                          }`}
                        >
                          {step.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{step.date}</span>
                      </div>

                      {idx < arr.length - 1 && (
                        <div className="flex-1 mt-4 h-0.5 bg-slate-200 self-start">
                          <div
                            className={`h-full transition-all duration-300 ${
                              idx < doneCount - 1 ? "bg-[#026aa7]" : "bg-transparent"
                            }`}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Mobile steps */}
              <ol className="space-y-2.5 sm:hidden" aria-label="Các mốc thực tập">
                {timelineSteps.map((step, index) => {
                  const done = step.status === "done";
                  const active = step.status === "active";
                  return (
                    <li key={step.label} className="flex items-center gap-3 text-xs">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          done || active
                            ? "bg-[#026aa7] text-white"
                            : "border border-slate-300 bg-white text-slate-500"
                        }`}
                      >
                        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                      </span>
                      <div className="flex-1 flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className={`font-semibold ${active ? "text-[#026aa7]" : "text-slate-800"}`}>
                          {step.label}
                        </span>
                        <span className="text-[11px] text-slate-400">{step.date}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          {/* 5. KHỐI KẾ HOẠCH TỪNG TUẦN & CỘT MỐC QUAN TRỌNG */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
            {/* Cột chính: Bảng kế hoạch thực tập từng tuần (8 cols) */}
            <div className="lg:col-span-8">
              <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                {/* Header bảng */}
                <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#026aa7]" /> Kế hoạch thực tập chi tiết (Weekly Plan)
                    </h3>
                    <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                      Lộ trình {dynamicWeeks} tuần đã phê duyệt theo tiến độ Khoa & Doanh nghiệp
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goTo("weekly-reports")}
                    className="px-3 py-1.5 bg-[#026aa7] hover:bg-[#025a8f] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5" /> Nộp báo cáo tuần
                  </button>
                </div>

                {/* Danh sách tuần dạng bảng desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold">
                        <th className="p-3 w-16">Tuần</th>
                        <th className="p-3">Mục tiêu & Sản phẩm</th>
                        <th className="p-3 w-32">Trạng thái</th>
                        <th className="p-3 w-28">Tiến độ</th>
                        <th className="p-3 text-right w-20">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {weeklyPlans.map((item) => (
                        <tr key={item.week} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3 font-bold text-[#026aa7]">Tuần {item.week}</td>
                          <td className="p-3">
                            <p className="font-semibold text-slate-800">{item.title}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{item.goal}</p>
                            {item.dueDate && (
                              <p className="text-[10.5px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" /> Hạn nộp: {item.dueDate}
                              </p>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block border ${
                                item.status === "Đã hoàn thành"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : item.status === "Đã nộp" || item.status === "Đã xem"
                                    ? "bg-blue-50 text-blue-800 border-blue-200"
                                    : item.status === "Cần chỉnh sửa"
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : "bg-slate-50 text-slate-600 border-slate-200"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-600">{item.progress}%</span>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    item.progress === 100 ? "bg-emerald-500" : "bg-[#026aa7]"
                                  }`}
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedWeekDetail(item)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-[#026aa7] font-semibold text-[11px] rounded-md transition-colors cursor-pointer"
                            >
                              Xem
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile list */}
                <div className="md:hidden divide-y divide-slate-100 text-xs p-3 space-y-3">
                  {weeklyPlans.map((item) => (
                    <article key={item.week} className="pt-3 first:pt-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-[#026aa7]">Tuần {item.week}</span>
                          <h4 className="font-semibold text-slate-900">{item.title}</h4>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            item.status === "Đã hoàn thành"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : item.status === "Đã nộp" || item.status === "Đã xem"
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : item.status === "Cần chỉnh sửa"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{item.goal}</p>
                      {item.dueDate && (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Hạn nộp: {item.dueDate}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-semibold text-slate-600">Tiến độ: {item.progress}%</span>
                        <button
                          type="button"
                          onClick={() => setSelectedWeekDetail(item)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#026aa7] font-semibold text-[11px] rounded-md"
                        >
                          Chi tiết
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            {/* Cột phụ: Mốc thời gian quan trọng & Thao tác nhanh (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Mốc thời gian quan trọng */}
              <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs p-4 space-y-3">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2 uppercase tracking-wide">
                  <Target className="w-4 h-4 text-[#026aa7]" /> Mốc thời gian quan trọng
                </h3>

                <div className="space-y-2.5 text-xs">
                  {milestones.map((m, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border transition-all ${
                        m.nearest ? "bg-blue-50/70 border-blue-300" : "bg-slate-50/80 border-slate-200/80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <p className={`font-semibold ${m.nearest ? "text-[#026aa7]" : "text-slate-800"}`}>
                          {m.title}
                        </p>
                        <span
                          className={`text-[10px] font-bold shrink-0 ${
                            m.nearest ? "text-[#026aa7]" : "text-slate-500"
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 font-medium mt-1">
                        Hạn chót: <strong className="text-slate-700">{m.date}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Thao tác nhanh */}
              <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs p-4 space-y-3">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5 uppercase tracking-wide">
                  Thao tác nhanh
                </h3>

                <div className="space-y-2 text-xs">
                  <button
                    type="button"
                    onClick={() => goTo("weekly-reports")}
                    className="w-full py-2.5 px-3 bg-[#026aa7] hover:bg-[#025a8f] text-white font-bold rounded-lg shadow-2xs transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Nộp báo cáo tuần
                    </span>
                    <ChevronRight className="w-4 h-4 opacity-80" />
                  </button>

                  <button
                    type="button"
                    onClick={() => goTo("templates")}
                    className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-slate-500" /> Xem biểu mẫu & quy chế
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveContactModal("lecturer")}
                    className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-500" /> Liên hệ Giảng viên
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL 1: LIÊN HỆ GIẢNG VIÊN / MENTOR */}
      {activeContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-xl border border-slate-200 animate-in zoom-in-95">
            <div className="bg-[#026aa7] px-4 py-3 text-white flex items-center justify-between">
              <h4 className="font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {activeContactModal === "lecturer"
                  ? "Thông tin liên hệ Giảng viên"
                  : "Thông tin liên hệ Mentor Doanh nghiệp"}
              </h4>
              <button
                type="button"
                onClick={() => setActiveContactModal(null)}
                className="text-white/80 hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Người nhận</label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="font-bold text-slate-900 text-sm">
                    {activeContactModal === "lecturer"
                      ? profile.lecturerName || "TS. Nguyễn Văn An"
                      : profile.supervisorName || "Mentor Doanh nghiệp"}
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    {activeContactModal === "lecturer"
                      ? "Giảng viên hướng dẫn"
                      : `Mentor tại ${profile.company || "Doanh nghiệp tiếp nhận"}`}
                  </p>
                </div>
              </div>

              {/* Kênh liên hệ trực tiếp */}
              <div className="space-y-2">
                {activeContactModal === "lecturer" ? (
                  <>
                    {profile.lecturerEmail && profile.lecturerEmail !== "—" && (
                      <a
                        href={`mailto:${profile.lecturerEmail}`}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 text-blue-800 transition-colors"
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
                        className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-800 transition-colors"
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
                        className="flex items-center justify-between p-2.5 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 text-blue-800 transition-colors"
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
                        className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-800 transition-colors"
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
                <label className="block font-semibold text-slate-700 mb-1">Chủ đề hỗ trợ</label>
                <select
                  value={contactTopic}
                  onChange={(e) => setContactTopic(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium outline-hidden focus:border-blue-600"
                >
                  <option>Hỏi về Báo cáo thực tập tuần</option>
                  <option>Xin hỗ trợ tài liệu & đề tài</option>
                  <option>Báo cáo tình hình làm việc tại Doanh nghiệp</option>
                  <option>Khác…</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung tin nhắn</label>
                <textarea
                  rows={3}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Nhập nội dung thắc mắc hoặc đề xuất hỗ trợ..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-medium outline-hidden focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveContactModal(null)}
                  className="px-3.5 py-1.5 bg-slate-100 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetEmail =
                      activeContactModal === "lecturer"
                        ? profile.lecturerEmail
                        : profile.supervisorEmail;
                    if (targetEmail && targetEmail !== "—") {
                      window.location.href = `mailto:${targetEmail}?subject=${encodeURIComponent(
                        `[InternLink] ${contactTopic} - SV ${profile.name} (${profile.mssv})`,
                      )}&body=${encodeURIComponent(contactMessage || "")}`;
                    }
                    setActiveContactModal(null);
                    onShowToast(
                      `Đã mở ứng dụng gửi email đến ${
                        activeContactModal === "lecturer" ? "Giảng viên" : "Mentor"
                      }`,
                      "success",
                    );
                  }}
                  className="px-3.5 py-1.5 bg-[#026aa7] hover:bg-[#025a8f] text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Gửi email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CHI TIẾT KẾ HOẠCH TUẦN */}
      {selectedWeekDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-xl border border-slate-200 animate-in zoom-in-95">
            <div className="bg-[#026aa7] px-4 py-3 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                  Chi tiết Tuần {selectedWeekDetail.week}
                </span>
                <h4 className="font-bold text-white text-sm mt-0.5">{selectedWeekDetail.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWeekDetail(null)}
                className="text-white/80 hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 text-xs">
              {selectedWeekDetail.dueDate && (
                <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-[#026aa7] uppercase flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Hạn chót nộp bài
                  </span>
                  <p className="text-slate-900 font-bold">{selectedWeekDetail.dueDate}</p>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Mục tiêu công việc</span>
                <p className="text-slate-800 font-medium leading-relaxed">{selectedWeekDetail.goal}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Sản phẩm / Bài nộp yêu cầu</span>
                <p className="text-[#026aa7] font-semibold">{selectedWeekDetail.deliverable}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Trạng thái</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedWeekDetail.status}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tiến độ</span>
                  <p className="font-bold text-[#026aa7] mt-0.5">{selectedWeekDetail.progress}%</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedWeekDetail(null)}
                  className="px-3.5 py-1.5 bg-slate-100 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWeekDetail(null);
                    goTo("weekly-reports");
                  }}
                  className="px-3.5 py-1.5 bg-[#026aa7] hover:bg-[#025a8f] text-white text-xs font-bold rounded-lg shadow-2xs cursor-pointer"
                >
                  Nộp báo cáo tuần {selectedWeekDetail.week}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { InternshipView as StudentInternshipView };
