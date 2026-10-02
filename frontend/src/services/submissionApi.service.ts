import { apiRequest, downloadAuthenticatedFile } from "../lib/apiClient";
import { mapUiSubmissionStatusToApi } from "../lib/portalMappers";
import type {
  CreateFeedbackRequestDto,
  CreateSubmissionRequestDto,
  ResubmitSubmissionRequestDto,
  SubmissionDto,
} from "../types/api";

export const submissionApiService = {
  getById(id: string): Promise<SubmissionDto> {
    return apiRequest<SubmissionDto>(`/api/Submission/${id}`);
  },

  getMine(): Promise<SubmissionDto[]> {
    return apiRequest<SubmissionDto[]>("/api/Submission/mine");
  },

  getByInternship(internshipId: string): Promise<SubmissionDto[]> {
    return apiRequest<SubmissionDto[]>(
      `/api/Submission/internship/${internshipId}`,
    );
  },

  create(body: CreateSubmissionRequestDto): Promise<SubmissionDto> {
    return apiRequest<SubmissionDto>("/api/Submission", {
      method: "POST",
      body,
    });
  },

  resubmit(
    id: string,
    body: ResubmitSubmissionRequestDto,
  ): Promise<SubmissionDto> {
    return apiRequest<SubmissionDto>(`/api/Submission/${id}/resubmit`, {
      method: "POST",
      body,
    });
  },

  upload(params: {
    internshipId: string;
    type: string;
    title?: string;
    description?: string;
    file: File;
  }): Promise<SubmissionDto> {
    const form = new FormData();
    form.append("InternshipId", params.internshipId);
    form.append("Type", params.type);
    if (params.title) form.append("Title", params.title);
    if (params.description) form.append("Description", params.description);
    form.append("File", params.file);
    return apiRequest<SubmissionDto>("/api/Submission/upload", {
      method: "POST",
      body: form,
    });
  },

  bundle(params: {
    internshipId: string;
    type: string;
    title: string;
    description?: string;
    employerScore?: number;
    files: File[];
    links: { label: string; url: string }[];
  }): Promise<SubmissionDto> {
    const form = new FormData();
    form.append("InternshipId", params.internshipId);
    form.append("Type", params.type);
    form.append("Title", params.title);
    if (params.description) form.append("Description", params.description);
    if (params.employerScore != null) form.append("EmployerScore", String(params.employerScore));
    form.append("LinksJson", JSON.stringify(params.links));
    params.files.forEach((file) => form.append("Files", file));
    return apiRequest<SubmissionDto>("/api/Submission/bundle", {
      method: "POST",
      body: form,
    });
  },

  resubmitUpload(
    id: string,
    params: { title?: string; description?: string; file: File },
  ): Promise<SubmissionDto> {
    const form = new FormData();
    if (params.title) form.append("Title", params.title);
    if (params.description) form.append("Description", params.description);
    form.append("File", params.file);
    return apiRequest<SubmissionDto>(`/api/Submission/${id}/resubmit-upload`, {
      method: "POST",
      body: form,
    });
  },

  download(id: string, fallbackFilename: string, autoTrigger = true) {
    return downloadAuthenticatedFile(
      `/api/Submission/${id}/download`,
      fallbackFilename,
      autoTrigger,
    );
  },

  downloadAsset(submissionId: string, assetId: string, fallbackFilename: string, autoTrigger = true) {
    return downloadAuthenticatedFile(
      `/api/Submission/${submissionId}/assets/${assetId}/download`,
      fallbackFilename,
      autoTrigger,
    );
  },

  downloadLecturerZip(ids: string[]) {
    return downloadAuthenticatedFile(
      "/api/Lecturer/submissions/download-zip",
      "submissions.zip",
      true,
      { method: "POST", body: JSON.stringify({ submissionIds: ids }) },
    );
  },

  updateStatus(id: string, status: string): Promise<SubmissionDto> {
    return apiRequest<SubmissionDto>(`/api/Submission/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
  },

  addFeedback(
    id: string,
    body: CreateFeedbackRequestDto,
  ): Promise<SubmissionDto> {
    return apiRequest<SubmissionDto>(`/api/Submission/${id}/feedback`, {
      method: "POST",
      body,
    });
  },

  /** Student reply to lecturer feedback. */
  studentReply(id: string, comment: string): Promise<SubmissionDto> {
    return apiRequest<SubmissionDto>(`/api/Submission/${id}/student-reply`, {
      method: "POST",
      body: { comment },
    });
  },

  markFeedbacksRead(id: string): Promise<void> {
    return apiRequest<void>(`/api/Submission/${id}/feedback/read`, { method: "POST" });
  },

  /** Review submission with optional comment (lecturer). */
  async review(
    id: string,
    uiStatus: string,
    comment?: string,
  ): Promise<SubmissionDto> {
    const apiStatus = mapUiSubmissionStatusToApi(uiStatus);
    if (comment?.trim()) {
      return apiRequest<SubmissionDto>(`/api/Submission/${id}/feedback`, {
        method: "POST",
        body: {
          comment: comment.trim(),
          isPublic: true,
          newStatus: apiStatus,
        },
      });
    }
    return apiRequest<SubmissionDto>(`/api/Submission/${id}/status`, {
      method: "PATCH",
      body: { status: apiStatus },
    });
  },
};
