import { apiRequest, downloadAuthenticatedFile } from "../lib/apiClient";
import type {
  CreateWeeklyReportRequestDto,
  FeedbackDto,
  UpdateWeeklyReportRequestDto,
  WeeklyReportDto,
  WeeklyReportVersionDto,
  PaginatedResponse,
} from "../types/api";

export const weeklyReportService = {
  getById(id: string): Promise<WeeklyReportDto> {
    return apiRequest<WeeklyReportDto>(`/api/WeeklyReport/${id}`);
  },

  getMine(): Promise<WeeklyReportDto[]> {
    return apiRequest<WeeklyReportDto[]>("/api/WeeklyReport/mine");
  },

  getByInternship(internshipId: string): Promise<WeeklyReportDto[]> {
    return apiRequest<WeeklyReportDto[]>(
      `/api/WeeklyReport/internship/${internshipId}`,
    );
  },

  getAllForLecturer(params: {
    semesterId?: string;
    skip?: number;
    take?: number;
    status?: string;
    searchTerm?: string;
    /** Nhận AbortSignal từ TanStack Query để hủy request cũ khi đổi bộ lọc. */
    signal?: AbortSignal;
  } = {}): Promise<PaginatedResponse<WeeklyReportDto>> {
    const query = new URLSearchParams();
    if (params.semesterId) query.set("semesterId", params.semesterId);
    query.set("skip", String(params.skip ?? 0));
    query.set("take", String(params.take ?? 20));
    if (params.status) query.set("status", params.status);
    if (params.searchTerm?.trim()) query.set("searchTerm", params.searchTerm.trim());
    return apiRequest<PaginatedResponse<WeeklyReportDto>>(`/api/Lecturer/weekly-reports?${query.toString()}`, {
      signal: params.signal,
    });
  },

  create(body: CreateWeeklyReportRequestDto): Promise<WeeklyReportDto> {
    return apiRequest<WeeklyReportDto>("/api/WeeklyReport", {
      method: "POST",
      body,
    });
  },

  upload(params: {
    internshipId: string;
    weekNumber: number;
    title: string;
    file: File;
  }): Promise<WeeklyReportDto> {
    const form = new FormData();
    form.append("InternshipId", params.internshipId);
    form.append("WeekNumber", String(params.weekNumber));
    form.append("Title", params.title);
    form.append("File", params.file);
    return apiRequest<WeeklyReportDto>("/api/WeeklyReport/upload", {
      method: "POST",
      body: form,
    });
  },

  uploadRevision(id: string, title: string, file: File): Promise<WeeklyReportDto> {
    const form = new FormData();
    form.append("Title", title);
    form.append("File", file);
    return apiRequest<WeeklyReportDto>(`/api/WeeklyReport/${id}/upload`, {
      method: "PUT",
      body: form,
    });
  },

  download(id: string, fallbackFilename: string, autoTrigger = true) {
    return downloadAuthenticatedFile(`/api/WeeklyReport/${id}/download`, fallbackFilename, autoTrigger);
  },

  getVersions(id: string) {
    return apiRequest<WeeklyReportVersionDto[]>(`/api/WeeklyReport/${id}/versions`);
  },

  downloadVersion(id: string, fallbackFilename: string, autoTrigger = true) {
    return downloadAuthenticatedFile(`/api/WeeklyReport/versions/${id}/download`, fallbackFilename, autoTrigger);
  },

  studentReply(id: string, comment: string): Promise<FeedbackDto> {
    return apiRequest<FeedbackDto>(`/api/WeeklyReport/${id}/student-reply`, {
      method: "POST",
      body: { comment },
    });
  },

  markFeedbacksRead(id: string): Promise<void> {
    return apiRequest<void>(`/api/WeeklyReport/${id}/feedback/read`, { method: "POST" });
  },

  update(id: string, body: UpdateWeeklyReportRequestDto): Promise<WeeklyReportDto> {
    return apiRequest<WeeklyReportDto>(`/api/WeeklyReport/${id}`, {
      method: "PUT",
      body,
    });
  },

  submit(id: string): Promise<WeeklyReportDto> {
    return apiRequest<WeeklyReportDto>(`/api/WeeklyReport/${id}/submit`, {
      method: "POST",
    });
  },

  review(
    id: string,
    body: { status: string; lecturerComment?: string },
  ): Promise<WeeklyReportDto> {
    return apiRequest<WeeklyReportDto>(`/api/WeeklyReport/${id}/review`, {
      method: "POST",
      body,
    });
  },
};
