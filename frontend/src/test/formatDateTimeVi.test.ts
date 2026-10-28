import { describe, expect, it } from "vitest";
import { formatDateVi } from "../lib/formatDateTimeVi";

describe("formatDateVi", () => {
  it("formats dates as dd/mm/yyyy in Vietnam time", () => {
    expect(formatDateVi("2026-09-28T00:00:00")).toBe("28/09/2026");
  });

  it("returns a placeholder for missing or invalid dates", () => {
    expect(formatDateVi(null)).toBe("—");
    expect(formatDateVi("invalid-date")).toBe("—");
  });
});
