import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LecturerHistoryView } from "../features/lecturer/pages/LecturerHistoryView";
import { lecturerHistoryService, type LecturerParticipationHistory } from "../services/lecturerHistory.service";
import {
  lecturerInternshipsService,
  type LecturerSemesterOptionDto,
} from "../services/lecturerInternships.service";

vi.mock("../services/lecturerInternships.service", () => ({
  lecturerInternshipsService: {
    getAssignedSemesters: vi.fn(),
    getStudents: vi.fn(),
  },
}));

vi.mock("../services/lecturerHistory.service", () => ({
  lecturerHistoryService: {
    getSemesterHistory: vi.fn(),
  },
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { name: "Trần Văn Giảng Viên", email: "gv@dn.edu.vn" } }),
}));

vi.mock("../contexts/SemesterContext", () => ({
  useSemester: () => ({
    semesters: [],
    selectedSemesterId: "sem-1",
    selectedSemester: {
      id: "sem-1",
      name: "Học kỳ 1 2026-2027",
      term: "1",
      academicYear: "2026-2027",
    },
    selectSemester: vi.fn(),
  }),
}));

const getAssignedSemesters = vi.mocked(lecturerInternshipsService.getAssignedSemesters);
const getSemesterHistory = vi.mocked(lecturerHistoryService.getSemesterHistory);

const SEMESTERS = [
  { id: "sem-1", name: "Học kỳ 1 2026-2027", term: "1", academicYear: "2026-2027" },
];

/** Đúng shape backend trả về: GET /api/lecturer/history/{semesterId}. */
function makeHistory(
  overrides: Partial<LecturerParticipationHistory> = {},
): LecturerParticipationHistory {
  return {
    semesterId: "sem-1",
    semesterName: "Học kỳ 1 2026-2027",
    generatedAt: "2026-10-01T08:00:00Z",
    lastActivityAt: "2026-09-30T10:30:00Z",
    students: [
      {
        internshipId: "int-1",
        studentId: "st-1",
        studentCode: "CNTT20001",
        studentName: "Nguyễn Văn An",
        className: "CNTT01",
        companyName: "Công ty FPT Software",
        reviewedReportCount: 5,
        finalGrade: 8.6,
        isFinalized: true,
      },
      {
        internshipId: "int-2",
        studentId: "st-2",
        studentCode: "CNTT20002",
        studentName: "Lê Thị Bình",
        className: "CNTT01",
        companyName: null,
        reviewedReportCount: 2,
        finalGrade: null,
        isFinalized: false,
      },
    ],
    activities: [
      {
        id: "act-1",
        studentId: "st-1",
        studentName: "Nguyễn Văn An",
        companyName: "Công ty FPT Software",
        activityType: "weeklyReportApproved",
        title: "Đã duyệt Báo cáo tuần 3",
        detail: "Tiến độ tốt, tiếp tục duy trì.",
        weekNumber: 3,
        occurredAt: "2026-09-30T10:30:00Z",
      },
    ],
    ...overrides,
  };
}

function renderView() {
  return render(
    <MemoryRouter>
      <LecturerHistoryView />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getAssignedSemesters.mockResolvedValue(SEMESTERS);
});

