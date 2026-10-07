import { describe, expect, it } from "vitest";
import {
  buildAssignmentStatusSlices,
  buildInternshipStatusTrend,
} from "../components/common/DashboardCharts";
import type { InternshipStatsDto } from "../types/api";

const emptyStats: InternshipStatsDto = {
  total: 0,
  notStarted: 0,
  inProgress: 0,
  behindSchedule: 0,
  awaitingFeedback: 0,
  requiresRevision: 0,
  completed: 0,
  graded: 0,
};

describe("dashboard chart data", () => {
  it("uses backend internship statuses and omits zero categories", () => {
    expect(buildInternshipStatusTrend({
      ...emptyStats,
      total: 7,
      inProgress: 4,
      completed: 3,
    })).toEqual([
      { label: "Đang TT", value: 4 },
      { label: "Hoàn thành", value: 3 },
    ]);
  });

  it("uses the backend total when status breakdown is unavailable", () => {
    expect(buildInternshipStatusTrend({ ...emptyStats, total: 5 })).toEqual([
      { label: "Tổng thực tập", value: 5 },
    ]);
    expect(buildInternshipStatusTrend(emptyStats)).toEqual([]);
  });

  it("creates assignment slices only from actual counts", () => {
    expect(buildAssignmentStatusSlices(8, 2)).toEqual([
      { name: "Đã phân công GV", value: 8, tone: "blue" },
      { name: "Chưa phân công", value: 2, tone: "amber" },
    ]);
    expect(buildAssignmentStatusSlices(0, 0)).toEqual([]);
  });
});
