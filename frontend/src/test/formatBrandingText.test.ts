import { describe, expect, it } from "vitest";
import { formatBrandingText } from "../contexts/AppBrandingContext";

describe("formatBrandingText", () => {
  it("replaces configured app, company, and year tokens", () => {
    expect(formatBrandingText("© {year} {appName} · {companyName}", {
      appName: "Campus",
      companyName: "Trường thử nghiệm",
      year: 2026,
    })).toBe("© 2026 Campus · Trường thử nghiệm");
  });

  it("leaves custom literal text unchanged", () => {
    expect(formatBrandingText("Powered by Campus", {
      appName: "Campus",
      companyName: "Trường thử nghiệm",
      year: 2026,
    })).toBe("Powered by Campus");
  });
});
