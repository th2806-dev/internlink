import { apiRequestRaw } from "../lib/apiClient";

export interface AccountRequestDto {
  id: string;
  requesterCode: string;
  requesterName: string;
  requesterEmail?: string | null;
  requesterPhone?: string | null;
  requesterRole: string;
  departmentOrClass?: string | null;
  requestType: string;
  description?: string | null;
  priority: string;
  status: string;
  processorName?: string | null;
  processedAt?: string | null;
  adminNote?: string | null;
  attachmentName?: string | null;
  requestedChanges?: {
    field: string;
    oldValue?: string;
    newValue?: string;
  }[];
  createdAt: string;
}

export interface CreateAccountRequestPayload {
  requesterCode: string;
  requesterName: string;
  requesterEmail?: string;
  requesterPhone?: string;
  requesterRole?: string;
  departmentOrClass?: string;
  requestType: string;
  description?: string;
  priority?: string;
  requestedChanges?: { field: string; oldValue?: string; newValue?: string }[];
}

export const accountRequestService = {
  async getAll(params?: {
    status?: string;
    role?: string;
    skip?: number;
    take?: number;
  }): Promise<AccountRequestDto[]> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.role) qs.set("role", params.role);
    if (params?.skip) qs.set("skip", String(params.skip));
    if (params?.take) qs.set("take", String(params.take));
    const query = qs.toString();
    return apiRequestRaw<AccountRequestDto[]>(
      `/api/SuperAdmin/account-requests${query ? `?${query}` : ""}`,
    );
  },

  async getById(id: string): Promise<AccountRequestDto> {
    return apiRequestRaw<AccountRequestDto>(
      `/api/SuperAdmin/account-requests/${id}`,
    );
  },

  async create(
    payload: CreateAccountRequestPayload,
  ): Promise<AccountRequestDto> {
    return apiRequestRaw<AccountRequestDto>("/api/SuperAdmin/account-requests", {
      method: "POST",
      body: payload,
    });
  },

  async process(
    id: string,
    payload: {
      status: string;
      adminNote?: string;
      processorName?: string;
    },
  ): Promise<AccountRequestDto> {
    return apiRequestRaw<AccountRequestDto>(
      `/api/SuperAdmin/account-requests/${id}/process`,
      {
        method: "POST",
        body: payload,
      },
    );
  },

  async getPendingCount(): Promise<number> {
    return apiRequestRaw<number>(
      "/api/SuperAdmin/account-requests/pending-count",
    );
  },
};
