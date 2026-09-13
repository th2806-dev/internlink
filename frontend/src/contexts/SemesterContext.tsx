import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { adminSemestersService, semesterPortalService, type BackendSemesterDto } from "../services/adminSemesters.service";
import { adminDepartmentsService, type DepartmentDto } from "../services/adminDepartments.service";
import { ApiClientError, getStoredToken } from "../lib/apiClient";
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
  status: "active" | "upcoming" | "completed" | "draft";
  progressPercent: number;
  totalWeeks: number;
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
    status: statusMap[dto.status] || "upcoming",
    progressPercent: dto.progressPercent,
    totalWeeks: dto.totalWeeks || 6,
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
  startSemester: (id: string, onShowToast?: (msg: string) => void) => Promise<void>;
  closeSemester: (id: string, onShowToast?: (msg: string) => void) => Promise<void>;
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
  const [semesters, setSemesters] = useState<Semester[]>(DEFAULT_SEMESTERS);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("all");

  const refreshApiCounts = useCallback(async () => {
    // Wait for AuthProvider to resolve the token before choosing the portal endpoint.
    if (!getStoredToken() || !role) return;
    try {
      if (role === "admin") {
        // Sync the semester list with the header department filter:
        // SuperAdmin picks a department -> only that department's terms show up.
        const backendSemesters = await adminSemestersService.getAll(
          selectedDepartmentId && selectedDepartmentId !== "all" ? selectedDepartmentId : undefined,
        );
        setSemesters(backendSemesters.map(mapBackendToFrontend));
        return;
      }

      const currentSemester = await semesterPortalService.getCurrent().catch(() => null);
      setSemesters(currentSemester ? [mapBackendToFrontend(currentSemester)] : []);
    } catch (err) {
      console.warn("Error refreshing semester API counts:", err);
    }
  }, [role, selectedDepartmentId]);

  useEffect(() => {
    refreshApiCounts();
    const timer = window.setInterval(() => {
      void refreshApiCounts();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [refreshApiCounts]);

  useEffect(() => {
    try {
      localStorage.setItem("internlink_admin_semesters", JSON.stringify(semesters));
    } catch {}
  }, [semesters]);

  useEffect(() => {
    if (semesters.length > 0 && !selectedSemesterId) {
      const active = semesters.find((s) => s.status === "active");
      const withStudents = semesters.find((s) => s.studentsCount > 0);
      const best = active || withStudents || semesters[0];
      if (best) setSelectedSemesterId("all");
    }
  }, [semesters, selectedSemesterId]);

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
        if (user?.backendRole === "DepartmentAdmin" && user.departmentId) {
          const dept = await adminDepartmentsService.getById(user.departmentId);
          if (!cancelled) {
            setDepartments([
              {
                id: dept.id,
                name: dept.name,
                code: dept.code,
                description: dept.description,
                isActive: dept.isActive,
              },
            ]);
            setSelectedDepartmentId(dept.id);
          }
          return;
        }

        const backendDepartments = await adminDepartmentsService.getAll();
        if (!cancelled) {
          const visibleDepartments = backendDepartments
            .filter((d) => d.isActive)
            .map((d) => ({
              id: d.id,
              name: d.name,
              code: d.code,
              description: d.description,
              isActive: d.isActive,
            }));

          setDepartments(visibleDepartments);
          setSelectedDepartmentId((prev) => (prev && prev !== "all" ? prev : "all"));
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
  }, [role, user?.backendRole, user?.departmentId]);

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
      });
      const mapped = mapBackendToFrontend(res);
      setSemesters((prev) => [mapped, ...prev]);
      setSelectedSemesterId(mapped.id);
      return;
    } catch (err) {
      console.warn("Backend create semester failed, falling back to local state:", err);
    }


    const newSem: Semester = {
      id: `sem-${Date.now()}`,
      name: data.name,
      term: data.term,
      academicYear: data.academicYear,
      startDate: data.startDate || "01/09/2026",
      endDate: data.endDate || "15/12/2026",
      lecturersCount: data.lecturersCount || 0,
      studentsCount: data.studentsCount || 0,
      placedStudents: 0,
      companiesCount: 0,
      status: data.status || "upcoming",
      progressPercent: 0,
      totalWeeks: data.totalWeeks || 6,
      currentPhase: data.currentPhase || "Chuẩn bị danh sách",
      description: data.description || `Đợt thực tập ${data.term} ${data.academicYear}`,
    };
    setSemesters((prev) => [newSem, ...prev]);
    setSelectedSemesterId(newSem.id);
  };

  const closeSemester = async (id: string, onShowToast?: (msg: string) => void) => {
    let closedName = "";


    try {
      await adminSemestersService.close(id);
    } catch (err) {
      console.warn("Backend close semester call failed, updating local state:", err);
    }


    const updated = semesters.map((s) => {
      if (s.id === id) {
        closedName = s.name;
        return {
          ...s,
          status: "completed" as const,
          progressPercent: 100,
          currentPhase: "Đã hoàn thành & Khóa dữ liệu",
        };
      }
      return s;
    });

    setSemesters(updated);

    // Auto-switch to next active or upcoming semester
    const next =
      updated.find((s) => s.status === "active") ||
      updated.find((s) => s.status === "upcoming");
    if (next) {
      setSelectedSemesterId(next.id);
    }

    if (onShowToast) {
      onShowToast(`Đã đóng kỳ thực tập: "${closedName}". Tài khoản sinh viên đợt này đã chuyển sang chế độ Lưu trữ.`);
    }
  };

  const startSemester = async (id: string, onShowToast?: (msg: string) => void) => {
    try {
      const started = await adminSemestersService.start(id);
      const mapped = mapBackendToFrontend(started);
      setSemesters((prev) => prev.map((semester) => semester.id === id ? mapped : semester));
      setSelectedSemesterId(id);
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
        startSemester,
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
