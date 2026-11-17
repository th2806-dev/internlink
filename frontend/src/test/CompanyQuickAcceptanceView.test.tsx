import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CompanyQuickAcceptanceView from "../features/public/pages/CompanyQuickAcceptanceView";
import { apiRequestRaw } from "../lib/apiClient";

vi.mock("../lib/apiClient", () => ({
  apiRequestRaw: vi.fn(),
}));

const preview = {
  referenceCode: "IL-ACC-2026-08124",
  studentName: "Nguyễn An",
  studentCode: "SV001",
  className: "CNTT01",
  major: "Công nghệ thông tin",
  departmentName: "Khoa Kỹ thuật",
  companyName: "Công ty ABC",
  position: "Thực tập sinh",
  semesterName: "HK1",
  status: "NotStarted",
  startDate: "2026-12-01T00:00:00Z",
  endDate: "2027-03-01T00:00:00Z",
  expiresAt: "2026-12-15T00:00:00Z",
};

function renderAcceptance() {
  return render(
    <MemoryRouter initialEntries={["/accept/protected-token"]}>
      <Routes>
        <Route path="/accept/:token" element={<CompanyQuickAcceptanceView />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CompanyQuickAcceptanceView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("verifies the protected link and confirms mentor details and internship dates", async () => {
    vi.mocked(apiRequestRaw)
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce({
        studentName: "Nguyễn An",
        studentCode: "SV001",
        companyName: "Công ty ABC",
        mentorName: "Trần Minh",
        status: "InProgress",
        confirmedAt: "2026-11-15T00:00:00Z",
      });

    renderAcceptance();
    expect(await screen.findByText("Nguyễn An")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Họ tên mentor"), { target: { value: "Trần Minh" } });
    fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value: "0901234567" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "mentor@example.com" } });
    fireEvent.change(screen.getByLabelText("Bộ phận / phòng ban"), { target: { value: "Kỹ thuật" } });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận tiếp nhận sinh viên thực tập" }));

    expect(await screen.findByText("Đã xác nhận tiếp nhận")).toBeInTheDocument();
    expect(apiRequestRaw).toHaveBeenLastCalledWith(
      "/api/v1/public/internship-acceptance/confirm",
      expect.objectContaining({
        method: "POST",
        auth: false,
        body: expect.objectContaining({
          token: "protected-token",
          mentorEmail: "mentor@example.com",
          mentorDepartment: "Kỹ thuật",
          startDate: "2026-12-01T00:00:00.000Z",
        }),
      }),
    );
  });

  it("shows an expired-link message when verification fails", async () => {
    vi.mocked(apiRequestRaw).mockRejectedValueOnce(new Error("Liên kết đã hết hạn."));

    renderAcceptance();

    expect(await screen.findByRole("alert")).toHaveTextContent("Liên kết đã hết hạn.");
    expect(screen.getByText(/yêu cầu sinh viên tạo liên kết mới/)).toBeInTheDocument();
  });
});
