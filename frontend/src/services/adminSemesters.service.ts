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
  /** Tuần tuyệt đối của học kỳ nơi Tuần thực tập 1 bắt đầu (1 = không lệch). */
  internshipStartWeek?: number;
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
  internshipStartWeek?: number;
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
  internshipStartWeek?: number;
}

export interface FacultySemesterSummaryDto {
  semesterId: string;
  results: string;
  difficulties: string;
  recommendations: string;
  conclusion: string;
  updatedAt?: string | null;
}

export interface SaveFacultySemesterSummaryRequest {
  results: string;
  difficulties: string;
  recommendations: string;
  conclusion: string;
}

export const adminSemestersService = {
  /** Nội dung báo cáo tổng kết công tác thực tập CẤP KHOA của một học kỳ. */
  getFacultySummary(semesterId: string): Promise<FacultySemesterSummaryDto> {
    return apiRequest<FacultySemesterSummaryDto>(`/api/Admin/semesters/${semesterId}/faculty-summary`, {
      skipCache: true,
    });
  },

  /** Lưu nội dung báo cáo tổng kết cấp khoa (inject vào template Word C22A khi admin xuất). */
  saveFacultySummary(semesterId: string, body: SaveFacultySemesterSummaryRequest): Promise<FacultySemesterSummaryDto> {
    return apiRequest<FacultySemesterSummaryDto>(`/api/Admin/semesters/${semesterId}/faculty-summary`, {
      method: "PUT",
      body,
      skipCache: true,
    });
  },

  getAll(departmentId?: string, backendRole?: string | null): Promise<BackendSemesterDto[]> {
    const qs = departmentId && departmentId !== "all" ? `?departmentId=${departmentId}` : "";
    const route = backendRole === "SuperAdmin" ? "/api/SuperAdmin/semesters" : "/api/Admin/semesters";
    return apiRequest<BackendSemesterDto[]>(`${route}${qs}`);
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
