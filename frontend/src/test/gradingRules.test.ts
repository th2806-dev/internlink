import { describe, expect, it } from "vitest";
import {
  getFinalReportWeek,
  GR_INELIGIBLE_LABEL,
  classifyScore,
  computeGrade,
  parseGradingDate,
  resolveReportWindow,
  resolveSubmission,
  roundScore,
  toEligibilityCell,
  toFinalReportCell,
  toWeekCell,
  type WeekRecord,
} from "../lib/gradingRules";

const NOW = new Date("2026-09-20T10:00:00Z");
const WEEK_DEADLINES = [1, 2, 3, 4, 5, 6].map((week) => ({
  weekNumber: week,
  deadline: `2026-09-${String(6 + week).padStart(2, "0")}T23:59:59Z`,
}));

function onTimeWeeks(deadlines = WEEK_DEADLINES, overrides: Record<number, string> = {}): WeekRecord[] {
  return deadlines.map((week) => ({
    weekNumber: week.weekNumber,
    deadline: week.deadline,
    submittedAt: overrides[week.weekNumber] ?? week.deadline,
  }));
}

describe("roundScore (Excel ROUND semantics)", () => {
  it("rounds half away from zero at 1 digit", () => {
    expect(roundScore(6.35)).toBe(6.4);
    expect(roundScore(6.45)).toBe(6.5);
    expect(roundScore(6.44)).toBe(6.4);
    expect(roundScore(9.96)).toBe(10);
  });
});

describe("resolveReportWindow", () => {
  it("marks disabled when toggle is off", () => {
    expect(
      resolveReportWindow({
        startDate: "2026-09-01T00:00:00Z",
        deadline: "2026-09-30T23:59:59Z",
        isEnabled: false,
        now: NOW,
      }),
    ).toBe("disabled");
  });

  it("marks upcoming before start, open during window, closed after deadline", () => {
    expect(
      resolveReportWindow({ startDate: "2026-10-01T00:00:00Z", deadline: "2026-10-07T23:59:59Z", now: NOW }),
    ).toBe("upcoming");
    expect(
      resolveReportWindow({ startDate: "2026-09-01T00:00:00Z", deadline: "2026-09-30T23:59:59Z", now: NOW }),
    ).toBe("open");
    expect(
      resolveReportWindow({ startDate: "2026-09-01T00:00:00Z", deadline: "2026-09-10T23:59:59Z", now: NOW }),
    ).toBe("closed");
  });

  it("marks closing_soon within 48h of deadline", () => {
    expect(
      resolveReportWindow({
        startDate: "2026-09-01T00:00:00Z",
        deadline: "2026-09-21T09:00:00Z", // < 48h sau NOW
        now: NOW,
      }),
    ).toBe("closing_soon");
  });

  it("marks unconfigured when deadline missing", () => {
    expect(resolveReportWindow({ startDate: "2026-09-01", deadline: null, now: NOW })).toBe("unconfigured");
  });
});

describe("resolveSubmission (is_late / is_missing)", () => {
  it("on_time when submitted before deadline", () => {
    expect(
      resolveSubmission({ submittedAt: "2026-09-07T00:00:00Z", deadline: "2026-09-07T23:59:59Z", now: NOW }),
    ).toBe("on_time");
  });

  it("late when submitted after deadline", () => {
    expect(
      resolveSubmission({ submittedAt: "2026-09-08T01:00:00Z", deadline: "2026-09-07T23:59:59Z", now: NOW }),
    ).toBe("late");
  });

  it("missing when not submitted past deadline, pending before deadline", () => {
    expect(resolveSubmission({ submittedAt: null, deadline: "2026-09-07T23:59:59Z", now: NOW })).toBe("missing");
    expect(resolveSubmission({ submittedAt: null, deadline: "2026-09-30T23:59:59Z", now: NOW })).toBe("pending");
  });
});

