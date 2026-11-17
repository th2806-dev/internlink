import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicVerificationView from "../features/public/pages/PublicVerificationView";
import { apiRequestRaw } from "../lib/apiClient";

vi.mock("../lib/apiClient", () => ({
  apiRequestRaw: vi.fn(),
}));

function renderVerification() {
  return render(
    <MemoryRouter initialEntries={["/verify/IL-VERIFY-2026-08124"]}>
      <Routes>
        <Route path="/verify/:code" element={<PublicVerificationView />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PublicVerificationView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the digital verification seal and privacy-limited completion result", async () => {
    vi.mocked(apiRequestRaw).mockResolvedValueOnce({
      referenceCode: "IL-VERIFY-2026-08124",
      verificationType: "Hoàn thành thực tập",
      isAuthentic: true,
      institutionName: "InternLink University",
      verifiedAt: "2026-11-15T00:00:00Z",
      studentName: "Nguyễn An",
      studentCode: "SV001",
      className: "CNTT01",
      major: "Công nghệ thông tin",
      departmentName: "Khoa Kỹ thuật",
      semesterName: "HK1",
      companyName: "Công ty ABC",
      internshipStatus: "Completed",
      resultSummary: "Đạt yêu cầu",
      followUpVerificationCode: null,
    });

    renderVerification();

    expect(await screen.findByRole("img", { name: /Dấu xác thực số InternLink University/ })).toBeInTheDocument();
    expect(screen.getByText("Đạt yêu cầu")).toBeInTheDocument();
    expect(screen.getByText("Nguyễn An")).toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d{9,}/)).not.toBeInTheDocument();
  });

  it("shows a clear message when the reference code cannot be verified", async () => {
    vi.mocked(apiRequestRaw).mockRejectedValueOnce(new Error("Không tìm thấy hồ sơ hợp lệ."));

    renderVerification();

    expect(await screen.findByRole("alert")).toHaveTextContent("Không tìm thấy hồ sơ hợp lệ.");
    expect(apiRequestRaw).toHaveBeenCalledWith(
      "/api/v1/public/verifications/IL-VERIFY-2026-08124",
      expect.objectContaining({ auth: false, skipCache: true }),
    );
  });
});
