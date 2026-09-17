import { apiRequest } from "../lib/apiClient";
import type {
  InternshipDetailDto,
  InternshipDto,
  LecturerStudentListItemDto,
  StudentDto,
  SubmissionDto,
} from "../types/api";

export const lecturerInternshipsService = {
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

  getStudents(semesterId?: string): Promise<LecturerStudentListItemDto[]> {
    const params = semesterId && semesterId !== "all" ? `?semesterId=${semesterId}` : "";
    return apiRequest<LecturerStudentListItemDto[]>(`/api/Lecturer/students${params}`, {
      skipCache: true,
    });
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

  getAllSubmissions(semesterId?: string): Promise<SubmissionDto[]> {
    const params = semesterId && semesterId !== "all" ? `?semesterId=${semesterId}` : "";
    return apiRequest<SubmissionDto[]>(`/api/Lecturer/submissions${params}`);
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
