type WeeklyReportStatus = "draft" | "submitted" | "revised" | "approved";

interface WeeklyReportProgressReport {
  weekNumber: number;
  status: WeeklyReportStatus;
}

interface WeeklyReportProgressSchedule {
  weekNumber: number;
  isSubmissionOpen: boolean;
  isFinalReport?: boolean;
}

export function getOpenWeeklyReportWeeks(
  schedules: WeeklyReportProgressSchedule[],
  totalSemesterWeeks: number,
) {
  return [
    ...new Set(
      schedules
        .filter(
          (schedule) =>
            schedule.isSubmissionOpen &&
            !schedule.isFinalReport &&
            schedule.weekNumber >= 1 &&
            (!totalSemesterWeeks || schedule.weekNumber <= totalSemesterWeeks),
        )
        .map((schedule) => schedule.weekNumber),
    ),
  ].sort((left, right) => left - right);
}

export function calculateWeeklyReportProgress(
  reports: WeeklyReportProgressReport[],
  schedules: WeeklyReportProgressSchedule[],
  totalSemesterWeeks: number,
  fallbackRequiredWeeks: number,
) {
  const hasWeeklyScheduleConfig = schedules.length > 0;
  const requiredWeekNumbers = new Set(
    hasWeeklyScheduleConfig
      ? getOpenWeeklyReportWeeks(schedules, totalSemesterWeeks)
      : Array.from(
          {
            length:
              totalSemesterWeeks > 0
                ? totalSemesterWeeks
                : fallbackRequiredWeeks,
          },
          (_, index) => index + 1,
        ),
  );
  const requiredReports = reports.filter((report) =>
    requiredWeekNumbers.has(report.weekNumber),
  );

  return {
    requiredWeeksCount: requiredWeekNumbers.size,
    approvedCount: requiredReports.filter(
      (report) => report.status === "approved",
    ).length,
    submittedCount: requiredReports.filter(
      (report) => report.status === "submitted",
    ).length,
    draftOrRevisedCount: requiredReports.filter(
      (report) => report.status === "draft" || report.status === "revised",
    ).length,
  };
}