describe("computeGrade", () => {
  it("perfect student: QT = 10, TB = 10, Xuất sắc", () => {
    const result = computeGrade({
      weeks: onTimeWeeks(),
      finalReportSubmittedAt: "2026-09-25T00:00:00Z",
      finalReportDeadline: "2026-09-26T23:59:59Z",
      qualityLevel: 5,
      hasCreativeProduct: true,
      oralExamScore: 10,
      now: NOW,
    });

    expect(result.missingCount).toBe(0);
    expect(result.lateCount).toBe(0);
    expect(result.isEligible).toBe(true);
    expect(result.processScore).toBe(10); // MIN(10, 2 + 2 + 5 + 1)
    expect(result.averageScore).toBe(10); // 10*0.4 + 10*0.6
    expect(result.classification).toBe("Xuất sắc");
  });

  it("applies late/missing penalties per 0.5đ", () => {
    const weeks = onTimeWeeks(WEEK_DEADLINES, {
      2: "2026-09-09T00:00:00Z", // trễ 0.5đ
    });
    weeks.push({ weekNumber: 6, deadline: "2026-09-12T23:59:59Z", submittedAt: null }); // thiếu 0.5đ

    const result = computeGrade({
      weeks,
      finalReportSubmittedAt: "2026-09-25T00:00:00Z",
      qualityLevel: 3.5,
      oralExamScore: 7,
      now: NOW,
    });

    expect(result.lateWeeks).toEqual([2]);
    expect(result.missingWeeks).toEqual([6]);
    expect(result.submissionPoints).toBe(1.5); // 2 - 1*0.5
    expect(result.punctualityPoints).toBe(1.5); // 2 - 1*0.5
    expect(result.qualityPoints).toBe(3.5);
    expect(result.creativeBonus).toBe(0);
    expect(result.processScore).toBe(6.5);
    expect(result.averageScore).toBe(6.8); // 6.5*0.4 + 7*0.6 = 2.6 + 4.2
    expect(result.classification).toBe("Khá");
  });

  it("capped at MIN(10, ...)", () => {
    const result = computeGrade({
      weeks: onTimeWeeks(),
      finalReportSubmittedAt: "2026-09-25T00:00:00Z",
      qualityLevel: 5,
      hasCreativeProduct: true,
      oralExamScore: 5,
      now: NOW,
    });
    expect(result.processScore).toBe(10);
    expect(result.averageScore).toBe(7); // 10*0.4 + 5*0.6
    expect(result.classification).toBe("Khá");
  });

  it("ineligible when missing >= 2 weeks: TB = 0, không thực tập", () => {
    // Tuần 5, 6 quá hạn không nộp (quá hạn)
    const weeks: WeekRecord[] = [
      ...onTimeWeeks().slice(0, 4),
      { weekNumber: 5, deadline: "2026-09-11T23:59:59Z", submittedAt: null },
      { weekNumber: 6, deadline: "2026-09-12T23:59:59Z", submittedAt: null },
    ];
    const result = computeGrade({
      weeks,
      finalReportSubmittedAt: "2026-09-25T00:00:00Z",
      qualityLevel: 5,
      hasCreativeProduct: true,
      oralExamScore: 9,
      absentWeekCount: 2,
      now: NOW,
    });

    expect(result.missingCount).toBe(2);
    expect(result.isEligible).toBe(false);
    expect(result.ineligibilityReasons).toContain("Vắng buổi hẹn >= 2 buổi");
    expect(result.processScore).toBe(9); // QT vẫn tính: 1 + 2 + 5 + 1
    expect(result.averageScore).toBe(0);
    expect(result.classification).toBe(GR_INELIGIBLE_LABEL);
  });

  it("ineligible when final report missing", () => {
    const result = computeGrade({
      weeks: onTimeWeeks(),
      finalReportSubmittedAt: null,
      qualityLevel: 5,
      oralExamScore: 9,
      now: NOW,
    });

    expect(result.isEligible).toBe(false);
    expect(result.ineligibilityReasons).toContain("Chưa nộp báo cáo cuối kỳ");
    expect(result.averageScore).toBe(0);
    expect(result.classification).toBe(GR_INELIGIBLE_LABEL);
  });

  it("attendance absence affects eligibility but never submission penalties", () => {
    // Tuần 3: đã nộp báo cáo nhưng điểm danh V; Tuần 5: nộp trễ
    const weeks = onTimeWeeks().map((week) => {
      if (week.weekNumber === 3) return { ...week, isAbsent: true };
      if (week.weekNumber === 5) return { ...week, submittedAt: "2026-09-13T00:00:00Z" };
      return week;
    });
    const updated = computeGrade({
      weeks,
      finalReportSubmittedAt: "2026-09-25T00:00:00Z",
      absentWeekCount: 1,
      qualityLevel: 4,
      oralExamScore: 8,
      now: NOW,
    });

    expect(updated.missingWeeks).toEqual([]);
    expect(updated.lateWeeks).toEqual([5]);
    expect(updated.isEligible).toBe(true);
    // Vắng tuần 3 → nộp đủ 1.5 + trễ tuần 5 → đúng hạn 1.5 + chất lượng 4
    expect(updated.processScore).toBe(7.5);
    expect(updated.averageScore).toBe(7.8); // 7.5*0.4 + 8*0.6 = 3 + 4.8
  });

  it("does not double count a week that is both missing and absent", () => {
    const weeks = onTimeWeeks().slice(0, 5).concat([
      { weekNumber: 6, deadline: "2026-09-12T23:59:59Z", submittedAt: null, isAbsent: true },
    ]);
    const result = computeGrade({ weeks, finalReportSubmittedAt: "2026-09-25T00:00:00Z", now: NOW });
    expect(result.missingWeeks).toEqual([6]);
    expect(result.missingCount).toBe(1);
  });

  it("classification boundaries: 9 → Xuất sắc, 8 → Giỏi, 6.5 → Khá, 5 → Trung bình", () => {
    expect(classifyScore(9)).toBe("Xuất sắc");
    expect(classifyScore(8.9)).toBe("Giỏi");
    expect(classifyScore(8)).toBe("Giỏi");
    expect(classifyScore(6.5)).toBe("Khá");
    expect(classifyScore(5)).toBe("Trung bình");
    expect(classifyScore(4.9)).toBe("Không đạt");
  });

  it("averageScore is null while eligible but oral exam not entered yet", () => {
    const result = computeGrade({
      weeks: onTimeWeeks(),
      finalReportSubmittedAt: "2026-09-25T00:00:00Z",
      qualityLevel: 4,
      now: NOW,
    });
    expect(result.isEligible).toBe(true);
    expect(result.averageScore).toBeNull();
    expect(result.classification).toBe("");
  });

  it("ignores invalid quality levels", () => {
    const result = computeGrade({
      weeks: onTimeWeeks(),
      finalReportSubmittedAt: "2026-09-25T00:00:00Z",
      qualityLevel: 3.7,
      oralExamScore: 5,
      now: NOW,
    });
    expect(result.qualityPoints).toBe(0);
    expect(result.processScore).toBe(4);
  });
});

