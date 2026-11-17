import { apiRequest } from "../lib/apiClient";
import type {
  InternshipDetailDto,
  InternshipDto,
  LecturerStudentListItemDto,
  PaginatedResponse,
  StudentWeeklyTimelineDto,
  StudentDto,
  SubmissionDto,
} from "../types/api";

export interface LecturerSemesterOptionDto {
  id: string;
  name: string;
  term: string;
  academicYear: string;
  startDate?: string | null;
  endDate?: string | null;
}

export const lecturerInternshipsService = {
  getAssignedSemesters(): Promise<LecturerSemesterOptionDto[]> {
    return apiRequest<LecturerSemesterOptionDto[]>("/api/Lecturer/semesters", { skipCache: true });
  },

  getSemesterSummary(semesterId: string) {
    return apiRequest<LecturerSemesterSummaryDto>(`/api/Lecturer/semester-summary/${semesterId}`, {
      skipCache: true,
    });
  },

  saveSemesterSummary(semesterId: string, body: SaveLecturerSemesterSummaryRequest) {
    return apiRequest<LecturerSemesterSummaryDto>(`/api/Lecturer/semester-summary/${semesterId}`, {
      method: "PUT",
      body,
      skipCache: true,
    });
  },

  getAll(semesterId?: string): Promise<InternshipDto[]> {
    const params = semesterId && semesterId !== "all" ? `?semesterId=${semesterId}` : "";
    return apiRequest<InternshipDto[]>(`/api/Lecturer/internships${params}`);
  },

  getStudents(semesterId?: string, options?: { signal?: AbortSignal }): Promise<LecturerStudentListItemDto[]> {
    const params = semesterId && semesterId !== "all" ? `?semesterId=${semesterId}` : "";
    return apiRequest<LecturerStudentListItemDto[]>(`/api/Lecturer/students${params}`, {
      skipCache: true,
      signal: options?.signal,
    });
  },

  getStudentPage(
    params: {
      semesterId?: string;
      skip: number;
      take: number;
      search?: string;
      status?: string;
      className?: string;
      companyName?: string;
      unassignedCompany?: boolean;
      sortBy?: string;
    },
    options?: { signal?: AbortSignal },
  ): Promise<PaginatedResponse<LecturerStudentListItemDto>> {
    const query = new URLSearchParams({
      skip: String(params.skip),
      take: String(params.take),
    });
    if (params.semesterId && params.semesterId !== "all") query.set("semesterId", params.semesterId);
    if (params.search) query.set("search", params.search);
    if (params.status) query.set("status", params.status);
    if (params.className) query.set("className", params.className);
    if (params.companyName) query.set("companyName", params.companyName);
    if (params.unassignedCompany) query.set("unassignedCompany", "true");
    if (params.sortBy) query.set("sortBy", params.sortBy);
    return apiRequest<PaginatedResponse<LecturerStudentListItemDto>>(
      `/api/v1/lecturer/students?${query.toString()}`,
      { skipCache: true, signal: options?.signal },
    );
  },

  getStudentTimeline(
    studentId: string,
    semesterId: string,
    options?: { signal?: AbortSignal },
  ): Promise<StudentWeeklyTimelineDto> {
    const query = new URLSearchParams({ semesterId });
    return apiRequest<StudentWeeklyTimelineDto>(
      `/api/v1/lecturer/students/${studentId}/timeline?${query.toString()}`,
      { skipCache: true, signal: options?.signal },
    );
  },

  getStudentById(studentId: string): Promise<StudentDto> {
    return apiRequest<StudentDto>(`/api/Student/${studentId}`);
  },

  getById(id: string): Promise<InternshipDetailDto> {
    return apiRequest<InternshipDetailDto>(`/api/Lecturer/internships/${id}`);
  },

  getSubmissions(internshipId: string, semesterId?: string): Promise<SubmissionDto[]> {
    const params = semesterId && semesterId !== "all" ? `?semesterId=${semesterId}` : "";
    return apiRequest<SubmissionDto[]>(
      `/api/Lecturer/internships/${internshipId}/submissions${params}`,
    );
  },

  getAllSubmissions(semesterId?: string, options?: { signal?: AbortSignal }): Promise<SubmissionDto[]> {
    const params = semesterId && semesterId !== "all" ? `?semesterId=${semesterId}` : "";
    return apiRequest<SubmissionDto[]>(`/api/Lecturer/submissions${params}`, {
      signal: options?.signal,
    });
  },

  addFeedback(
    submissionId: string,
    body: { comment: string; isPublic?: boolean; newStatus?: string },
  ) {
    return apiRequest<unknown>(`/api/Lecturer/submissions/${submissionId}/feedback`, {
      method: "POST",
      body,
    });
  },

  updateStudentNotes(internshipId: string, notes: string) {
    return apiRequest<unknown>(`/api/Lecturer/internships/${internshipId}/notes`, {
      method: "PUT",
      body: { notes },
    });
  },

  bulkNotifyStudents(title: string, message: string) {
    return apiRequest<{ notifiedCount: number }>("/api/Lecturer/students/notify", {
      method: "POST",
      body: { title, message },
    });
  },

  remindStudent(studentId: string, title?: string, message?: string) {
    return apiRequest<{ message: string }>(`/api/Lecturer/students/${studentId}/remind`, {
      method: "POST",
      body: { title: title ?? null, message: message ?? null },
    });
  },

  assignCompany(
    internshipId: string,
    body: { companyId: string; supervisorName?: string; position?: string },
  ) {
    return apiRequest<InternshipDetailDto>(`/api/Internship/${internshipId}/company`, {
      method: "PUT",
      body,
    });
  },
};

export interface LecturerSemesterSummaryDto {
  semesterId: string;
  results: string;
  difficulties: string;
  recommendations: string;
  conclusion: string;
  updatedAt?: string | null;
}

export interface SaveLecturerSemesterSummaryRequest {
  results: string;
  difficulties: string;
  recommendations: string;
  conclusion: string;
}
