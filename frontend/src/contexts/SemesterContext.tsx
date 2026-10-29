import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { adminSemestersService, semesterPortalService, type BackendSemesterDto } from "../services/adminSemesters.service";
import { adminDepartmentsService } from "../services/adminDepartments.service";
import { lecturerInternshipsService } from "../services/lecturerInternships.service";
import { ApiClientError, getStoredToken } from "../lib/apiClient";
import { queryKeys } from "../lib/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";

export interface Semester {
  id: string;
  name: string;
  term: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  lecturersCount: number;
  studentsCount: number;
  placedStudents: number;
  companiesCount: number;
  onTimeSubmissionRate?: number | null;
  status: "active" | "upcoming" | "completed" | "draft";
  progressPercent: number;
  totalWeeks: number;
  /**
   * Tuần TUYỆT ĐỐI của học kỳ trường nơi Tuần thực tập 1 bắt đầu
   * (vd 14 → thực tập tuần 1..6 = tuần 14..19 của học kỳ). 1 = không lệch.
   */
  internshipStartWeek: number;
  /** Chỉ tiêu sinh viên dự kiến do admin khoa nhập khi tạo kỳ (0 = chưa đặt). */
  targetStudents?: number;
  currentPhase: string;
  description: string;
}

export interface DepartmentOption {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
}

const DEFAULT_SEMESTERS: Semester[] = [];

const mapBackendToFrontend = (dto: BackendSemesterDto): Semester => {
  const statusMap: Record<number, Semester["status"]> = {
    0: "upcoming",
    1: "active",
    2: "completed",
    3: "draft",
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    try {
      const date = new Date(d);
      return date.toLocaleDateString("vi-VN");
    } catch {
      return d;
    }
  };

  return {
    id: dto.id,
    name: dto.name,
    term: dto.term,
    academicYear: dto.academicYear,
    startDate: formatDate(dto.startDate),
    endDate: formatDate(dto.endDate),
    lecturersCount: dto.lecturersCount,
    studentsCount: dto.studentsCount,
    placedStudents: dto.placedStudents,
    companiesCount: dto.companiesCount,
    onTimeSubmissionRate: dto.onTimeSubmissionRate,
    status: statusMap[dto.status] || "upcoming",
    progressPercent: dto.progressPercent,
    totalWeeks: dto.totalWeeks,
    internshipStartWeek: dto.internshipStartWeek || 1,
    targetStudents: dto.targetStudents || 0,
    currentPhase: dto.currentPhase,
    description: dto.description || "",
  };
};

interface SemesterContextType {
  semesters: Semester[];
  selectedSemesterId: string;
  selectedSemester: Semester;
  /** The ID of the currently active semester (status=1), or empty string if none. */
  activeSemesterId: string;
  departments: DepartmentOption[];
  selectedDepartmentId: string;
  selectedDepartment: DepartmentOption;
  selectSemester: (id: string) => void;
  selectDepartment: (id: string) => void;
  createSemester: (data: Partial<Semester> & { name: string; term: string; academicYear: string }) => Promise<void>;
  updateSemester: (id: string, data: Partial<Semester> & { name: string; term: string; academicYear: string }, onShowToast?: (msg: string) => void) => Promise<boolean>;
  startSemester: (id: string, onShowToast?: (msg: string) => void) => Promise<void>;
  reopenSemester: (id: string, onShowToast?: (msg: string) => void) => Promise<void>;
  closeSemester: (
    id: string,
    lockStudentAccounts: boolean,
    onShowToast?: (msg: string) => void,
  ) => Promise<void>;
  duplicateSemester: (sem: Semester, onShowToast?: (msg: string) => void) => void;
  refreshApiCounts: () => Promise<void>;
}

const SemesterContext = createContext<SemesterContextType | undefined>(undefined);

/**
 * Convert selectedSemesterId to a value safe for API query params.
 * Returns undefined when "all" or empty, otherwise the real GUID.
 */
export function toApiSemesterId(id: string | undefined | null): string | undefined {
  if (!id || id === "all") return undefined;
  return id;
}

export function toApiDepartmentId(id: string | undefined | null): string | undefined {
  if (!id || id === "all") return undefined;
  return id;
}

