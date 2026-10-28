import { describe, expect, it } from "vitest";
import {
  calculateWeeklyReportProgress,
  getOpenWeeklyReportWeeks,
} from "../features/student/studentProgress";

describe("calculateWeeklyReportProgress", () => {
  it("counts only enabled weekly reports and excludes final-report schedules", () => {
    const result = calculateWeeklyReportProgress(
      [
        { weekNumber: 1, status: "approved" },
        { weekNumber: 2, status: "approved" },
        { weekNumber: 3, status: "submitted" },
        { weekNumber: 4, status: "approved" },
        { weekNumber: 5, status: "approved" },
      ],
      [
        { weekNumber: 1, isSubmissionOpen: true },
        { weekNumber: 2, isSubmissionOpen: true },
        { weekNumber: 3, isSubmissionOpen: true },
        { weekNumber: 4, isSubmissionOpen: true },
        { weekNumber: 5, isSubmissionOpen: true, isFinalReport: true },
      ],
      4,
      4,
    );

    expect(result).toEqual({
      requiredWeeksCount: 4,
      approvedCount: 3,
      submittedCount: 1,
      draftOrRevisedCount: 0,
    });
  });

  it("counts only deadlines enabled by the lecturer", () => {
    const result = calculateWeeklyReportProgress(
      [
        { weekNumber: 1, status: "approved" },
        { weekNumber: 2, status: "approved" },
        { weekNumber: 3, status: "approved" },
      ],
      [
        { weekNumber: 1, isSubmissionOpen: true },
        { weekNumber: 2, isSubmissionOpen: false },
        { weekNumber: 3, isSubmissionOpen: true },
      ],
      3,
      2,
    );

    expect(result.approvedCount).toBe(2);
    expect(result.requiredWeeksCount).toBe(2);
  });

  it("does not show six default weeks when no weekly deadline is open", () => {
    expect(
      getOpenWeeklyReportWeeks(
        [
          { weekNumber: 1, isSubmissionOpen: false },
          { weekNumber: 7, isSubmissionOpen: true, isFinalReport: true },
        ],
        6,
      ),
    ).toEqual([]);
  });
});
