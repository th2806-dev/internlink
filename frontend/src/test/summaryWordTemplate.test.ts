import { describe, expect, it } from "vitest";
import { buildWordReportPreviewData, formatWordDate } from "../features/lecturer/pages/summaryWordTemplate";

describe("summaryWordTemplate", () => {
  it("formats date in the Word template style", () => {
    expect(formatWordDate("2026-09-19")).toBe("ngày 19 tháng 09 năm 2026");
  });

  it("builds report metadata from semester and attendance stats", () => {
    const result = buildWordReportPreviewData({
      semesterName: "CĐ 2026",
      startDate: "2026-09-01",
      endDate: "2026-12-31",
      companyCount: 14,
      registeredStudents: 180,
      completedStudents: 165,
      incompleteStudents: 15,
      gradeSummary: [
        { label: "Xuất sắc", quantity: 24, rate: 13.3 },
        { label: "Giỏi", quantity: 61, rate: 33.9 },
      ],
    });

    expect(result.header.department).toBe("KHOA CĐ 2026");
    // reportDate mặc định là hôm nay — chỉ assert đúng định dạng, không assert ngày cứng
    expect(result.header.dateLabel).toMatch(/^ngày \d{1,2} tháng \d{2} năm \d{4}$/);
    expect(result.stats.companyCount).toBe(14);
    expect(result.stats.completedStudents).toBe(165);
    expect(result.gradeSummary[0].label).toBe("Xuất sắc");
  });
});
