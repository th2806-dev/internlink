import { useCallback, useEffect, useState } from "react";
import type { SetStateAction } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "../lib/apiClient";
import {
  buildAssignmentMaps,
  mapLecturerDtoToAssignmentRow,
  mapStudentDtoToAssignmentRow,
} from "../lib/adminMappers";
import { queryKeys } from "../lib/queryKeys";
import { adminAssignmentsService } from "../services/adminAssignments.service";
import { adminLecturersService } from "../services/adminLecturers.service";
import { adminStudentsService } from "../services/adminStudents.service";

export type AssignmentLecturerRow = ReturnType<
  typeof mapLecturerDtoToAssignmentRow
>;
export type AssignmentStudentRow = ReturnType<
  typeof mapStudentDtoToAssignmentRow
>;

interface AssignmentMatrixData {
  lecturers: AssignmentLecturerRow[];
  students: AssignmentStudentRow[];
}
const EMPTY_LECTURERS: AssignmentLecturerRow[] = [];
const EMPTY_STUDENTS: AssignmentStudentRow[] = [];

export function useAdminAssignmentMatrix(
  enabled: boolean,
  semesterId?: string | null,
  onError?: (msg: string) => void,
  departmentId?: string | null,
) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.admin.assignments.matrix({
    semesterId: semesterId && semesterId !== "all" ? semesterId : "all",
    departmentId: departmentId && departmentId !== "all" ? departmentId : "all",
  });
  const [selectedLecturerId, setSelectedLecturerId] = useState<string | null>(null);

  const query = useQuery({
    queryKey,
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AssignmentMatrixData> => {
      const effectiveSemesterId = semesterId && semesterId !== "all" ? semesterId : undefined;
      const effectiveDepartmentId = departmentId && departmentId !== "all" ? departmentId : undefined;
      const [lecturerDtos, studentDtos, allAssignments] = await Promise.all([
        adminLecturersService.getAll(0, 500, effectiveSemesterId, effectiveDepartmentId),
        adminStudentsService.getAll(0, 500, effectiveSemesterId, effectiveDepartmentId),
        adminAssignmentsService.getAll(effectiveSemesterId, effectiveDepartmentId),
      ]);
      const { studentAssignment, lecturerCounts } = buildAssignmentMaps(
        lecturerDtos,
        allAssignments,
      );
      return {
        lecturers: lecturerDtos.map((lecturer) =>
          mapLecturerDtoToAssignmentRow(lecturer, lecturerCounts.get(lecturer.id) ?? 0),
        ),
        students: studentDtos.map((student) =>
          mapStudentDtoToAssignmentRow(student, studentAssignment.get(student.id)),
        ),
      };
    },
  });

  const { data, error: queryError, isPending, refetch } = query;
  const lecturers = data?.lecturers ?? EMPTY_LECTURERS;
  const students = data?.students ?? EMPTY_STUDENTS;

  useEffect(() => {
    if (queryError) onError?.(getApiErrorMessage(queryError));
  }, [onError, queryError]);

  useEffect(() => {
    setSelectedLecturerId((previous) => {
      if (previous && lecturers.some((lecturer) => lecturer.id === previous)) return previous;
      return lecturers[0]?.id ?? null;
    });
  }, [lecturers]);

  const setLecturers = useCallback((value: SetStateAction<AssignmentLecturerRow[]>) => {
    queryClient.setQueryData<AssignmentMatrixData>(queryKey, (current) => {
      if (!current) return current;
      return {
        ...current,
        lecturers: typeof value === "function" ? value(current.lecturers) : value,
      };
    });
  }, [queryClient, queryKey]);
  const setStudents = useCallback((value: SetStateAction<AssignmentStudentRow[]>) => {
    queryClient.setQueryData<AssignmentMatrixData>(queryKey, (current) => {
      if (!current) return current;
      return {
        ...current,
        students: typeof value === "function" ? value(current.students) : value,
      };
    });
  }, [queryClient, queryKey]);
  const reload = useCallback(async () => {
    const result = await refetch();
    if (result.error) onError?.(getApiErrorMessage(result.error));
  }, [onError, refetch]);

  return {
    lecturers,
    students,
    setLecturers,
    setStudents,
    isLoading: isPending,
    error: queryError ? getApiErrorMessage(queryError) : null,
    selectedLecturerId,
    setSelectedLecturerId,
    reload,
  };
}
