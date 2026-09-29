import { useState, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import { useDebouncedValue } from "./useDebouncedValue";
import { attendanceService } from "../services/attendance.service";
import { adminLecturersService } from "../services/adminLecturers.service";
import { adminStudentsService } from "../services/adminStudents.service";
import type {
  AttendanceSessionDto,
  CreateAttendanceSessionDto,
  UpdateAttendanceSessionDto,
  MarkAttendanceDto,
  LecturerDto,
  StudentDto,
} from "../types/api";

export interface UseAdminAttendanceQueryOptions {
  semesterId?: string | null;
  departmentId?: string | null;
  debounceMs?: number;
}

export function useAdminAttendanceQuery({
  semesterId,
  departmentId,
  debounceMs = 300,
}: UseAdminAttendanceQueryOptions = {}) {
  const queryClient = useQueryClient();

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [weekFilter, setWeekFilter] = useState<string>("all");
  const [lecturerFilter, setLecturerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const debouncedSearch = useDebouncedValue(searchTerm, debounceMs);

  const semId = semesterId && semesterId !== "all" ? semesterId : undefined;
  const deptId = departmentId && departmentId !== "all" ? departmentId : undefined;

  // 1. Fetch department sessions
  const sessionsQueryKey = queryKeys.admin.attendance.list({
    semesterId: semId ?? "all",
    lecturerId: lecturerFilter !== "all" ? lecturerFilter : "all",
  });

  const sessionsQuery = useQuery({
    queryKey: sessionsQueryKey,
    queryFn: async ({ signal }) => {
      if (!semId) return [];
      return attendanceService.getLecturerSessions(
        semId,
        lecturerFilter !== "all" ? lecturerFilter : undefined,
        { signal }
      );
    },
    enabled: Boolean(semId),
    placeholderData: keepPreviousData,
  });

  // 2. Fetch lecturers in department for assignment and filter
  const lecturersQueryKey = queryKeys.admin.lecturers.list({
    semesterId: semId ?? "all",
    departmentId: deptId ?? "all",
  });

  const lecturersQuery = useQuery<LecturerDto[]>({
    queryKey: lecturersQueryKey,
    queryFn: async () => {
      return adminLecturersService.getAll(0, 500, semId, deptId);
    },
    staleTime: 5 * 60 * 1000,
  });

  // 3. Fetch students in department for bulk selection
  const studentsQueryKey = queryKeys.admin.students.list({
    semesterId: semId ?? "all",
    departmentId: deptId ?? "all",
    scope: "attendance",
  });

  const studentsQuery = useQuery<StudentDto[]>({
    queryKey: studentsQueryKey,
    queryFn: async () => {
      return adminStudentsService.getAll(0, 3000, semId, deptId);
    },
    enabled: Boolean(semId),
    staleTime: 5 * 60 * 1000,
  });

  // Lecturer map by ID for fast lookup
  const lecturerMap = useMemo(() => {
    const map = new Map<string, LecturerDto>();
    for (const lec of lecturersQuery.data ?? []) {
      map.set(lec.id, lec);
    }
    return map;
  }, [lecturersQuery.data]);

  const allSessions: AttendanceSessionDto[] = sessionsQuery.data ?? [];

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return allSessions.filter((session) => {
      // Search by title, presiding lecturer name, or location
      const matchQ =
        !q ||
        session.title.toLowerCase().includes(q) ||
        (session.lecturerName &&
          session.lecturerName.toLowerCase().includes(q)) ||
        (session.location && session.location.toLowerCase().includes(q));

      // Week filter
      const matchWeek =
        weekFilter === "all" || String(session.weekNumber) === weekFilter;

      // Status filter
      const matchStatus =
        statusFilter === "all" || session.status === statusFilter;

      // Lecturer filter
      const matchLecturer =
        lecturerFilter === "all" || session.lecturerId === lecturerFilter;

      return matchQ && matchWeek && matchStatus && matchLecturer;
    });
  }, [allSessions, debouncedSearch, weekFilter, statusFilter, lecturerFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = allSessions.length;
    const scheduled = allSessions.filter((s) => s.status === "Scheduled").length;
    const completed = allSessions.filter((s) => s.status === "Completed").length;
    const avgRate =
      completed > 0
        ? Math.round(
            allSessions
              .filter((s) => s.status === "Completed")
              .reduce((sum, s) => sum + s.attendanceRate, 0) / completed
          )
        : 0;

    return {
      total,
      scheduled,
      completed,
      avgRate,
    };
  }, [allSessions]);

  // Available weeks from data
  const availableWeeks = useMemo(() => {
    const set = new Set<number>();
    for (const s of allSessions) {
      set.add(s.weekNumber);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [allSessions]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (dto: CreateAttendanceSessionDto) =>
      attendanceService.createSession(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.attendance.all,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: UpdateAttendanceSessionDto;
    }) => attendanceService.updateSession(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.attendance.all,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => attendanceService.deleteSession(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.attendance.all,
      });
    },
  });

  const markAttendanceMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: MarkAttendanceDto }) =>
      attendanceService.markAttendance(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.attendance.all,
      });
    },
  });

  return {
    sessions: filteredSessions,
    allSessions,
    stats,
    availableWeeks,
    lecturers: lecturersQuery.data ?? [],
    students: studentsQuery.data ?? [],
    lecturerMap,
    // Filters & Setters
    searchTerm,
    setSearchTerm,
    weekFilter,
    setWeekFilter,
    lecturerFilter,
    setLecturerFilter,
    statusFilter,
    setStatusFilter,
    // Loading states
    isLoading: sessionsQuery.isLoading,
    isFetching: sessionsQuery.isFetching,
    isError: sessionsQuery.error !== null,
    error: sessionsQuery.error,
    refetch: sessionsQuery.refetch,
    // Mutations
    createSession: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateSession: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteSession: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    markAttendance: markAttendanceMutation.mutateAsync,
    isMarking: markAttendanceMutation.isPending,
    // Helper to fetch details
    getSessionDetail: attendanceService.getSessionDetail,
  };
}
