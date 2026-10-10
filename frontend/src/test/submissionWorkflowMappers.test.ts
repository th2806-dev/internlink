import { describe, expect, it } from "vitest";
import {
  mapStudentSubmissionToUpload,
  mapUiSubmissionStatusToApi,
  mapUiWeeklyReportReviewStatusToApi,
} from "../lib/portalMappers";

describe("submission workflow mappers", () => {
  it.each([
    ["Chờ duyệt", "Submitted"],
    ["Cần nhận xét", "Reviewed"],
    ["Yêu cầu sửa", "RevisionRequested"],
    ["Đã duyệt", "Approved"],
    ["Từ chối", "Rejected"],
  ])("preserves submission status %s as %s when adding feedback", (uiStatus, apiStatus) => {
    expect(mapUiSubmissionStatusToApi(uiStatus)).toBe(apiStatus);
  });

  it.each([
    ["Bản nháp", "Draft"],
    ["Đã nộp", "Submitted"],
    ["Đã xem", "Reviewed"],
    ["Cần chỉnh sửa", "RevisionRequested"],
    ["Đã hoàn thành", "Approved"],
  ])("preserves weekly report status %s as %s when adding feedback", (uiStatus, apiStatus) => {
    expect(mapUiWeeklyReportReviewStatusToApi(uiStatus)).toBe(apiStatus);
  });

  it("maps employer evidence to its own submission category", () => {
    expect(
      mapStudentSubmissionToUpload({
        id: "submission-1",
        internshipId: "internship-1",
        type: "Evidence",
        status: "Approved",
        version: 1,
        submittedAt: "2026-10-09T00:00:00Z",
        assets: [],
      }).category,
    ).toBe("Đánh giá doanh nghiệp");
  });
});
