import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiErrorMessage } from "../lib/apiClient";
import { adminCompaniesService } from "../services/adminCompanies.service";
import { adminAssignmentsService } from "../services/adminAssignments.service";
import { adminDashboardService } from "../services/adminDashboard.service";
import { adminLecturersService } from "../services/adminLecturers.service";
import { adminNotificationsService } from "../services/adminNotifications.service";
import { adminStudentsService } from "../services/adminStudents.service";
import { notificationService } from "../services/notification.service";
import { useAuth } from "../contexts/AuthContext";
import { queryKeys } from "../lib/queryKeys";

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

function buildWorkloadBreakdown(perLecturerCounts: number[]) {
  const total = perLecturerCounts.length || 1;
  const buckets = [
    { category: "Dưới định mức (<10 SV)", min: 0, max: 9, color: "bg-blue-500" },
    { category: "Đạt định mức (10–30 SV)", min: 10, max: 30, color: "bg-emerald-500" },
    { category: "Tải cao (31–35 SV)", min: 31, max: 35, color: "bg-amber-500" },
    { category: "Quá tải (>35 SV)", min: 36, max: Infinity, color: "bg-rose-500" },
  ];

  return buckets.map((bucket) => {
    const count = perLecturerCounts.filter(
      (n) => n >= bucket.min && n <= bucket.max,
    ).length;
    return {
      category: bucket.category,
      count,
      percent: Math.round((count / total) * 1000) / 10,
      color: bucket.color,
    };
  });
}

function buildActionItems(input: {
  unassignedStudents: number;
  pendingStudentAccounts: number;
  pendingLecturerAccounts: number;
}): AdminDashboardActionItem[] {
  const items: AdminDashboardActionItem[] = [];
  if (input.unassignedStudents > 0) {
    items.push({
      id: "unassigned",
      title: `${input.unassignedStudents} Sinh viên chưa phân công GVHD`,
      subtitle: "Cần ghép giảng viên hướng dẫn",
      tab: "admin-assignments",
      tone: "amber",
    });
  }
  if (input.pendingStudentAccounts > 0) {
    items.push({
      id: "pending-students",
      title: `${input.pendingStudentAccounts} Sinh viên chưa cấp tài khoản`,
      subtitle: "Cấp tài khoản trên trang Sinh viên",
      tab: "admin-students",
      tone: "blue",
    });
  }
  if (input.pendingLecturerAccounts > 0) {
    items.push({
      id: "pending-lecturers",
      title: `${input.pendingLecturerAccounts} Giảng viên chưa kích hoạt tài khoản`,
      subtitle: "Cấp tài khoản trên trang Giảng viên",
      tab: "admin-lecturers",
      tone: "emerald",
    });
  }
  return items;
}

import type { InternshipStatsDto } from "../types/api";

export interface AdminWorkloadBreakdown {
  category: string;
  count: number;
  percent: number;
  color: string;
}

export interface AdminDashboardActionItem {
  id: string;
  title: string;
  subtitle: string;
  tab: string;
  tone: "amber" | "blue" | "emerald";
}

export interface AdminDashboardActivity {
  id: string;
  title: string;
  desc: string;
  time: string;
  date: string;
  user: string;
}

export interface AdminDashboardStats {
  lecturerCount: number;
  lecturersWithStudents?: number;
  studentCount: number;
  activeStudents: number;
  pendingStudentAccounts: number;
  pendingLecturerAccounts: number;
  notificationCampaignCount?: number;
  unreadNotificationCount?: number;
  companyCount: number;
  activeCompanies: number;
  internshipTotal: number;
  internshipInProgress: number;
  internshipStats: InternshipStatsDto;
  assignedStudents: number;
  unassignedStudents: number;
  avgStudentsPerLecturer: number;
  workloadBreakdown: AdminWorkloadBreakdown[];
  actionItems: AdminDashboardActionItem[];
  recentActivities: AdminDashboardActivity[];
}

