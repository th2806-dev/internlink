import { apiRequest, downloadAuthenticatedFile } from "../lib/apiClient";
import type {
  CreateTemplatePayload,
  DocumentDetailDto,
  DocumentListItemDto,
  TemplateStatsDto,
  UpdateTemplatePayload,
} from "../types/api";

export const documentService = {
  getAll(skip = 0, take = 200): Promise<DocumentListItemDto[]> {
    return apiRequest<DocumentListItemDto[]>(
      `/api/Document?skip=${skip}&take=${take}`,
    );
  },

  getByInternship(
    internshipId: string,
    skip = 0,
    take = 200,
  ): Promise<DocumentListItemDto[]> {
    return apiRequest<DocumentListItemDto[]>(
      `/api/Document/internship/${internshipId}?skip=${skip}&take=${take}`,
    );
  },

  uploadSimple(params: {
    internshipId: string;
    files: File[];
  }): Promise<{ count: number; documents: DocumentDetailDto[] }> {
    const form = new FormData();
    form.append("InternshipId", params.internshipId);
    params.files.forEach((f) => form.append("Files", f));
    return apiRequest<{ count: number; documents: DocumentDetailDto[] }>("/api/Document/upload", {
      method: "POST",
      body: form,
    });
  },

  update(
    id: string,
    body: {
      title?: string;
      description?: string;
      category?: string;
      isRequired?: boolean;
      isPublished?: boolean;
      archiveReason?: string;
    },
  ): Promise<DocumentDetailDto> {
    return apiRequest<DocumentDetailDto>(`/api/Document/${id}`, {
      method: "PUT",
      body,
    });
  },

  delete(id: string): Promise<void> {
    return apiRequest<void>(`/api/Document/${id}`, { method: "DELETE" });
  },

  download(id: string, fallbackFilename: string) {
    return downloadAuthenticatedFile(
      `/api/Document/${id}/download`,
      fallbackFilename,
    );
  },

  getTemplates(params?: {
    semesterId?: string;
    department?: string;
    category?: string;
    isPublishedOnly?: boolean;
  }): Promise<DocumentListItemDto[]> {
    const query = new URLSearchParams();
    if (params?.semesterId) query.set("semesterId", params.semesterId);
    if (params?.department) query.set("department", params.department);
    if (params?.category) query.set("category", params.category);
    if (params?.isPublishedOnly !== undefined)
      query.set("isPublishedOnly", String(params.isPublishedOnly));

    const qs = query.toString();
    return apiRequest<DocumentListItemDto[]>(
      `/api/Document/templates${qs ? `?${qs}` : ""}`,
    );
  },

  getTemplateStats(): Promise<TemplateStatsDto> {
    return apiRequest<TemplateStatsDto>("/api/Document/templates/stats");
  },

  createTemplate(payload: CreateTemplatePayload): Promise<DocumentDetailDto> {
    const form = new FormData();
    if (payload.semesterId) form.append("SemesterId", payload.semesterId);
    if (payload.department) form.append("Department", payload.department);
    form.append("Title", payload.title);
    if (payload.description) form.append("Description", payload.description);
    if (payload.category) form.append("Category", payload.category);
    if (payload.version) form.append("Version", payload.version);
    if (payload.isPublished !== undefined)
      form.append("IsPublished", String(payload.isPublished));
    if (payload.isRequired !== undefined)
      form.append("IsRequired", String(payload.isRequired));
    form.append("File", payload.file);

    return apiRequest<DocumentDetailDto>("/api/Document/templates", {
      method: "POST",
      body: form,
    });
  },

  updateTemplate(
    id: string,
    payload: UpdateTemplatePayload,
  ): Promise<DocumentDetailDto> {
    const form = new FormData();
    if (payload.semesterId !== undefined)
      form.append("SemesterId", payload.semesterId);
    if (payload.department !== undefined)
      form.append("Department", payload.department);
    if (payload.title !== undefined) form.append("Title", payload.title);
    if (payload.description !== undefined)
      form.append("Description", payload.description);
    if (payload.category !== undefined)
      form.append("Category", payload.category);
    if (payload.version !== undefined) form.append("Version", payload.version);
    if (payload.isPublished !== undefined)
      form.append("IsPublished", String(payload.isPublished));
    if (payload.isRequired !== undefined)
      form.append("IsRequired", String(payload.isRequired));
    if (payload.archiveReason !== undefined)
      form.append("ArchiveReason", payload.archiveReason);
    if (payload.file) form.append("File", payload.file);

    return apiRequest<DocumentDetailDto>(`/api/Document/templates/${id}`, {
      method: "PUT",
      body: form,
    });
  },

  deleteTemplate(id: string): Promise<void> {
    return apiRequest<void>(`/api/Document/templates/${id}`, {
      method: "DELETE",
    });
  },

  seedTemplates(): Promise<{ message: string }> {
    return apiRequest<{ message: string }>("/api/Document/templates/seed", {
      method: "POST",
    });
  },
};
