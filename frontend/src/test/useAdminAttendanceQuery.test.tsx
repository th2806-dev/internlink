import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useAdminAttendanceQuery } from "../hooks/useAdminAttendanceQuery";
import { attendanceService } from "../services/attendance.service";
import { adminLecturersService } from "../services/adminLecturers.service";
import { adminStudentsService } from "../services/adminStudents.service";
import type { AttendanceSessionDto, AttendanceSessionDetailDto } from "../types/api";

vi.mock("../services/attendance.service", () => ({
  attendanceService: {
    getLecturerSessions: vi.fn(),
    getSessionDetail: vi.fn(),
    createSession: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
    markAttendance: vi.fn(),
  },
}));

vi.mock("../services/adminLecturers.service", () => ({
  adminLecturersService: {
    getAll: vi.fn(),
  },
}));

vi.mock("../services/adminStudents.service", () => ({
  adminStudentsService: {
    getAll: vi.fn(),
  },
}));

const mockSessions: AttendanceSessionDto[] = [
  {
    id: "session-1",
    semesterId: "sem-1",
    lecturerId: "lec-1",
    weekNumber: 1,
    title: "Buổi sinh hoạt khoa đầu kỳ",
    description: "Gặp gỡ toàn bộ sinh viên khoa",
    meetingDate: "2026-02-01T09:00:00Z",
    durationMinutes: 90,
    location: "Hội trường A",
    semesterName: "Học kỳ I",
    lecturerName: "TS. Nguyễn Văn A",
    status: "Scheduled",
    isLecturerOnly: false,
    totalStudents: 120,
    presentCount: 115,
    absentCount: 5,
    attendanceRate: 95.8,
    createdAt: "2026-01-20T00:00:00Z",
  },
];

describe("useAdminAttendanceQuery", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("fetches sessions for the active semester with AbortSignal", async () => {
    vi.mocked(attendanceService.getLecturerSessions).mockResolvedValue(mockSessions);
    vi.mocked(adminLecturersService.getAll).mockResolvedValue([{
        id: "lec-1",
        staffCode: "GV01",
        fullName: "TS. Nguyễn Văn A",
        createdAt: "2026-01-01T00:00:00Z",
        departmentId: "dept-1",
      }]);
    vi.mocked(adminStudentsService.getAll).mockResolvedValue([
      { id: "stu-1", fullName: "Lê Văn C", studentCode: "SV01", createdAt: "2026-01-01T00:00:00Z" },
    ]);

    const { result } = renderHook(
      () =>
        useAdminAttendanceQuery({
          semesterId: "sem-1",
          departmentId: "dept-1",
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(attendanceService.getLecturerSessions).toHaveBeenCalledWith(
      "sem-1",
      undefined,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].title).toBe("Buổi sinh hoạt khoa đầu kỳ");
  });

  it("creates a department meeting session and invalidates sessions cache", async () => {
    vi.mocked(attendanceService.getLecturerSessions).mockResolvedValue(mockSessions);
    vi.mocked(adminLecturersService.getAll).mockResolvedValue([]);
    vi.mocked(adminStudentsService.getAll).mockResolvedValue([]);
    vi.mocked(attendanceService.createSession).mockResolvedValue({
      id: "session-2",
      semesterId: "sem-1",
      semesterName: "Học kỳ I",
      lecturerId: "lec-1",
      lecturerName: "TS. Nguyễn Văn A",
      weekNumber: 1,
      title: "Họp triển khai thực tập",
      meetingDate: "2026-02-05T08:00:00Z",
      status: "Scheduled",
      isLecturerOnly: false,
      totalStudents: 2,
      presentCount: 0,
      absentCount: 0,
      attendanceRate: 0,
      createdAt: "2026-01-20T00:00:00Z",
      records: [],
    });

    const { result } = renderHook(
      () =>
        useAdminAttendanceQuery({
          semesterId: "sem-1",
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createSession({
        semesterId: "sem-1",
        lecturerId: "lec-1",
        weekNumber: 1,
        title: "Họp triển khai thực tập",
        meetingDate: "2026-02-05T08:00:00Z",
        studentIds: ["stu-1", "stu-2"],
      });
    });

    expect(attendanceService.createSession).toHaveBeenCalledWith({
      semesterId: "sem-1",
      lecturerId: "lec-1",
      weekNumber: 1,
      title: "Họp triển khai thực tập",
      meetingDate: "2026-02-05T08:00:00Z",
      studentIds: ["stu-1", "stu-2"],
    });
  });

  it("marks attendance directly and invalidates detail query", async () => {
    vi.mocked(attendanceService.getLecturerSessions).mockResolvedValue(mockSessions);
    vi.mocked(adminLecturersService.getAll).mockResolvedValue([]);
    vi.mocked(adminStudentsService.getAll).mockResolvedValue([]);
    vi.mocked(attendanceService.markAttendance).mockResolvedValue({
      ...mockSessions[0],
      records: [],
    } as AttendanceSessionDetailDto);

    const { result } = renderHook(
      () =>
        useAdminAttendanceQuery({
          semesterId: "sem-1",
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.markAttendance({
        id: "session-1",
        dto: {
          records: [
            {
              studentId: "stu-1",
              status: "Present",
              notes: "Có mặt đúng giờ",
            },
          ],
        },
      });
    });

    expect(attendanceService.markAttendance).toHaveBeenCalledWith("session-1", {
      records: [
        {
          studentId: "stu-1",
          status: "Present",
          notes: "Có mặt đúng giờ",
        },
      ],
    });
  });
});
