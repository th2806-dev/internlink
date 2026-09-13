import { apiRequest, downloadAuthenticatedFile } from "../lib/apiClient";
import type {
  CompanyDto,
  CompanyImportResultDto,
  CompanyPositionDto,
  CreateCompanyPositionRequest,
  UpdateCompanyPositionRequest,
} from "../types/api";

export const adminCompaniesService = {
  getAll(skip = 0, take = 500, semesterId?: string, departmentId?: string): Promise<CompanyDto[]> {
    const params = new URLSearchParams({ skip: String(skip), take: String(take) });
    if (semesterId && semesterId !== "all") params.set("semesterId", semesterId);
    if (departmentId && departmentId !== "all") params.set("departmentId", departmentId);
    return apiRequest<CompanyDto[]>(`/api/Admin/companies?${params.toString()}`);
  },

  create(body: {
    companyName: string;
    address?: string;
    website?: string;
    industry?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
    capacity?: number;
  }): Promise<CompanyDto> {
    return apiRequest<CompanyDto>("/api/Admin/companies", {
      method: "POST",
      body,
    });
  },

  update(
    id: string,
    body: {
      companyName: string;
      address?: string;
      website?: string;
      industry?: string;
      contactPerson?: string;
      contactEmail?: string;
      contactPhone?: string;
      capacity?: number;
      isActive?: boolean;
    },
  ): Promise<CompanyDto> {
    return apiRequest<CompanyDto>(`/api/Admin/companies/${id}`, {
      method: "PUT",
      body,
    });
  },

  delete(id: string): Promise<void> {
    return apiRequest<void>(`/api/Admin/companies/${id}`, {
      method: "DELETE",
    });
  },

  /** Link / unlink a company for a semester ("ngưng liên kết" = isLinked false). */
  setSemesterLink(
    id: string,
    semesterId: string,
    isLinked: boolean,
  ): Promise<{ isLinked: boolean }> {
    return apiRequest<{ isLinked: boolean }>(
      `/api/Admin/companies/${id}/semester/${semesterId}`,
      {
        method: "PUT",
        body: { isLinked },
      },
    );
  },

  importExcel(file: File) {
    const form = new FormData();
    form.append("file", file);
    return apiRequest<CompanyImportResultDto>("/api/Admin/companies/import", {
      method: "POST",
      body: form,
    });
  },

  downloadImportTemplate() {
    return downloadAuthenticatedFile(
      "/api/Admin/companies/import/template",
      "company-import-template.xlsx",
    );
  },

  downloadExport() {
    return downloadAuthenticatedFile(
      "/api/Admin/companies/export",
      "danh-sach-doanh-nghiep.xlsx",
    );
  },

  /** Admin company detail: master data + hosted internships + recruitment positions. */
  getDetail(id: string): Promise<AdminCompanyDetailDto> {
    return apiRequest<AdminCompanyDetailDto>(`/api/Admin/companies/${id}/detail`);
  },

  /** Recruitment positions for a company, optionally filtered by semester */
  getPositions(companyId: string, semesterId?: string): Promise<CompanyPositionDto[]> {
    const qs = semesterId && semesterId !== "all" ? `?semesterId=${semesterId}` : "";
    return apiRequest<CompanyPositionDto[]>(`/api/Admin/companies/${companyId}/positions${qs}`);
  },

  createPosition(companyId: string, body: CreateCompanyPositionRequest): Promise<CompanyPositionDto> {
    return apiRequest<CompanyPositionDto>(`/api/Admin/companies/${companyId}/positions`, {
      method: "POST",
      body,
    });
  },

  updatePosition(positionId: string, body: UpdateCompanyPositionRequest): Promise<CompanyPositionDto> {
    return apiRequest<CompanyPositionDto>(`/api/Admin/companies/positions/${positionId}`, {
      method: "PUT",
      body,
    });
  },

  deletePosition(positionId: string): Promise<void> {
    return apiRequest<void>(`/api/Admin/companies/positions/${positionId}`, {
      method: "DELETE",
    });
  },
};

/** Admin company detail payload. */
export interface AdminCompanyDetailDto {
  company: CompanyDto;
  internships: InternshipListItemDto[];
  positions?: CompanyPositionDto[];
}

export interface InternshipListItemDto {
  id: string;
  studentId: string;
  studentName?: string;
  companyId?: string;
  companyName?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  position?: string;
  submissionCount: number;
  createdAt: string;
}
