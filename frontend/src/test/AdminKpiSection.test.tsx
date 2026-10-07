import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AdminKpiSection } from "../features/admin/components/KpiSection";

describe("Admin KPI cards", () => {
  it("renders four individual KPI cards and preserves navigation actions", () => {
    const onCardClick = vi.fn();
    const { container } = render(
      <AdminKpiSection
        onCardClick={onCardClick}
        stats={{
          lecturerCount: 14,
          lecturersWithStudents: 12,
          studentCount: 260,
          activeStudents: 252,
          pendingStudentAccounts: 8,
          pendingLecturerAccounts: 2,
          companyCount: 32,
          activeCompanies: 24,
          internshipTotal: 3,
          internshipInProgress: 2,
          internshipStats: {
            total: 260,
            notStarted: 8,
            inProgress: 200,
            behindSchedule: 10,
            awaitingFeedback: 14,
            requiresRevision: 8,
            completed: 20,
            graded: 0,
          },
          assignedStudents: 200,
          unassignedStudents: 60,
          avgStudentsPerLecturer: 0,
          workloadBreakdown: [],
          actionItems: [],
          recentActivities: [],
        }}
      />,
    );

    expect(screen.getByRole("region", { name: "Tổng quan chỉ số" })).toHaveClass(
      "lg:grid-cols-4",
    );
    const cards = screen.getAllByRole("button");
    expect(cards).toHaveLength(4);
    expect(cards[0]).toHaveClass("rounded-xl", "border", "bg-white");
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("260")).toBeInTheDocument();

    fireEvent.click(cards[0]);
    expect(onCardClick).toHaveBeenCalledWith("lecturers");
    expect(container.querySelector(".il-kpi-strip")).toBeNull();
  });
});