export const SemesterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [semesters, setSemesters] = useState<Semester[]>(DEFAULT_SEMESTERS);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("all");
  const backendRole = user?.backendRole;

  const refreshApiCounts = useCallback(async () => {
    // Wait for AuthProvider to resolve the token before choosing the portal endpoint.
    if (!getStoredToken() || !role) return;
    try {
      const result = await queryClient.fetchQuery({
        queryKey: queryKeys.semesters.list({
          role,
          backendRole: backendRole ?? "",
          userId: user?.id ?? user?.username ?? "anonymous",
          departmentId: selectedDepartmentId ?? "all",
        }),
        staleTime: 10 * 60 * 1000,
        queryFn: async () => {
          if (role === "admin") {
            const backendSemesters = await adminSemestersService.getAll(
              selectedDepartmentId && selectedDepartmentId !== "all"
                ? selectedDepartmentId
                : undefined,
              backendRole,
            );
            return {
              semesters: backendSemesters.map(mapBackendToFrontend),
              selectedSemesterId: null,
            };
          }

          if (role === "lecturer" && backendRole === "Lecturer") {
            try {
              const assigned = await lecturerInternshipsService.getAssignedSemesters();
              if (assigned.length > 0) {
                const mapped = assigned.map((dto) => ({
                  id: dto.id,
                  name: dto.name,
                  term: dto.term,
                  academicYear: dto.academicYear,
                  startDate: dto.startDate
                    ? new Date(dto.startDate).toLocaleDateString("vi-VN")
                    : "—",
                  endDate: dto.endDate
                    ? new Date(dto.endDate).toLocaleDateString("vi-VN")
                    : "—",
                  lecturersCount: 0,
                  studentsCount: 0,
                  placedStudents: 0,
                  companiesCount: 0,
                  status: "active" as const,
                  progressPercent: 0,
                  totalWeeks: 6,
                  internshipStartWeek: 1,
                  targetStudents: 0,
                  currentPhase: "",
                  description: "",
                }));
                return {
                  semesters: mapped,
                  selectedSemesterId: mapped[0]?.id ?? "",
                };
              }
            } catch (error) {
              console.warn("Failed to load assigned semesters for lecturer:", error);
            }
          }

          const currentSemester = await semesterPortalService.getCurrent().catch(() => null);
          const mappedSemester = currentSemester
            ? mapBackendToFrontend(currentSemester)
            : null;
          return {
            semesters: mappedSemester ? [mappedSemester] : [],
            selectedSemesterId: mappedSemester?.id ?? "",
          };
        },
      });
      setSemesters(result.semesters);
      if (result.selectedSemesterId !== null) {
        setSelectedSemesterId((previous) =>
          role === "lecturer" && previous && result.semesters.some((item) => item.id === previous)
            ? previous
            : result.selectedSemesterId ?? "",
        );
      }
    } catch (err) {
      console.warn("Error refreshing semester API counts:", err);
    }
  }, [role, selectedDepartmentId, backendRole, queryClient, user]);

  useEffect(() => {
    void refreshApiCounts();
  }, [refreshApiCounts]);

  const refreshSemesterCache = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.semesters.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboardAll });
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.navStatsAll });
    await refreshApiCounts();
  }, [queryClient, refreshApiCounts]);

  useEffect(() => {
    try {
      localStorage.setItem("internlink_admin_semesters", JSON.stringify(semesters));
    } catch {}
  }, [semesters]);

  useEffect(() => {
    if (semesters.length > 0 && (selectedSemesterId === "all" || !selectedSemesterId || !semesters.some((s) => s.id === selectedSemesterId))) {
      const active = semesters.find((s) => s.status === "active");
      const withStudents = semesters.find((s) => s.studentsCount > 0);
      const best = active || withStudents || semesters[0];
      if (best) setSelectedSemesterId(role === "admin" ? "all" : best.id);
    }
  }, [semesters, selectedSemesterId, role]);

  useEffect(() => {
    try {
      localStorage.setItem("internlink_admin_selected_semester_id", selectedSemesterId || "all");
    } catch {}
  }, [selectedSemesterId]);

  useEffect(() => {
    try {
      localStorage.setItem("internlink_admin_selected_department_id", selectedDepartmentId || "all");
    } catch {}
  }, [selectedDepartmentId]);

  useEffect(() => {
    let cancelled = false;

    const loadDepartments = async () => {
      if (role !== "admin") {
        if (!cancelled) {
          setDepartments([]);
          setSelectedDepartmentId("all");
        }
        return;
      }

      try {
        const result = await queryClient.fetchQuery({
          queryKey: queryKeys.departments.list({
            backendRole: user?.backendRole ?? "",
            userId: user?.id ?? user?.username ?? "anonymous",
          }),
          staleTime: 10 * 60 * 1000,
          queryFn: async () => {
            if (user?.backendRole === "DepartmentAdmin" && user.departmentId) {
              const dept = await adminDepartmentsService.getById(
                user.departmentId,
                user.backendRole,
              );
              return {
                departments: [{
                  id: dept.id,
                  name: dept.name,
                  code: dept.code,
                  description: dept.description,
                  isActive: dept.isActive,
                }],
                departmentId: dept.id,
              };
            }

            const backendDepartments = await adminDepartmentsService.getAll(
              user?.backendRole,
            );
            return {
              departments: backendDepartments
                .filter((department) => department.isActive)
                .map((department) => ({
                  id: department.id,
                  name: department.name,
                  code: department.code,
                  description: department.description,
                  isActive: department.isActive,
                })),
              departmentId: null,
            };
          },
        });
        if (!cancelled) {
          setDepartments(result.departments);
          setSelectedDepartmentId((previous) =>
            result.departmentId ?? (previous && previous !== "all" ? previous : "all"),
          );
        }
      } catch (err) {
        console.warn("Error loading departments for admin header filter:", err);
        if (!cancelled) {
          setDepartments([]);
          setSelectedDepartmentId("all");
        }
      }
    };

    void loadDepartments();
    return () => {
      cancelled = true;
    };
  }, [role, user?.backendRole, user?.departmentId, user?.id, user?.username, queryClient]);

  const activeSemesterId = semesters.find((s) => s.status === "active")?.id ?? "";

  const selectedSemester =
    selectedSemesterId === "all"
      ? {
          id: "all",
          name: "Tất cả học kỳ",
          term: "",
          academicYear: "",
          startDate: "",
          endDate: "",
          lecturersCount: semesters.reduce((sum, s) => sum + s.lecturersCount, 0),
          studentsCount: semesters.reduce((sum, s) => sum + s.studentsCount, 0),
          placedStudents: semesters.reduce((sum, s) => sum + s.placedStudents, 0),
          companiesCount: semesters.reduce((sum, s) => sum + s.companiesCount, 0),
          status: "active" as const,
          progressPercent: 0,
          totalWeeks: semesters.reduce((max, s) => Math.max(max, s.totalWeeks), 6),
          internshipStartWeek: semesters[0]?.internshipStartWeek || 1,
          currentPhase: "",
          description: "",
        }
      : semesters.find((s) => s.id === selectedSemesterId) ||
        semesters.find((s) => s.status === "active") ||
        semesters[0] ||
        {
          id: "",
          name: "Đang tải…",
          term: "",
          academicYear: "",
          startDate: "",
          endDate: "",
          lecturersCount: 0,
          studentsCount: 0,
          placedStudents: 0,
          companiesCount: 0,
          status: "upcoming" as const,
          progressPercent: 0,
          totalWeeks: 6,
          internshipStartWeek: 1,
          currentPhase: "",
          description: "",
        };

  const selectedDepartment =
    selectedDepartmentId === "all"
      ? {
          id: "all",
          name: "Tất cả khoa",
          code: "ALL",
          description: "",
          isActive: true,
        }
      : departments.find((d) => d.id === selectedDepartmentId) ||
        {
          id: selectedDepartmentId,
          name: "Khoa đang chọn",
          code: "",
          description: "",
          isActive: true,
        };

  const selectSemester = (id: string) => {
    setSelectedSemesterId(id);
  };

  const selectDepartment = (id: string) => {
    setSelectedDepartmentId(id);
  };

  const createSemester = async (data: Partial<Semester> & { name: string; term: string; academicYear: string }) => {
    const statusNumber = data.status === "active" ? 1 : data.status === "completed" ? 2 : data.status === "draft" ? 3 : 0;


    try {
      const res = await adminSemestersService.create({
        name: data.name,
        term: data.term,
        academicYear: data.academicYear,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        status: statusNumber,
        description: data.description,
        totalWeeks: data.totalWeeks || 6,
        internshipStartWeek: data.internshipStartWeek || 1,
        targetStudents: data.targetStudents || 0,
      });
      const mapped = mapBackendToFrontend(res);
      setSemesters((prev) => [mapped, ...prev]);
      setSelectedSemesterId(mapped.id);
      await refreshSemesterCache();
      return;
    } catch (err) {
      console.warn("Backend create semester failed:", err);
      throw err;
    }
  };

  const updateSemester = async (
    id: string,
    data: Partial<Semester> & { name: string; term: string; academicYear: string },
    onShowToast?: (msg: string) => void,
  ) => {
    try {
      const updated = await adminSemestersService.update(id, {
        name: data.name,
        term: data.term,
        academicYear: data.academicYear,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        description: data.description,
        totalWeeks: data.totalWeeks || 6,
        internshipStartWeek: data.internshipStartWeek || 1,
        targetStudents: data.targetStudents || 0,
      });
      const mapped = mapBackendToFrontend(updated);
      setSemesters((prev) => prev.map((semester) => (semester.id === id ? mapped : semester)));
      await refreshSemesterCache();
      onShowToast?.(`Đã cập nhật kỳ thực tập: "${mapped.name}".`);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể cập nhật kỳ thực tập.";
      onShowToast?.(message);
      return false;
    }
  };

  const closeSemester = async (
    id: string,
    lockStudentAccounts: boolean,
    onShowToast?: (msg: string) => void,
  ) => {
    let closedName = "";

    await adminSemestersService.close(id, { lockStudentAccounts });

    const updated = semesters.map((s) => {
      if (s.id === id) {
        closedName = s.name;
        return {
          ...s,
          status: "completed" as const,
          progressPercent: 100,
          currentPhase: "Đã hoàn thành",
        };
      }
      return s;
    });

    setSemesters(updated);
    await refreshSemesterCache();

    // Auto-switch to next active or upcoming semester
    const next =
      updated.find((s) => s.status === "active") ||
      updated.find((s) => s.status === "upcoming");
    if (next) {
      setSelectedSemesterId(next.id);
    }

    if (onShowToast) {
      onShowToast(
        lockStudentAccounts
          ? `Đã đóng kỳ thực tập: "${closedName}" và yêu cầu khóa tài khoản sinh viên không còn kỳ đang mở.`
          : `Đã đóng kỳ thực tập: "${closedName}". Tài khoản sinh viên vẫn hoạt động ở chế độ chỉ xem.`,
      );
    }
  };

  const startSemester = async (id: string, onShowToast?: (msg: string) => void) => {
    try {
      const started = await adminSemestersService.start(id);
      const mapped = mapBackendToFrontend(started);
      setSemesters((prev) => prev.map((semester) => semester.id === id ? mapped : semester));
      setSelectedSemesterId(id);
      await refreshSemesterCache();
      onShowToast?.(`Đã bắt đầu kỳ thực tập: "${mapped.name}".`);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        onShowToast?.("Không thể bắt đầu kỳ này vì đã có một kỳ thực tập đang hoạt động. Hãy đóng kỳ hiện tại trước.");
        return;
      }
      const message = err instanceof Error ? err.message : "Không thể bắt đầu kỳ thực tập.";
      onShowToast?.(message);
    }
  };

  const reopenSemester = async (id: string, onShowToast?: (msg: string) => void) => {
    try {
      const reopened = await adminSemestersService.reopen(id);
      const mapped = mapBackendToFrontend(reopened);
      setSemesters((prev) => prev.map((semester) => semester.id === id ? mapped : semester));
      setSelectedSemesterId(id);
      await refreshSemesterCache();
      onShowToast?.(`Đã mở lại kỳ thực tập: "${mapped.name}". Tài khoản sinh viên và giảng viên thuộc kỳ đã được kích hoạt.`);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        onShowToast?.(err.message || "Không thể mở lại kỳ vì đang có kỳ khác hoạt động trong khoa.");
        return;
      }
      const message = err instanceof Error ? err.message : "Không thể mở lại kỳ thực tập.";
      onShowToast?.(message);
    }
  };

  const duplicateSemester = (sem: Semester, onShowToast?: (msg: string) => void) => {
    const duplicated: Semester = {
      ...sem,
      id: `sem-dup-${Date.now()}`,
      name: `${sem.name} (Bản sao)`,
      status: "upcoming",
      progressPercent: 0,
      currentPhase: "Mới sao chép",
    };
    setSemesters((prev) => [duplicated, ...prev]);
    if (onShowToast) {
      onShowToast(`Đã sao chép kỳ thực tập: "${sem.name}"`);
    }
  };

  return (
    <SemesterContext.Provider
      value={{
        semesters,
        selectedSemesterId,
        selectedSemester,
        activeSemesterId,
        departments,
        selectedDepartmentId,
        selectedDepartment,
        selectSemester,
        selectDepartment,
        createSemester,
        updateSemester,
        startSemester,
        reopenSemester,
        closeSemester,
        duplicateSemester,
        refreshApiCounts,
      }}
    >
      {children}
    </SemesterContext.Provider>
  );
};

export const useSemester = (): SemesterContextType => {
  const context = useContext(SemesterContext);
  if (!context) {
    throw new Error("useSemester must be used within a SemesterProvider");
  }
  return context;
};