export function useAdminDashboardStats(
  enabled: boolean,
  semesterId?: string | null,
  onError?: (msg: string) => void,
  departmentId?: string | null,
  platformOverview = false,
) {
  const { user } = useAuth();
  const backendRole = user?.backendRole;
  const query = useQuery({
    queryKey: queryKeys.admin.dashboard({
      semesterId: semesterId ?? "all",
      departmentId: departmentId ?? "all",
      backendRole: backendRole ?? "",
      userId: user?.id ?? user?.username ?? "",
      platformOverview,
    }),
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const effectiveDepartmentId = departmentId === "all" || !departmentId ? undefined : departmentId;

      if (platformOverview) {
        const [overview, notifications] = await Promise.all([
          adminDashboardService.getOverview(
            semesterId ?? undefined,
            effectiveDepartmentId,
            backendRole,
          ),
          notificationService.getMine(),
        ]);
        const recentActivities = notifications.slice(0, 5).map((notification) => ({
          id: notification.id,
          title: notification.title,
          desc: notification.content,
          time: formatRelativeTime(notification.createdAt),
          date: new Date(notification.createdAt).toLocaleString("vi-VN"),
          user: "Hệ thống",
        }));
        return {
          lecturerCount: overview.lecturerCount,
          studentCount: overview.studentCount,
          activeStudents: overview.activeStudents,
          pendingStudentAccounts: 0,
          pendingLecturerAccounts: 0,
          notificationCampaignCount: 0,
          unreadNotificationCount: 0,
          companyCount: overview.companyCount,
          activeCompanies: overview.activeCompanies,
          internshipTotal: overview.internshipTotal,
          internshipInProgress: overview.internshipStats.inProgress,
          internshipStats: overview.internshipStats,
          assignedStudents: 0,
          unassignedStudents: 0,
          avgStudentsPerLecturer: 0,
          workloadBreakdown: [],
          actionItems: [],
          recentActivities,
        } satisfies AdminDashboardStats;
      }

      const [
        students,
        lecturers,
        companies,
        internshipStats,
        notifications,
        allAssignments,
        campaigns,
        unreadNotificationCount,
      ] =
        await Promise.all([
          adminStudentsService.getAll(0, 1000, semesterId ?? undefined, effectiveDepartmentId),
          adminLecturersService.getAll(0, 1000, semesterId ?? undefined, effectiveDepartmentId),
          adminCompaniesService.getAll(0, 1000, semesterId ?? undefined, effectiveDepartmentId),
          adminDashboardService.getInternshipStats(semesterId ?? undefined, effectiveDepartmentId, backendRole),
          notificationService.getMine(),
          adminAssignmentsService.getAll(semesterId ?? undefined, effectiveDepartmentId),
          adminNotificationsService.getCampaigns(20),
          notificationService.getUnreadCount(),
        ]);

      const assignmentsByLecturer = new Map<string, number>();
      const assignedStudentIds = new Set<string>();
      for (const item of allAssignments) {
        assignedStudentIds.add(item.studentId);
        assignmentsByLecturer.set(
          item.lecturerId,
          (assignmentsByLecturer.get(item.lecturerId) ?? 0) + 1,
        );
      }

      const perLecturerCounts: number[] = [];
      let lecturersWithStudents = 0;
      for (const l of lecturers) {
        const count = assignmentsByLecturer.get(l.id) ?? 0;
        if (count > 0) lecturersWithStudents++;
        perLecturerCounts.push(count);
      }

      const assignedStudents = assignedStudentIds.size;
      const unassignedStudents = students.filter(
        (s) => !assignedStudentIds.has(s.id),
      ).length;
      const activeStudents = students.filter((s) => s.userId).length;
      const pendingStudentAccounts = students.filter((s) => !s.userId).length;
      const pendingLecturerAccounts = lecturers.filter((l) => !l.userId).length;
      const activeCompanies = companies.filter((c) => c.isActive).length;
      const avgStudentsPerLecturer =
        lecturers.length > 0
          ? Math.round((assignedStudents / lecturers.length) * 10) / 10
          : 0;

      const recentActivities: AdminDashboardActivity[] = notifications
        .slice(0, 5)
        .map((n) => ({
          id: n.id,
          title: n.title,
          desc: n.content,
          time: formatRelativeTime(n.createdAt),
          date: new Date(n.createdAt).toLocaleString("vi-VN"),
          user: "Hệ thống",
        }));

      return {
        lecturerCount: lecturers.length,
        lecturersWithStudents,
        studentCount: students.length,
        activeStudents,
        pendingStudentAccounts,
        pendingLecturerAccounts,
        notificationCampaignCount: campaigns.length,
        unreadNotificationCount,
        companyCount: companies.length,
        activeCompanies,
        internshipTotal: internshipStats.total,
        internshipInProgress: internshipStats.inProgress,
        internshipStats,
        assignedStudents,
        unassignedStudents,
        avgStudentsPerLecturer,
        workloadBreakdown: buildWorkloadBreakdown(perLecturerCounts),
        actionItems: buildActionItems({
          unassignedStudents,
          pendingStudentAccounts,
          pendingLecturerAccounts,
        }),
        recentActivities,
      } satisfies AdminDashboardStats;
    },
  });

  useEffect(() => {
    if (query.error) onError?.(getApiErrorMessage(query.error));
  }, [query.error, onError]);

  return {
    stats: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? getApiErrorMessage(query.error) : null,
    updatedAt: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
    reload: query.refetch,
  };
}
