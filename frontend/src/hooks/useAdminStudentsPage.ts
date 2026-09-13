import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "../lib/apiClient";
import {
  buildAssignmentMaps,
  mapStudentDtoToRow,
} from "../lib/adminMappers";
import { adminAssignmentsService } from "../services/adminAssignments.service";
import { adminLecturersService } from "../services/adminLecturers.service";
import { adminStudentsService } from "../services/adminStudents.service";
import { adminUsersService } from "../services/adminUsers.service";

export type AdminStudentRow = ReturnType<typeof mapStudentDtoToRow>;

export function useAdminStudentsPage(
  semesterId?: string | null,
  onError?: (msg: string) => void,
  departmentId?: string | null,
) {
  const [students, setStudents] = useState<AdminStudentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const effectiveDepartmentId = departmentId === "all" || !departmentId ? undefined : departmentId;
      const [studentRows, lecturerRows, usersPage, allAssignments] =
        await Promise.all([
          adminStudentsService.getAll(0, 500, semesterId ?? undefined, effectiveDepartmentId),
          adminLecturersService.getAll(0, 500, undefined, effectiveDepartmentId),
          adminUsersService.getAll({ take: 500, role: "Student" }),
          adminAssignmentsService
            .getAll(semesterId ?? undefined, effectiveDepartmentId)
            .catch(() => []),
        ]);

      const { studentAssignment } = buildAssignmentMaps(
        lecturerRows,
        allAssignments,
      );

      const usersById = new Map(
        usersPage.items.map((u) => [u.id, u]),
      );

      setStudents(
        studentRows.map((s) => {
          const assignment = studentAssignment.get(s.id);
          const user = s.userId ? usersById.get(s.userId) ?? null : null;
          return mapStudentDtoToRow(s, {
            assignment: assignment
              ? {
                  lecturerName: assignment.lecturerName,
                  companyName: assignment.companyName,
                  status: assignment.status,
                }
              : undefined,
            user,
          });
        }),
      );
    } catch (err) {
      onError?.(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [semesterId, onError, departmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { students, setStudents, isLoading, reload: load };
}
