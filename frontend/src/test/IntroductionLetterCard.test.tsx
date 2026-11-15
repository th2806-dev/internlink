import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStudentPortal } from "../contexts/StudentPortalContext";
import { studentPortalService } from "../services/studentPortal.service";
import { IntroductionLetterCard } from "../features/student/components/IntroductionLetterCard";
import type { StudentIntroductionLetterDto } from "../types/api";

vi.mock("../contexts/StudentPortalContext", () => ({
  useStudentPortal: vi.fn(),
}));

vi.mock("../services/studentPortal.service", () => ({
  studentPortalService: {
    getIntroductionLetter: vi.fn(),
  },
}));

const introductionLetter: StudentIntroductionLetterDto = {
  referenceCode: "IL-ACC-2026-08124",
  token: "protected-url-safe-token",
  expiresAt: "2026-12-01T00:00:00Z",
  studentName: "Nguyen Van A",
  studentCode: "SV001",
  className: "CNTT01",
  major: "Computer Science",
  departmentName: "Information Technology",
  companyName: "Example Company",
  position: "Software Intern",
  lecturerName: "Lecturer",
  semesterName: "Semester 1",
  internshipStartDate: "2026-09-01T00:00:00Z",
  internshipEndDate: "2026-12-01T00:00:00Z",
};

describe("IntroductionLetterCard", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderCard = () => render(
    <QueryClientProvider client={queryClient}>
      <IntroductionLetterCard />
    </QueryClientProvider>,
  );

  it("generates a protected acceptance QR and exposes a PDF action", async () => {
    vi.mocked(useStudentPortal).mockReturnValue({
      internship: { id: "internship-1", companyId: "company-1" },
    } as ReturnType<typeof useStudentPortal>);
    vi.mocked(studentPortalService.getIntroductionLetter).mockResolvedValue(introductionLetter);

    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Tạo giấy giới thiệu" }));

    expect(await screen.findByText("IL-ACC-2026-08124")).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: /Mã QR liên kết tiếp nhận hồ sơ/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tải PDF" })).toBeEnabled();
    expect(screen.getByText(/\/accept\/protected-url-safe-token/)).toBeInTheDocument();
    expect(studentPortalService.getIntroductionLetter).toHaveBeenCalledOnce();
  });

  it("does not issue a letter before a company is assigned", async () => {
    vi.mocked(useStudentPortal).mockReturnValue({
      internship: { id: "internship-1", companyId: null },
    } as ReturnType<typeof useStudentPortal>);
    renderCard();

    expect(screen.getByRole("button", { name: "Tạo giấy giới thiệu" })).toBeDisabled();
    expect(screen.getByText(/sau khi bạn được phân công doanh nghiệp/)).toBeInTheDocument();
    await waitFor(() => expect(studentPortalService.getIntroductionLetter).not.toHaveBeenCalled());
  });

  it("shows a clear error when the introduction letter request fails", async () => {
    vi.mocked(useStudentPortal).mockReturnValue({
      internship: { id: "internship-1", companyId: "company-1" },
    } as ReturnType<typeof useStudentPortal>);
    vi.mocked(studentPortalService.getIntroductionLetter).mockRejectedValue(
      new Error("Không thể tạo giấy giới thiệu."),
    );

    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Tạo giấy giới thiệu" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể tạo giấy giới thiệu.");
  });
});
