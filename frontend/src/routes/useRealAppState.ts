import { useMemo } from "react";
import { useLecturerPortalData } from "../hooks/useLecturerPortalData";
import { useSemester } from "../contexts/SemesterContext";
import type { AuthUser } from "../contexts/AuthContext";
import type { AppState } from "../types/appState";
import type { ActionItem, Deadline } from "../types/common";

export function useRealAppState(
  role: string | null,
  isLoggedIn: boolean,
  user: AuthUser | null,
  showToast: (msg: string) => void,
  semesterId?: string | null,
): AppState {
  const { selectedSemester, activeSemesterId } = useSemester();
  const lecturerName = user?.name ?? "Giảng viên";

  // Lecturers can explicitly inspect all semesters; students remain scoped to the active one.
  const effectiveSemesterId =
    role === "lecturer"
      ? (semesterId && semesterId !== "all" ? semesterId : undefined)
      : role === "student"
        ? (activeSemesterId || (semesterId && semesterId !== "all" ? semesterId : undefined))
        : semesterId;

  const lecturerPortal = useLecturerPortalData(
    role === "lecturer" && isLoggedIn,
    lecturerName,
    showToast,
    effectiveSemesterId,
  );

  const currentLecturer = user?.name ?? "Giảng viên";
  const assignedStudents = lecturerPortal.students;

  /** Look up a student's display name by internship id (weekly reports only carry internshipId). */
  const internshipCtxRef = (internshipId: string) =>
    assignedStudents.find((s) => s.id === internshipId)
      ? {
          name: assignedStudents.find((s) => s.id === internshipId)!.name,
        }
      : null;

  const dynamicActionItems = useMemo((): ActionItem[] => {
    const items: ActionItem[] = [];

    // Per-student actionable items, ranked danger > warning > info.
    // 1. Danger — student behind schedule / flagged risky.
    for (const s of assignedStudents) {
      if (s.riskFlag || s.status === "Quá hạn") {
        items.push({
          id: `act-student-${s.id}`,
          title: s.name,
          subtitle: "Có vấn đề trong quá trình thực tập — cần theo dõi sát",
          type: "students",
          priority: "danger",
          count: s.progress,
          buttonText: "Xem hồ sơ",
        });
      }
    }

    // 2. Danger — weekly report requires revision.
    for (const r of lecturerPortal.weeklyReports) {
      if (r.status === "RevisionRequested") {
        const ctx = internshipCtxRef(r.internshipId);
        items.push({
          id: `act-revision-${r.id}`,
          title: ctx?.name ?? "Sinh viên",
          subtitle: `Báo cáo tuần ${r.weekNumber} cần chỉnh sửa sau phản hồi của bạn`,
          type: "reports",
          priority: "warning",
          buttonText: "Xem",
        });
      }
    }

    // 3. Warning — pending review items (aggregate).
    const pendingWeeklyCount = lecturerPortal.weeklyReports.filter(
      (r) => r.status === "Submitted",
    ).length;
    if (pendingWeeklyCount > 0) {
      items.push({
        id: "act-weekly",
        title: `${pendingWeeklyCount} báo cáo tuần chờ phản hồi`,
        subtitle: "Nhóm hướng dẫn đợt này",
        type: "review",
        priority: "warning",
        buttonText: "Duyệt ngay",
      });
    }
    const pendingSubCount = lecturerPortal.submissions.filter(
      (s) =>
        s.sourceType !== "weeklyReport" &&
        (s.status === "Chờ duyệt" || s.status === "Cần nhận xét"),
    ).length;
    if (pendingSubCount > 0) {
      items.push({
        id: "act-submissions",
        title: `${pendingSubCount} bài nộp sản phẩm/cuối kỳ chờ nhận xét`,
        subtitle: "Kho báo cáo & sản phẩm",
        type: "review",
        priority: "warning",
        buttonText: "Xem bài nộp",
      });
    }

    // 4. Info — students with no company yet.
    for (const s of assignedStudents) {
      if (s.company === "Chưa có") {
        items.push({
          id: `act-nocompany-${s.id}`,
          title: s.name,
          subtitle: "Chưa có doanh nghiệp thực tập — cần hỗ trợ tìm nơi thực tập",
          type: "students",
          priority: "info",
          buttonText: "Xem hồ sơ",
        });
      }
    }

    const rank = { danger: 0, warning: 1, info: 2 };
    items.sort(
      (a, b) =>
        (rank[a.priority as keyof typeof rank] ?? 3) -
        (rank[b.priority as keyof typeof rank] ?? 3),
    );
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lecturerPortal.weeklyReports,
    lecturerPortal.submissions,
    assignedStudents,
  ]);

  const stats = useMemo(() => {
    const total = assignedStudents.length;
    const interning = assignedStudents.filter(
      (s) =>
        s.company &&
        s.company !== "Chưa có" &&
        s.company !== "Chưa phân công doanh nghiệp" &&
        s.company !== "—",
    ).length;
    const pending = assignedStudents.filter(
      (s) => s.status === "Chờ phản hồi" || s.status === "Đang chỉnh sửa",
    ).length;
    const overdue = assignedStudents.filter(
      (s) => s.status === "Quá hạn" || s.riskFlag,
    ).length;
    const completed = assignedStudents.filter(
      (s) => s.status === "Hoàn thành",
    ).length;
    const avgProg =
      total > 0
        ? Math.round(
            assignedStudents.reduce((acc, s) => acc + s.progress, 0) / total,
          )
        : 0;
    const apiStats = lecturerPortal.dashboardStats;
    return {
      total: apiStats?.totalStudents ?? total,
      interning: apiStats?.interningCount ?? interning,
      assignedCompanyCount: apiStats?.assignedCompanyCount ?? interning,
      pending: apiStats?.pendingReviewsCount ?? pending,
      overdue: apiStats?.overdueReportsCount ?? overdue,
      completed: apiStats?.completedCount ?? completed,
      avgProg: total > 0 ? avgProg : apiStats?.averageProgress ?? 0,
      statusDistribution: apiStats?.statusDistribution ?? {},
    };
  }, [assignedStudents, lecturerPortal.dashboardStats]);

  const handleUpdateSubmissionStatus = async (
    id: string,
    newStatus: string,
    note?: string,
  ) => {
    await lecturerPortal.updateSubmissionStatus(id, newStatus, note);
    await lecturerPortal.refresh();
  };

  const handleReviewWeeklyReport = (
    id: string,
    status: string,
    comment?: string,
  ) => {
    void lecturerPortal.reviewWeeklyReport(id, status, comment);
  };

  const weeklyTrendData = useMemo(() => {
    return lecturerPortal.weeklyTrend.map((week) => ({
      label: week.label,
      value: week.onTimeCount,
      target: week.totalStudents,
      rate: week.complianceRate,
      weekNumber: week.weekNumber,
      late: week.lateCount,
      missing: week.missingCount,
      pending: week.pendingCount,
    }));
  }, [lecturerPortal.weeklyTrend]);

  return {
    currentLecturer,
    lecturerProfile: lecturerPortal.profile,
    assignedStudents,
    assignedSubmissions: lecturerPortal.submissions,
    lecturerEnterprises: lecturerPortal.enterprises,
    dynamicActionItems,
    weeklyTrendData,
    deadlines: (() => {
      const totalStudents = assignedStudents.length;
      const fmt = (d: Date) => ({ day: String(d.getDate()), month: `Th${d.getMonth() + 1}` });
      const dayDiff = (d: Date) =>
        Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

      /** Parse defensively */
      const safeDate = (raw: string | null | undefined): Date | null => {
        if (!raw) return null;
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? null : d;
      };

      // 1. Ưu tiên: Lấy từ cấu hình báo cáo thực tế của học kỳ (SemesterReportSchedules)
      if (lecturerPortal.schedules && lecturerPortal.schedules.length > 0) {
        const scheduleDeadlines = lecturerPortal.schedules
          .filter((s) => !s.isFinalReport && s.dueDate)
          .sort((a, b) => a.weekNumber - b.weekNumber)
          .map((s) => {
            const due = safeDate(s.dueDate);
            if (!due) return null;
            const diff = dayDiff(due);
            const submittedCount = lecturerPortal.weeklyReports.filter(
              (r) => r.weekNumber === s.weekNumber && r.status !== "Draft",
            ).length;
            const unsubmittedCount = Math.max(0, totalStudents - submittedCount);
            const isOverdue = diff < 0 && unsubmittedCount > 0;

            return {
              id: `dl-schedule-w${s.weekNumber}`,
              title: s.title || `Báo cáo tuần ${s.weekNumber}`,
              ...fmt(due),
              subtitle: isOverdue
                ? `${unsubmittedCount}/${totalStudents} sinh viên chưa nộp`
                : `${submittedCount}/${totalStudents} sinh viên đã nộp`,
              studentCount: totalStudents,
              isoDate: due.toISOString(),
              daysLeft: diff,
              isOverdue,
            };
          })
          .filter(Boolean) as Deadline[];

        if (scheduleDeadlines.length > 0) {
          return scheduleDeadlines;
        }
      }

      // 2. Fallback: Lấy từ weeklyReports có dueDate
      const reportsWithDueDates = lecturerPortal.weeklyReports.filter(
        (report) => report.dueDate,
      );

      if (reportsWithDueDates.length > 0) {
        const byWeek = new Map<number, { due: Date; total: number; overdue: number }>();
        for (const report of reportsWithDueDates) {
          const due = safeDate(report.dueDate);
          if (!due) continue;
          const wk = report.weekNumber ?? 0;
          if (!byWeek.has(wk)) byWeek.set(wk, { due, total: 0, overdue: 0 });
          const entry = byWeek.get(wk)!;
          entry.total += 1;
          if (report.status === "Draft" || report.status === "Overdue") entry.overdue += 1;
        }
        if (byWeek.size > 0) {
          return Array.from(byWeek.entries())
            .sort((a, b) => a[1].due.getTime() - b[1].due.getTime())
            .map(([wk, agg]) => {
              const diff = dayDiff(agg.due);
              const hasOverdue = agg.overdue > 0;
              return {
                id: `dl-week-${wk}`,
                title: `Báo cáo tuần ${wk}`,
                ...fmt(agg.due),
                subtitle: hasOverdue
                  ? `${agg.overdue}/${agg.total} sinh viên chưa nộp`
                  : `${agg.total} sinh viên đã nộp`,
                studentCount: agg.total,
                isoDate: agg.due.toISOString(),
                daysLeft: diff,
                isOverdue: hasOverdue && diff < 0,
              };
            });
        }
      }

      if (!selectedSemester?.endDate) return [];
      const end = safeDate(selectedSemester.endDate);
      if (!end) return [];
      const diff = dayDiff(end);
      return [{
        id: "dl-semester-end",
        title: "Kết thúc kỳ thực tập",
        ...fmt(end),
        subtitle: diff > 0 ? "Hạn chốt toàn bộ báo cáo" : "Đã kết thúc",
        studentCount: assignedStudents.length,
        isoDate: end.toISOString(),
        daysLeft: diff,
        isOverdue: diff < 0,
      }];
    })(),
    stats,
    weeklyReports: lecturerPortal.weeklyReports,
    weeklyReportPage: lecturerPortal.weeklyReportPage,
    weeklyReportQuery: lecturerPortal.weeklyReportQuery,
    weeklyReportTotals: lecturerPortal.weeklyReportTotals,
    queryWeeklyReports: lecturerPortal.queryWeeklyReports,
    isLecturerLoading: lecturerPortal.isLoading,
    lecturerError: lecturerPortal.error,
    handleUpdateSubmissionStatus,
    handleReviewWeeklyReport,
    refresh: lecturerPortal.refresh,
  };
}
