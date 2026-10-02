import { apiRequest } from "../lib/apiClient";

export interface SchoolAcademicTermDto {
  id: string;
  academicYear: string;
  term: string;
  startDate: string;
  endDate: string;
  totalWeeks: number;
}

export interface SaveSchoolAcademicTermRequest {
  academicYear: string;
  term: string;
  startDate: string;
  endDate: string;
}

export interface CreateAcademicYearRequest {
  academicYear: string;
  term1Start: string;
  term1End: string;
  term2Start: string;
  term2End: string;
  summerStart: string;
  summerEnd: string;
}

export interface AcademicYearBatchResultDto {
  academicYear: string;
  terms: SchoolAcademicTermDto[];
}

const route = "/api/SuperAdmin/academic-terms";

export const schoolAcademicTermsService = {
  getAll(): Promise<SchoolAcademicTermDto[]> {
    return apiRequest<SchoolAcademicTermDto[]>(route, { skipCache: true });
  },

  create(body: SaveSchoolAcademicTermRequest): Promise<SchoolAcademicTermDto> {
    return apiRequest<SchoolAcademicTermDto>(route, { method: "POST", body, skipCache: true });
  },

  /** Tạo nhanh cả năm học gồm HK I, HK II, HK Hè (atomic). */
  createAcademicYear(body: CreateAcademicYearRequest): Promise<AcademicYearBatchResultDto> {
    return apiRequest<AcademicYearBatchResultDto>(`${route}/academic-year`, { method: "POST", body, skipCache: true });
  },

  update(id: string, body: SaveSchoolAcademicTermRequest): Promise<SchoolAcademicTermDto> {
    return apiRequest<SchoolAcademicTermDto>(`${route}/${id}`, { method: "PUT", body, skipCache: true });
  },
};