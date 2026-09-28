import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useAdminCompaniesQuery } from "../hooks/useAdminCompaniesQuery";
import { adminCompaniesService } from "../services/adminCompanies.service";
import type { CompanyDto } from "../types/api";

vi.mock("../services/adminCompanies.service", () => ({
  adminCompaniesService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    setSemesterLink: vi.fn(),
  },
}));

const mockCompanies: CompanyDto[] = [
  {
    id: "comp-1",
    companyName: "FPT Software",
    industry: "IT",
    contactEmail: "fpt@fpt.com",
    contactPerson: "Nguyen Van A",
    isActive: true,
    capacity: 20,
    currentInternCount: 5,
    isLinked: true,
  },
  {
    id: "comp-2",
    companyName: "Viettel",
    industry: "Telecom",
    contactEmail: "contact@viettel.vn",
    contactPerson: "Tran Van B",
    isActive: true,
    capacity: 50,
    currentInternCount: 15,
    isLinked: false,
  },
];

describe("useAdminCompaniesQuery", () => {
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

  it("fetches companies with AbortSignal and maps to Enterprise objects", async () => {
    vi.mocked(adminCompaniesService.getAll).mockResolvedValue(mockCompanies);

    const { result } = renderHook(
      () =>
        useAdminCompaniesQuery({
          semesterId: "sem-1",
          departmentId: "dept-1",
          debounceMs: 0,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0].name).toBe("FPT Software");
    expect(result.current.items[1].name).toBe("Viettel");
    expect(adminCompaniesService.getAll).toHaveBeenCalledWith(
      0,
      500,
      "sem-1",
      "dept-1",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("filters companies by search term and status", async () => {
    vi.mocked(adminCompaniesService.getAll).mockResolvedValue(mockCompanies);

    const { result } = renderHook(
      () =>
        useAdminCompaniesQuery({
          semesterId: "sem-1",
          debounceMs: 0,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setSearchTerm("viettel");
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].name).toBe("Viettel");
  });

  it("creates company and invalidates cache", async () => {
    vi.mocked(adminCompaniesService.getAll).mockResolvedValue(mockCompanies);
    vi.mocked(adminCompaniesService.create).mockResolvedValue(mockCompanies[0]);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () =>
        useAdminCompaniesQuery({
          semesterId: "sem-1",
          debounceMs: 0,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createCompany({
        companyName: "New Corp",
      });
    });

    expect(adminCompaniesService.create).toHaveBeenCalledWith({
      companyName: "New Corp",
    });
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["admin", "companies"],
      }),
    );
  });

  it("deletes company and invalidates cache", async () => {
    vi.mocked(adminCompaniesService.getAll).mockResolvedValue(mockCompanies);
    vi.mocked(adminCompaniesService.delete).mockResolvedValue(undefined);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () =>
        useAdminCompaniesQuery({
          semesterId: "sem-1",
          debounceMs: 0,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteCompany("comp-1");
    });

    expect(adminCompaniesService.delete).toHaveBeenCalledWith("comp-1");
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["admin", "companies"],
      }),
    );
  });
});
