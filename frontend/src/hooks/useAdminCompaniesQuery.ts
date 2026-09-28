import { useState, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import { useDebouncedValue } from "./useDebouncedValue";
import {
  adminCompaniesService,
} from "../services/adminCompanies.service";
import { mapCompanyDtoToEnterprise } from "../lib/adminMappers";
import type { Enterprise } from "../types/enterprise";

export const COMPANIES_SEARCH_DEBOUNCE_MS = 350;

export interface UseAdminCompaniesQueryOptions {
  semesterId?: string | null;
  departmentId?: string | null;
  initialPage?: number;
  initialPageSize?: number;
  debounceMs?: number;
}

export function useAdminCompaniesQuery({
  semesterId,
  departmentId,
  initialPage = 1,
  initialPageSize = 10,
  debounceMs = COMPANIES_SEARCH_DEBOUNCE_MS,
}: UseAdminCompaniesQueryOptions = {}) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const debouncedSearch = useDebouncedValue(searchTerm, debounceMs);

  const queryKey = queryKeys.admin.companies.list({
    semesterId: semesterId ?? "all",
    departmentId: departmentId ?? "all",
  });

  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const rows = await adminCompaniesService.getAll(
        0,
        500,
        semesterId && semesterId !== "all" ? semesterId : undefined,
        departmentId && departmentId !== "all" ? departmentId : undefined,
        { signal },
      );
      return rows.map(mapCompanyDtoToEnterprise);
    },
    placeholderData: keepPreviousData,
  });

  const allCompanies = query.data ?? [];

  const statuses = useMemo(
    () => Array.from(new Set(allCompanies.map((c) => c.status))),
    [allCompanies],
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return allCompanies.filter((c) => {
      const matchQ =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.shortCode.toLowerCase().includes(q) ||
        c.field.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "all" || c.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [allCompanies, debouncedSearch, statusFilter]);

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const visiblePage = Math.min(page, totalPages);

  const paginatedCompanies = useMemo(() => {
    const start = (visiblePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSize, visiblePage]);

  const createMutation = useMutation({
    mutationFn: (body: Parameters<typeof adminCompaniesService.create>[0]) =>
      adminCompaniesService.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.companies.all,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof adminCompaniesService.update>[1];
    }) => adminCompaniesService.update(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.companies.all,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminCompaniesService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.companies.all,
      });
    },
  });

  const setSemesterLinkMutation = useMutation({
    mutationFn: ({
      id,
      semId,
      isLinked,
    }: {
      id: string;
      semId: string;
      isLinked: boolean;
    }) => adminCompaniesService.setSemesterLink(id, semId, isLinked),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.companies.all,
      });
    },
  });

  const handleSetSearch = (val: string) => {
    setSearchTerm(val);
    setPage(1);
  };

  const handleSetStatus = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleSetPageSize = (val: number) => {
    setPageSize(val);
    setPage(1);
  };

  return {
    items: paginatedCompanies,
    allItems: allCompanies,
    filteredItems: filtered,
    totalCount,
    totalPages,
    page: visiblePage,
    pageSize,
    goToPage: setPage,
    setPageSize: handleSetPageSize,
    searchTerm,
    setSearchTerm: handleSetSearch,
    statusFilter,
    setStatusFilter: handleSetStatus,
    statuses,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createCompany: createMutation.mutateAsync,
    updateCompany: updateMutation.mutateAsync,
    deleteCompany: deleteMutation.mutateAsync,
    setSemesterLink: setSemesterLinkMutation.mutateAsync,
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      setSemesterLinkMutation.isPending,
  };
}
