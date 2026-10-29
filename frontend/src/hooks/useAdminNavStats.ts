import { useAdminDashboardStats } from "./useAdminDashboardStats";
import { useAuth } from "../contexts/AuthContext";
import type { NotificationDto } from "../types/api";

export interface AdminNavStats {
  studentCount: number;
  lecturerCount: number;
  companyCount: number;
  unassignedCount: number;
  notificationCampaignCount: number;
  unreadNotificationCount: number;
}

const DEFAULT_NAV_STATS: AdminNavStats = {
  studentCount: 0,
  lecturerCount: 0,
  companyCount: 0,
  unassignedCount: 0,
  notificationCampaignCount: 0,
  unreadNotificationCount: 0,
};

export function useAdminNavStats(
  enabled = true,
  semesterId?: string | null,
  departmentId?: string | null,
) {
  const { user } = useAuth();
  const isSuperAdmin = user?.backendRole === "SuperAdmin";
  const dashboard = useAdminDashboardStats(
    enabled && !isSuperAdmin,
    semesterId === "all" ? undefined : semesterId,
    undefined,
    departmentId === "all" ? undefined : departmentId,
  );
  const stats: AdminNavStats = dashboard.stats
    ? {
        studentCount: dashboard.stats.studentCount,
        lecturerCount: dashboard.stats.lecturerCount,
        companyCount: dashboard.stats.companyCount,
        unassignedCount: dashboard.stats.unassignedStudents,
        notificationCampaignCount: dashboard.stats.notificationCampaignCount,
        unreadNotificationCount: dashboard.stats.unreadNotificationCount,
      }
    : DEFAULT_NAV_STATS;

  return {
    stats: isSuperAdmin ? DEFAULT_NAV_STATS : stats,
    recentNotifications: [] as NotificationDto[],
    isLoading: dashboard.isLoading,
    error: dashboard.error,
    reload: dashboard.reload,
  };
}
