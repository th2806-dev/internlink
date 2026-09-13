import { apiRequest } from "../lib/apiClient";

export interface BackendSemesterDto {
  id: string;
  name: string;
  term: string;
  academicYear: string;
  startDate: string | null;
  endDate: string | null;
  status: number; // 0: Upcoming, 1: Active, 2: Completed, 3: Draft
  description?: string | null;
  maxStudentsPerLecturer: number;
  totalWeeks: number;
  studentsCount: number;
  lecturersCount: number;
  placedStudents: number;
  companiesCount: number;
  progressPercent: number;
  currentPhase: string;
  createdAt: string;
}

export interface CreateSemesterRequest {
  name: string;
  term: string;
  academicYear: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: number;
  description?: string | null;
  maxStudentsPerLecturer?: number;
  totalWeeks?: number;
}

export interface UpdateSemesterRequest {
  name?: string;
  term?: string;
  academicYear?: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: number;
  description?: string | null;
  maxStudentsPerLecturer?: number;
  totalWeeks?: number;
}

export const adminSemestersService = {
  getAll(): Promise<BackendSemesterDto[]> {
    return apiRequest<BackendSemesterDto[]>("/api/Admin/semesters");
  },

  getById(id: string): Promise<BackendSemesterDto> {
    return apiRequest<BackendSemesterDto>(`/api/Admin/semesters/${id}`);
  },

  create(body: CreateSemesterRequest): Promise<BackendSemesterDto> {
    return apiRequest<BackendSemesterDto>("/api/Admin/semesters", {
      method: "POST",
      body,
    });
  },

  update(id: string, body: UpdateSemesterRequest): Promise<BackendSemesterDto> {
    return apiRequest<BackendSemesterDto>(`/api/Admin/semesters/${id}`, {
      method: "PUT",
      body,
    });
  },

  close(id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/Admin/semesters/${id}/close`, {
      method: "POST",
    });
  },

  start(id: string): Promise<BackendSemesterDto> {
    return apiRequest<BackendSemesterDto>(`/api/Admin/semesters/${id}/start`, {
      method: "POST",
    });
  },

  delete(id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/Admin/semesters/${id}`, {
      method: "DELETE",
    });
  },
};

export const semesterPortalService = {
  getCurrent(): Promise<BackendSemesterDto> {
    return apiRequest<BackendSemesterDto>("/api/Semesters/current");
  },
};
