import { apiRequest } from "../lib/apiClient";

export type PlatformAnnouncementType =
  | "Maintenance"
  | "ReleaseNote"
  | "SecurityAlert"
  | "General";
export type AnnouncementAudience = "AllUsers" | "TenantAdminsOnly";

export interface PlatformAnnouncement {
  id: string;
  title: string;
  content: string;
  type: PlatformAnnouncementType;
  targetAudience: AnnouncementAudience;
  targetTenantId: string | null;
  targetTenantName: string | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  showBanner: boolean;
  createdAt: string;
}

export interface CreatePlatformAnnouncement {
  title: string;
  content: string;
  type: PlatformAnnouncementType;
  targetAudience: AnnouncementAudience;
  targetTenantId: string | null;
  startsAt: string;
  endsAt: string;
  showBanner: boolean;
}

export interface PlatformAnnouncementBanner {
  id: string;
  title: string;
  content: string;
  type: PlatformAnnouncementType;
  endsAt: string;
}

export interface AdministrativeSession {
  tokenId: string;
  userId: string;
  userName: string;
  email: string;
  role: "SuperAdmin" | "DepartmentAdmin";
  tenantId: string;
  tenantName: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

export const platformOperationsService = {
  getAnnouncements: (type?: PlatformAnnouncementType | "", signal?: AbortSignal) => {
    const query = type ? `?type=${encodeURIComponent(type)}` : "";
    return apiRequest<PlatformAnnouncement[]>(
      `/api/v1/system/announcements${query}`,
      { skipCache: true, signal },
    );
  },

  getAnnouncement: (id: string, signal?: AbortSignal) =>
    apiRequest<PlatformAnnouncement>(`/api/v1/system/announcements/${id}`, {
      skipCache: true,
      signal,
    }),

  createAnnouncement: (request: CreatePlatformAnnouncement) =>
    apiRequest<PlatformAnnouncement>("/api/v1/system/announcements", {
      method: "POST",
      body: request,
    }),

  toggleAnnouncement: (id: string) =>
    apiRequest<PlatformAnnouncement>(`/api/v1/system/announcements/${id}/toggle`, {
      method: "PUT",
    }),

  getActiveBanners: (signal?: AbortSignal) =>
    apiRequest<PlatformAnnouncementBanner[]>(
      "/api/v1/system/announcements/active-banner",
      { skipCache: true, signal },
    ),

  getActiveSessions: (signal?: AbortSignal) =>
    apiRequest<AdministrativeSession[]>("/api/v1/system/security/active-sessions", {
      skipCache: true,
      signal,
    }),

  revokeSession: (tokenId: string) =>
    apiRequest<{ tokenId: string; isRevoked: boolean }>(
      `/api/v1/system/security/sessions/${tokenId}/revoke`,
      { method: "POST" },
    ),
};
