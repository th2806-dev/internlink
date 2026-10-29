import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "../lib/apiClient";
import { mapCampaignToAdminRow } from "../lib/adminNotificationMappers";
import { queryKeys } from "../lib/queryKeys";
import { useAuth } from "./useAuth";
import {
  adminNotificationsService,
  type AdminBroadcastResultDto,
} from "../services/adminNotifications.service";

export interface AdminNotificationItem {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: "low" | "medium" | "high" | "urgent";
  audienceType: "all" | "student" | "lecturer";
  audienceLabel: string;
  recipientCount: number;
  sentAt: string;
  createdAt: string;
  createdBy: string;
  status: "sent" | "draft";
  attachmentName?: string;
  attachmentSize?: string;
  campaignSentAt?: string;
}

const CAMPAIGNS_STORAGE_KEY = "internlink_admin_campaigns_cache";

function saveCachedCampaigns(items: AdminNotificationItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("internlink_notification_updated"));
  } catch {
    // The local cache is optional; the query cache remains authoritative.
  }
}

export interface UseAdminNotificationsState {
  notifications: AdminNotificationItem[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  broadcast: (payload: {
    title: string;
    content: string;
    audience: "all" | "student" | "lecturer";
    link?: string;
  }) => Promise<AdminBroadcastResultDto>;
  deleteCampaign: (target: {
    title: string;
    content: string;
    sentAt: string;
  }) => Promise<void>;
}

export const useAdminNotifications = (): UseAdminNotificationsState => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.admin.notifications.list({
    userId: user?.id ?? user?.username ?? "anonymous",
  });
  const query = useQuery({
    queryKey,
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const campaigns = await adminNotificationsService.getCampaigns(100);
      return campaigns.map(mapCampaignToAdminRow);
    },
  });
  const { data, error: queryError, isPending, isFetching, refetch: refetchQuery } = query;

  const broadcastMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      content: string;
      audience: "all" | "student" | "lecturer";
      link?: string;
    }) => adminNotificationsService.broadcast(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.notifications.all });
    },
  });
  const broadcastCampaign = broadcastMutation.mutateAsync;
  const deleteMutation = useMutation({
    mutationFn: (target: { title: string; content: string; sentAt: string }) =>
      adminNotificationsService.deleteCampaign(target),
    onSuccess: async (_result, target) => {
      const updated = (queryClient.getQueryData<AdminNotificationItem[]>(queryKey) ?? [])
        .filter((notification) =>
          !(
            notification.title === target.title &&
            notification.content === target.content &&
            (notification.campaignSentAt === target.sentAt || notification.sentAt === target.sentAt)
          ),
        );
      queryClient.setQueryData(queryKey, updated);
      saveCachedCampaigns(updated);
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.notifications.all });
    },
  });
  const deleteCampaignMutation = deleteMutation.mutateAsync;

  const refetch = useCallback(async () => {
    const result = await refetchQuery({ throwOnError: true });
    if (result.data) saveCachedCampaigns(result.data);
  }, [refetchQuery]);
  const broadcast = useCallback(async (payload: {
    title: string;
    content: string;
    audience: "all" | "student" | "lecturer";
    link?: string;
  }) => {
    const result = await broadcastCampaign(payload);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("internlink_notification_updated"));
    }
    return result;
  }, [broadcastCampaign]);
  const deleteCampaign = useCallback(async (target: {
    title: string;
    content: string;
    sentAt: string;
  }) => {
    await deleteCampaignMutation(target);
  }, [deleteCampaignMutation]);

  return {
    notifications: data ?? [],
    loading: isPending || (isFetching && !data),
    error: queryError
      ? queryError instanceof Error
        ? queryError
        : new Error(getApiErrorMessage(queryError))
      : null,
    refetch,
    broadcast,
    deleteCampaign,
  };
};
