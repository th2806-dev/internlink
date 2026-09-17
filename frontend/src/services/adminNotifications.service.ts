import { apiRequest } from "../lib/apiClient";

export interface AdminNotificationCampaignDto {
  /** Stable id derived from campaign content — must not change between requests. */
  id: string;
  title: string;
  content: string;
  audience: string;
  recipientCount: number;
  readCount: number;
  sentAt: string;
}

export interface AdminBroadcastResultDto {
  recipientCount: number;
  sentAt: string;
}

export const adminNotificationsService = {
  getCampaigns(take = 100): Promise<AdminNotificationCampaignDto[]> {
    return apiRequest<AdminNotificationCampaignDto[]>(
      `/api/DepartmentAdmin/notifications?take=${take}`,
    );
  },

  broadcast(body: {
    title: string;
    content: string;
    link?: string;
    audience: "all" | "student" | "lecturer";
  }): Promise<AdminBroadcastResultDto> {
    return apiRequest<AdminBroadcastResultDto>(
      "/api/DepartmentAdmin/notifications/broadcast",
      { method: "POST", body },
    );
  },

  deleteCampaign(body: {
    title: string;
    content: string;
    sentAt: string;
  }): Promise<void> {
    return apiRequest<void>("/api/DepartmentAdmin/notifications/campaign", {
      method: "DELETE",
      body,
    });
  },
};
