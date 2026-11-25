import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SemesterProvider, useSemester } from "../contexts/SemesterContext";

const mocks = vi.hoisted(() => ({
  auth: {
    role: "admin",
    user: {
      id: "super-admin",
      backendRole: "SuperAdmin",
    },
  },
  getSemesters: vi.fn(),
  getDepartments: vi.fn(),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => mocks.auth,
}));

vi.mock("../services/adminSemesters.service", () => ({
  adminSemestersService: {
    getAll: mocks.getSemesters,
  },
  semesterPortalService: {
    getCurrent: vi.fn(),
  },
}));

vi.mock("../services/adminDepartments.service", () => ({
  adminDepartmentsService: {
    getAll: mocks.getDepartments,
    getById: vi.fn(),
  },
}));

vi.mock("../services/lecturerInternships.service", () => ({
  lecturerInternshipsService: {
    getAssignedSemesters: vi.fn(),
  },
}));

function SemesterState() {
  const { semesters, selectedSemesterId } = useSemester();
  return <div data-testid="semester-state">{`${semesters.length}:${selectedSemesterId}`}</div>;
}

describe("SemesterContext", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not request semesters or departments for SuperAdmin", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <SemesterProvider>
          <SemesterState />
        </SemesterProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("semester-state")).toHaveTextContent("0:");
    });
    expect(mocks.getSemesters).not.toHaveBeenCalled();
    expect(mocks.getDepartments).not.toHaveBeenCalled();
  });
});
