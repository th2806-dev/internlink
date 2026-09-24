import { useMemo } from "react";
import { useLecturerPortalData } from "../hooks/useLecturerPortalData";
import { useSemester } from "../contexts/SemesterContext";
import type { AuthUser } from "../contexts/AuthContext";
import type { AppState } from "../types/appState";
import type { ActionItem } from "../types/common";

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
      (s) => s.company !== "Chưa có",
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
      interning: apiStats?.assignedCompanyCount ?? interning,
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
    if (lecturerPortal.weeklyTrend.length > 0) {
      return lecturerPortal.weeklyTrend.map((week) => ({
        label: week.label || `Tuần ${week.weekNumber}`,
        value: week.onTimeCount,
        late: week.lateCount,
        missing: week.missingCount,
      }));
    }
    const weekMap = new Map<number, { submitted: number; approved: number }>();
    for (const r of lecturerPortal.weeklyReports) {
      const wk = r.weekNumber ?? 0;
      if (!weekMap.has(wk)) weekMap.set(wk, { submitted: 0, approved: 0 });
      const entry = weekMap.get(wk)!;
      entry.submitted++;
      if (r.status === "Approved" || r.status === "Reviewed") entry.approved++;
    }
    const weeks = Array.from(weekMap.entries()).sort((a, b) => a[0] - b[0]);
    if (weeks.length === 0) return [];
    return weeks.map(([wk, counts]) => ({
      label: `T${wk}`,
      value: counts.submitted,
      target: assignedStudents.length || 0,
    }));
  }, [assignedStudents, lecturerPortal.weeklyReports, lecturerPortal.weeklyTrend]);

  // Full 1..totalWeeks series so the chart always shows every internship week
  // (missing weeks render as 0 submitted instead of disappearing entirely).
  // NOTE: matched by week INDEX, not label — the API returns labels like
  // "Tuần 1" which would never match a "T1" key.
  const fullWeeklyTrendData = useMemo(() => {
    type TrendPoint = { label: string; value: number; target?: number; late?: number; missing?: number };
    const points = weeklyTrendData as TrendPoint[];
    const totalWeeks = selectedSemester?.totalWeeks ?? 6;
    return Array.from({ length: totalWeeks }, (_, i): TrendPoint => {
      const w = points[i];
      return {
        label: `T${i + 1}`,
        value: w?.value ?? 0,
        late: w?.late ?? 0,
        missing:
          w?.missing ??
          Math.max(0, (w?.target ?? assignedStudents.length) - (w?.value ?? 0)),
      };
    });
  }, [weeklyTrendData, selectedSemester?.totalWeeks, assignedStudents.length]);

  return {
    currentLecturer,
    assignedStudents,
    assignedSubmissions: lecturerPortal.submissions,
    lecturerEnterprises: lecturerPortal.enterprises,
    dynamicActionItems,
    weeklyTrendData: fullWeeklyTrendData,
    deadlines: (() => {
      const reportsWithDueDates = lecturerPortal.weeklyReports.filter(
        (report) => report.dueDate,
      );
      /** Parse defensively: returns null for null/empty/"Invalid Date" strings so a
        * single malformed dueDate can never crash the whole app again. */
      const safeDate = (raw: string | null | undefined): Date | null => {
        if (!raw) return null;
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? null : d;
      };
      const fmt = (d: Date) => ({ day: String(d.getDate()), month: `Th${d.getMonth() + 1}` });
      const daysLeft = (d: Date) => {
        const diff = Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        return diff > 0 ? `Còn ${diff} ngày` : "Đã hết hạn";
      };
      const dayDiff = (d: Date) =>
        Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

      if (reportsWithDueDates.length > 0) {
        // Group by week so the lecturer sees one row per deadline, not one per report.
        // Skip any report whose dueDate cannot be parsed to a valid Date.
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