describe("LecturerHistoryView — /lecturer/history theo UI_DESIGN_SYSTEM.md", () => {
  it("1. Không có banner hoặc dải KPI cards trên sub-page", async () => {
    getSemesterHistory.mockResolvedValue(makeHistory());
    renderView();

    expect((await screen.findAllByText("Nguyễn Văn An")).length).toBeGreaterThan(0);

    expect(screen.queryByText("CỔNG THÔNG TIN GIẢNG VIÊN HƯỚNG DẪN")).not.toBeInTheDocument();

    // KPI 4 thẻ bị cấm ở trang con — chỉ được phép ở /*/dashboard.
    expect(document.querySelector('[aria-label="Tổng quan học kỳ"]')).toBeNull();

    // Nhưng KHÔNG mất số liệu: 4 chỉ số vẫn hiển thị dạng text trong header.
    expect(document.body.textContent).toMatch(/2\s*sinh viên/);
    expect(document.body.textContent).toMatch(/1\s*doanh nghiệp/);
    expect(document.body.textContent).toMatch(/7\s*báo cáo đã phản hồi/);
    expect(document.body.textContent).toMatch(/1\s*kết quả đã chốt/);

    // Container chuẩn 1300px.
    expect(document.querySelector("div.mx-auto.max-w-\\[1300px\\]")).not.toBeNull();
  });

  it("2. Render đúng dữ liệu backend trả về (không có số tự bịa)", async () => {
    getSemesterHistory.mockResolvedValue(makeHistory());
    renderView();

    expect((await screen.findAllByText("Nguyễn Văn An")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lê Thị Bình").length).toBeGreaterThan(0);

    // Doanh nghiệp / kết quả / số báo cáo lấy nguyên từ API.
    expect(screen.getAllByText("Công ty FPT Software").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chưa phân doanh nghiệp").length).toBeGreaterThan(0);
    expect(screen.getAllByText("8.6 / 10").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chưa chốt").length).toBeGreaterThan(0);
    expect(screen.getByText(/Đã duyệt Báo cáo tuần 3/)).toBeInTheDocument();

    // Timestamp backend hiển thị theo locale vi-VN (fallback "—" nếu thiếu).
    expect(screen.getAllByText(/Hoạt động gần nhất/).length).toBeGreaterThan(0);
  });

  it("3. Đổi học kỳ → gọi lại đúng API history với semesterId mới", async () => {
    const user = userEvent.setup();
    const semesters = [
      ...SEMESTERS,
      { id: "sem-2", name: "Học kỳ 2 2026-2027", term: "2", academicYear: "2026-2027" },
    ];
    getAssignedSemesters.mockResolvedValue(semesters);
    getSemesterHistory
      .mockResolvedValueOnce(makeHistory())
      .mockResolvedValue(makeHistory({ semesterId: "sem-2", students: [], activities: [] }));
    renderView();

    expect((await screen.findAllByText("Nguyễn Văn An")).length).toBeGreaterThan(0);
    expect(getSemesterHistory).toHaveBeenCalledWith("sem-1");

    await user.selectOptions(screen.getByLabelText("Học kỳ tham gia"), "sem-2");

    expect((await screen.findAllByText("Chưa có sinh viên trong học kỳ này.")).length).toBeGreaterThan(0);
    expect(getSemesterHistory).toHaveBeenLastCalledWith("sem-2");
  });

  it("4. Loading → skeleton animate-pulse (chuẩn dashboard), không hiện dữ liệu rỗng", () => {
    getAssignedSemesters.mockReturnValue(
      new Promise<LecturerSemesterOptionDto[]>(() => {}),
    );
    renderView();

    expect(document.querySelector(".animate-pulse")).not.toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Đang tải lịch sử hướng dẫn…");
    expect(
      screen.queryByText("Chưa có học kỳ hướng dẫn được ghi nhận."),
    ).not.toBeInTheDocument();
  });

  it("5. Error → khối lỗi đúng chuẩn + nút Thử lại gọi lại API", async () => {
    const user = userEvent.setup();
    getSemesterHistory
      .mockRejectedValueOnce(new Error("Lỗi máy chủ"))
      .mockResolvedValue(makeHistory());

    renderView();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Không thể tải lịch sử hướng dẫn");

    // Lỗi không được hiển thị thành "không có dữ liệu".
    expect(
      screen.queryByText("Chưa có học kỳ hướng dẫn được ghi nhận."),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Thử lại" }));

    expect((await screen.findAllByText("Nguyễn Văn An")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("6. Empty state đúng chuẩn §8 (icon vòng tròn + text hướng dẫn)", async () => {
    getSemesterHistory.mockResolvedValue(
      makeHistory({ students: [], activities: [] }),
    );
    renderView();

    expect(
      await screen.findAllByText("Chưa có sinh viên trong học kỳ này."),
    ).not.toHaveLength(0);
    expect(
      screen.getByText("Chưa có hoạt động được lưu cho học kỳ này."),
    ).toBeInTheDocument();
    expect(document.querySelector('div[class*="bg-[#026aa7]/5"]')).not.toBeNull();
  });

  it("7. Tìm kiếm sinh viên vẫn hoạt động (không lạc nội dung)", async () => {
    const user = userEvent.setup();
    getSemesterHistory.mockResolvedValue(makeHistory());
    renderView();

    expect((await screen.findAllByText("Nguyễn Văn An")).length).toBeGreaterThan(0);

    await user.type(
      screen.getByLabelText("Tìm sinh viên theo tên, mã, lớp hoặc doanh nghiệp"),
      "Bình",
    );

    expect(await screen.findByText("1 kết quả phù hợp")).toBeInTheDocument();
    expect(screen.queryAllByText("Nguyễn Văn An")).toHaveLength(0);
  });

  it("8. Không dùng màu cấm của bảng §1", async () => {
    getSemesterHistory.mockResolvedValue(makeHistory());
    renderView();
    await screen.findAllByText("Nguyễn Văn An");

    const html = document.body.innerHTML;
    for (const banned of [
      "#1e40af",
      "#2563eb",
      "#3b82f6",
      "#1d4ed8",
      "#10b981",
      "#22c55e",
      "#0ea5e9",
      "#f97316",
      "#94a3b8",
    ]) {
      expect(html).not.toContain(banned);
    }
  });
});
