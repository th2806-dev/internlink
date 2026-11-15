import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmployerQuickEvaluationView from "../features/public/pages/EmployerQuickEvaluationView";
import { apiRequestRaw } from "../lib/apiClient";

vi.mock("../lib/apiClient", () => ({
  apiRequestRaw: vi.fn(),
}));

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
        rubric: [{
          name: "Kỹ năng chuyên môn",
          description: "Áp dụng kiến thức vào công việc",
          maxScore: 10,
          weight: 40,
        }],
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
    screen.getAllByRole("button", { name: "10 trên 10 điểm" }).forEach((button) => fireEvent.click(button));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Ký xác nhận & gửi đánh giá" }));

    expect(await screen.findByText("Đã gửi đánh giá")).toBeInTheDocument();
    expect(apiRequestRaw).toHaveBeenLastCalledWith("/api/v1/public/employer-evaluations/submit", expect.objectContaining({
      method: "POST",
      auth: false,
      body: expect.objectContaining({ token: "secret-token", confirmed: true, confirmedMentorName: "Trần Minh" }),
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
      rubric: [{
        name: "Kỹ năng chuyên môn",
        description: "Áp dụng kiến thức vào công việc",
        maxScore: 10,
        weight: 40,
      }],
    });

    render(
      <MemoryRouter initialEntries={["/evaluate/secret-token"]}>
        <Routes>
          <Route path="/evaluate/:token" element={<EmployerQuickEvaluationView />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Quy chế HK1")).toBeInTheDocument();
    expect(screen.getByText("Kỹ năng chuyên môn")).toBeInTheDocument();
    expect(apiRequestRaw).toHaveBeenCalledWith(
      "/api/v1/public/employer-evaluations/verify?token=secret-token",
      expect.objectContaining({ auth: false }),
    );
  });
});
