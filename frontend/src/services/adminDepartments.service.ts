import { apiRequest } from '../lib/apiClient';

export interface DepartmentDto {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
  userCount: number;
  studentCount: number;
  lecturerCount: number;
  semesterCount: number;
}

export interface CreateDepartmentRequest {
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateDepartmentRequest {
  code?: string;
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export const adminDepartmentsService = {
  getAll(): Promise<DepartmentDto[]> {
    return apiRequest<DepartmentDto[]>('/api/Admin/departments');
  },

  getById(id: string): Promise<DepartmentDto> {
    return apiRequest<DepartmentDto>(`/api/Admin/departments/${id}`);
  },

  create(body: CreateDepartmentRequest): Promise<DepartmentDto> {
    return apiRequest<DepartmentDto>('/api/Admin/departments', {
      method: 'POST',
      body,
    });
  },

  update(id: string, body: UpdateDepartmentRequest): Promise<DepartmentDto> {
    return apiRequest<DepartmentDto>(`/api/Admin/departments/${id}`, {
      method: 'PUT',
      body,
    });
  },

  delete(id: string): Promise<void> {
    return apiRequest<void>(`/api/Admin/departments/${id}`, {
      method: 'DELETE',
    });
  },
};
