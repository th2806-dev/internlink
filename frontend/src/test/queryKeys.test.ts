import { describe, expect, it } from "vitest";
import { queryKeys } from "../lib/queryKeys";

describe("queryKeys", () => {
  it("creates a semester- and user-scoped lecturer internship list key", () => {
    expect(
      queryKeys.lecturer.internships.list({
        semesterId: "semester-1",
        userId: "lecturer-1",
      }),
    ).toEqual([
      "lecturer-portal",
      "internships",
      "list",
      { semesterId: "semester-1", userId: "lecturer-1" },
    ]);
  });

  it("isolates lecturer analytics and comparison caches by user", () => {
    expect(queryKeys.lecturer.analytics("semester-1", "lecturer-1")).toEqual([
      "lecturer-portal",
      "analytics",
      "semester",
      "semester-1",
      "lecturer-1",
    ]);
    expect(queryKeys.lecturer.analyticsComparison("lecturer-1")).toEqual([
      "lecturer-portal",
      "analytics",
      "comparison",
      "lecturer-1",
    ]);
  });

  it("scopes account, admin, and student resources to their cache identities", () => {
    expect(queryKeys.auth.sessions("admin-1")).toEqual([
      "auth",
      "sessions",
      "admin-1",
    ]);
    expect(queryKeys.admin.assignments.matrix({
      semesterId: "semester-1",
      departmentId: "department-1",
    })).toEqual([
      "admin",
      "assignments",
      "matrix",
      { semesterId: "semester-1", departmentId: "department-1" },
    ]);
    expect(queryKeys.student.evidenceAsset("submission-1", "asset-1", "student-1")).toEqual([
      "student",
      "evidence-asset",
      "submission-1",
      "asset-1",
      "student-1",
    ]);
  });
});
