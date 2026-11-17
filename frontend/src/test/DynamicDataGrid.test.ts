import { describe, expect, it } from "vitest";
import { formatGridCell, getGridFieldValue } from "../features/admin/components/gridFormatting";

describe("DynamicDataGrid formatting", () => {
  it("reads nested values from FieldCode paths", () => {
    expect(getGridFieldValue({ student: { code: "SV001" } }, "student.code")).toBe("SV001");
    expect(getGridFieldValue({ student: null }, "student.code")).toBeUndefined();
  });

  it("formats numeric and empty values by metadata type", () => {
    expect(formatGridCell(0.25, "percent")).toContain("25");
    expect(formatGridCell(1200000, "currency")).toContain("1.200.000");
    expect(formatGridCell(null, "text")).toBe("—");
  });

  it("keeps an invalid date readable rather than returning an invalid-date label", () => {
    expect(formatGridCell("not-a-date", "date")).toBe("not-a-date");
  });
});
