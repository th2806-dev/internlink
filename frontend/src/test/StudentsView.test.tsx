import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { StudentsView } from "../features/lecturer/pages/StudentsView";
import { mapLecturerStudentDtoToStudent } from "../lib/portalMappers";
import type { LecturerStudentListItemDto } from "../types/api";
import type { Student } from "../types/student";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { name: "Trần Văn Giảng Viên", email: "gv@dn.edu.vn" } }),
}));

vi.mock("../contexts/SemesterContext", () => ({
  useSemester: () => ({
    semesters: [],
    selectedSemester: {
      id: "sem-1",
      name: "Học kỳ 1 2026-2027",
      term: "1",
      academicYear: "2026-2027",
    },
    selectSemester: vi.fn(),
  }),
}));

/** Dữ liệu đúng theo DTO backend trả về (`/api/Lecturer/students`). */
function makeDto(overrides: Partial<LecturerStudentListItemDto> = {}): LecturerStudentListItemDto {
  return {
    studentId: "st-1",
    internshipId: "int-1",
    studentCode: "CNTT20001",
    fullName: "Nguyễn Văn An",
    email: "an@student.edu.vn",
    phone: "0900000002",
    class: "CNTT01",
    major: "Khoa học máy tính",
    companyId: "co-1",
    companyName: "Công ty FPT Software",
    position: "Lập trình viên",
    internshipStatus: "InProgress",
    startDate: "2026-08-01T00:00:00Z",
    endDate: "2026-12-31T00:00:00Z",
    weeklyReportCount: 4,
    pendingReportCount: 1,
    submissionCount: 3,
    notes: null,
    finalGrade: null,
    hasEvaluation: false,
    isEvaluationFinalized: false,
    progressPercent: 65,
    progressBreakdown: null,
    ...overrides,
  };
}

/** Map qua đúng pipeline sản xuất: DTO backend -> Student của UI. */
function toStudent(overrides: Partial<LecturerStudentListItemDto> = {}): Student {
  return mapLecturerStudentDtoToStudent(makeDto(overrides), "Trần Văn Giảng Viên");
}

function renderView(props: Partial<React.ComponentProps<typeof StudentsView>> = {}) {
  const ui = (
    <StudentsView students={[toStudent()]} {...props} />
  );
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("StudentsView — /lecturer/students theo UI_DESIGN_SYSTEM.md", () => {
  it("1. Có header chuẩn sub-page, không dùng banner dashboard hoặc KPI cards", () => {
    renderView();

    expect(screen.queryByText("CỔNG THÔNG TIN GIẢNG VIÊN HƯỚNG DẪN")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Danh sách sinh viên" })).toBeInTheDocument();
    expect(document.querySelector(".bg-\\[\\#026aa7\\]")).not.toBeNull();

    // KPI 4 thẻ là độc quyền của /dashboard — cấm tuyệt đối ở /*/students.
    for (const kpi of [
      "Sinh viên phụ trách",
      "Đã có nơi thực tập",
      "Báo cáo cần duyệt",
      "Tiến độ trung bình",
    ]) {
      expect(screen.queryByText(kpi)).not.toBeInTheDocument();
    }

    // Container chuẩn.
    const container = document.querySelector("div.mx-auto.max-w-\\[1300px\\]");
    expect(container).not.toBeNull();
  });

  it("2. Render đúng dữ liệu backend, không có số/fake tự bịa", () => {
    renderView({
      students: [
        toStudent(),
        toStudent({
          studentId: "st-2",
          internshipId: "int-2",
          studentCode: "CNTT20002",
          fullName: "Lê Thị Bình",
          email: null,
          companyName: null,
          position: null,
          internshipStatus: "BehindSchedule",
          progressPercent: 30,
        }),
      ],
    });

    // Họ tên từ DTO.
    expect(screen.getAllByText("Nguyễn Văn An").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lê Thị Bình").length).toBeGreaterThan(0);

    // Doanh nghiệp / vị trí: có giá trị thật thì hiển thị, thiếu thì fallback đúng chuẩn.
    expect(screen.getAllByText("Công ty FPT Software").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chưa phân công doanh nghiệp").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chưa cập nhật").length).toBeGreaterThan(0);

    // Trạng thái map từ internshipStatus backend.
    expect(screen.getAllByText("Đúng tiến độ").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Quá hạn").length).toBeGreaterThan(0);

    // Email thiếu → fallback "—" (không bịa địa chỉ).
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);

    // Tiến độ lấy từ progressPercent của API.
    expect(screen.getAllByText("65%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("30%").length).toBeGreaterThan(0);

    // Đếm tổng = dữ liệu API, không phải số hardcode.
    expect(screen.getByText("2 / 2 sinh viên")).toBeInTheDocument();
  });

  it("3. Empty state đúng chuẩn §8 (icon vòng tròn + text hướng dẫn)", () => {
    renderView({ students: [] });

    // Bản mobile + bản desktop cùng render trong jsdom (chưa áp media query).
    expect(
      screen.getAllByText("Chưa có sinh viên được phân công trong học kỳ này.").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Kiểm tra lại học kỳ đang chọn hoặc làm mới dữ liệu.").length,
    ).toBeGreaterThan(0);
    expect(document.body.innerHTML).toContain("bg-[#026aa7]/5");

    // Không được hiển thị lỗi khi dữ liệu rỗng hợp lệ.
    expect(screen.queryByText("Không thể tải danh sách sinh viên")).not.toBeInTheDocument();
  });

  it("4. Loading → skeleton animate-pulse (chuẩn dashboard), không hiện nội dung rỗng", () => {
    renderView({ isLoading: true });

    expect(document.querySelector(".animate-pulse")).not.toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Đang tải danh sách sinh viên...");
    expect(
      screen.queryAllByText("Chưa có sinh viên được phân công trong học kỳ này."),
    ).toHaveLength(0);
  });

  it("5. Error → khối lỗi đúng chuẩn + nút Thử lại gọi lại API", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn().mockResolvedValue(undefined);

    renderView({ error: "HTTP 500", onRefresh });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Không thể tải danh sách sinh viên")).toBeInTheDocument();
    expect(screen.getByText(/HTTP 500/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    // Lỗi không được phép hiện thị thành "không có dữ liệu".
    expect(
      screen.queryAllByText("Chưa có sinh viên được phân công trong học kỳ này."),
    ).toHaveLength(0);
  });

  it("6. Không dùng màu cấm của bảng §1 (blue/indigo/emerald...)", () => {
    renderView();

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

  it("7. Bộ lọc/tìm kiếm còn nguyên (không lạc nội dung)", async () => {
    const user = userEvent.setup();
    renderView({
      students: [
        toStudent(),
        toStudent({
          studentId: "st-2",
          internshipId: "int-2",
          studentCode: "CNTT20002",
          fullName: "Lê Thị Bình",
          companyName: "Công ty ABC",
        }),
      ],
    });

    expect(
      screen.getAllByText("2 / 2 sinh viên").length,
    ).toBeGreaterThan(0);

    await user.type(screen.getByLabelText("Tìm sinh viên"), "Bình");

    expect(
      screen.getAllByText("1 / 2 sinh viên").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Lê Thị Bình").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Nguyễn Văn An")).toHaveLength(0);
  });

  it("8. Mỗi dòng có nút Xem hồ sơ trỏ tới chi tiết sinh viên", () => {
    renderView();

    const buttons = screen.getAllByRole("button", { name: /Xem hồ sơ/ });
    expect(buttons.length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Tìm sinh viên")).toBeInTheDocument();
    expect(screen.getByText(/Hiển thị .* sinh viên/)).toBeInTheDocument();
  });
});
