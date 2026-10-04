import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminAssignmentMatrix } from "../hooks/useAdminAssignmentMatrix";
import { adminAssignmentsService } from "../services/adminAssignments.service";
import { adminLecturersService } from "../services/adminLecturers.service";
import { adminStudentsService } from "../services/adminStudents.service";

vi.mock("../services/adminAssignments.service", () => ({
  adminAssignmentsService: {
    getAll: vi.fn(),
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

describe("useAdminAssignmentMatrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminLecturersService.getAll).mockResolvedValue([]);
    vi.mocked(adminStudentsService.getAll).mockResolvedValue([]);
  });

  it("surfaces assignment-load errors and clears them after a successful retry", async () => {
    const onError = vi.fn();
    vi.mocked(adminAssignmentsService.getAll)
      .mockRejectedValueOnce(new Error("Assignment service unavailable"))
      .mockResolvedValueOnce([]);

    const { result } = renderHook(() =>
      useAdminAssignmentMatrix(true, "semester-1", onError),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("Assignment service unavailable");
    expect(onError).toHaveBeenCalledWith("Assignment service unavailable");

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
