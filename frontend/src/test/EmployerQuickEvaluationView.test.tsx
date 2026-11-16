import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmployerQuickEvaluationView from "../features/public/pages/EmployerQuickEvaluationView";
import { apiRequestRaw } from "../lib/apiClient";

vi.mock("../lib/apiClient", () => ({
  apiRequestRaw: vi.fn(),
}));

const ratingLevels = [
  { value: 0, label: "Chưa đáp ứng", description: "Chưa đáp ứng yêu cầu." },
  { value: 1, label: "Cần cải thiện", description: "Cần hướng dẫn." },
  { value: 2, label: "Đạt một phần", description: "Đáp ứng một phần." },
  { value: 3, label: "Đạt yêu cầu", description: "Đáp ứng yêu cầu." },
  { value: 4, label: "Vượt yêu cầu", description: "Vượt kỳ vọng." },
];

const rubric = {
  id: "rubric-1",
  version: 1,
  name: "Rubric HK1",
  ratingLevels,
  criteria: Array.from({ length: 8 }, (_, index) => ({
    id: `criterion-${index + 1}`,
    name: `Tiêu chí ${index + 1}`,
    description: "Mô tả tiêu chí",
    weight: 12.5,
    orderIndex: index + 1,
  })),
};

describe("EmployerQuickEvaluationView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifies the magic link and submits a confirmed evaluation", async () => {
    vi.mocked(apiRequestRaw)
      .mockResolvedValueOnce({
        studentName: "Nguyễn An",
        studentCode: "SV001",
        department: "Khoa Kỹ thuật",
        semester: "HK1",
        company: "Công ty ABC",
        position: "Thực tập sinh",
        mentorName: "Trần Minh",
        gradingRules: {
          ruleSetName: "Quy chế HK1",
          employerScoreWeight: 0.2,
          minimumPassingScore: 5,
          requiredWeeklyReportsCount: 6,
        },
        rubric,
      })
      .mockResolvedValueOnce({
        evaluationId: "receipt-1",
        finalScore: 8,
        confirmedMentorName: "Trần Minh",
        confirmedAt: "2026-11-08T08:00:00Z",
      });

    render(
      <MemoryRouter initialEntries={["/evaluate/secret-token"]}>
        <Routes>
          <Route path="/evaluate/:token" element={<EmployerQuickEvaluationView />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Nguyễn An")).toBeInTheDocument();
    expect(screen.getByText("Công ty ABC")).toBeInTheDocument();
    screen.getAllByRole("button", { name: /3 · Đạt yêu cầu/ }).forEach((button) => fireEvent.click(button));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Ký xác nhận & gửi đánh giá" }));

    expect(await screen.findByText("Đã gửi đánh giá")).toBeInTheDocument();
    expect(apiRequestRaw).toHaveBeenLastCalledWith("/api/v1/public/employer-evaluations/submit", expect.objectContaining({
      method: "POST",
      auth: false,
      body: expect.objectContaining({
        token: "secret-token",
        confirmed: true,
        confirmedMentorName: "Trần Minh",
        criterionScores: expect.arrayContaining([
          expect.objectContaining({ criterionId: "criterion-1", score: 3 }),
        ]),
      }),
    }));
    await waitFor(() => expect(screen.getByText(/Mã biên nhận/)).toBeInTheDocument());
  });

  it("shows semester grading rules and rubric from the verification response", async () => {
    vi.mocked(apiRequestRaw).mockResolvedValueOnce({
      studentName: "Nguyễn An",
      studentCode: "SV001",
      department: "Khoa Kỹ thuật",
      semester: "HK1",
      company: "Công ty ABC",
      position: "Thực tập sinh",
      mentorName: "Trần Minh",
      gradingRules: {
        ruleSetName: "Quy chế HK1",
        employerScoreWeight: 0.2,
        minimumPassingScore: 5,
        requiredWeeklyReportsCount: 6,
      },
      rubric,
    });

    render(
      <MemoryRouter initialEntries={["/evaluate/secret-token"]}>
        <Routes>
          <Route path="/evaluate/:token" element={<EmployerQuickEvaluationView />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Quy chế HK1")).toBeInTheDocument();
    expect(screen.getByText(/Rubric HK1/)).toBeInTheDocument();
    expect(screen.getByText("Tiêu chí 1")).toBeInTheDocument();
    expect(apiRequestRaw).toHaveBeenCalledWith(
      "/api/v1/public/employer-evaluations/verify?token=secret-token",
      expect.objectContaining({ auth: false }),
    );
  });
});