describe("Excel cell mapping (template C23)", () => {
  it("maps week states to ✓ / T / V", () => {
    expect(toWeekCell("on_time")).toBe("✓");
    expect(toWeekCell("late")).toBe("T");
    expect(toWeekCell("missing")).toBe("V");
    expect(toWeekCell("pending")).toBe("");
  });

  it("maps final report and eligibility cells", () => {
    expect(toFinalReportCell(true)).toBe("Đã nộp");
    expect(toFinalReportCell(false)).toBe("X");
    expect(toEligibilityCell(true)).toBe("");
    expect(toEligibilityCell(false)).toBe("Không đủ điều kiện");
  });
});

describe("parseGradingDate", () => {
  it("parses ISO without timezone suffix as UTC", () => {
    expect(parseGradingDate("2026-09-20T10:00:00")?.toISOString()).toBe("2026-09-20T10:00:00.000Z");
  });

  it("returns null for invalid input", () => {
    expect(parseGradingDate("")).toBeNull();
    expect(parseGradingDate("khong-phai-ngay")).toBeNull();
    expect(parseGradingDate(null)).toBeNull();
  });
});

describe("constants", () => {
  it("final report follows the configured week count", () => {
    expect(getFinalReportWeek(6)).toBe(7);
    expect(getFinalReportWeek(8)).toBe(9);
  });
});
