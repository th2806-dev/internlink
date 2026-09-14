import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "../lib/apiClient";
import { adminCompaniesService } from "../services/adminCompanies.service";
import { adminAssignmentsService } from "../services/adminAssignments.service";
import { adminDashboardService } from "../services/adminDashboard.service";
import { adminLecturersService } from "../services/adminLecturers.service";
import { adminStudentsService } from "../services/adminStudents.service";
import { notificationService } from "../services/notification.service";

const EMPTY_INTERNSHIP_STATS: InternshipStatsDto = {
  total: 0,
  notStarted: 0,
  inProgress: 0,
  behindSchedule: 0,
  awaitingFeedback: 0,
  requiresRevision: 0,
  completed: 0,
  graded: 0,
};

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
  lecturersWithStudents: number;
  studentCount: number;
  activeStudents: number;
  pendingStudentAccounts: number;
  pendingLecturerAccounts: number;
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
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    try {
      const effectiveDepartmentId = departmentId === "all" || !departmentId ? undefined : departmentId;
      if (platformOverview) {
        const overview = await adminDashboardService.getOverview(semesterId ?? undefined, effectiveDepartmentId);
        setStats({
          lecturerCount: overview.lecturerCount,
          lecturersWithStudents: 0,
          studentCount: overview.studentCount,
          activeStudents: overview.activeStudents,
          pendingStudentAccounts: 0,
          pendingLecturerAccounts: 0,
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
          recentActivities: [],
        });
        setUpdatedAt(new Date());
        return;
      }

      const [
        students,
        lecturers,
        companies,
        internshipStats,
        notifications,
        allAssignments,
      ] = await Promise.all([
        adminStudentsService.getAll(0, 500, semesterId ?? undefined, effectiveDepartmentId),
        adminLecturersService.getAll(0, 500, semesterId ?? undefined, effectiveDepartmentId),
        adminCompaniesService.getAll(0, 500, semesterId ?? undefined, effectiveDepartmentId),
        adminDashboardService
          .getInternshipStats(semesterId ?? undefined, effectiveDepartmentId)
          .catch(() => ({ ...EMPTY_INTERNSHIP_STATS })),
        notificationService.getMine().catch(() => []),
        adminAssignmentsService
          .getAll(semesterId ?? undefined, effectiveDepartmentId)
          .catch(() => []),
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

      setStats({
        lecturerCount: lecturers.length,
        lecturersWithStudents,
        studentCount: students.length,
        activeStudents,
        pendingStudentAccounts,
        pendingLecturerAccounts,
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
      });
      setUpdatedAt(new Date());
    } catch (err) {
      onError?.(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [enabled, semesterId, onError, departmentId, platformOverview]);

  useEffect(() => {
    void load();
  }, [load]);

  return { stats, isLoading, updatedAt, reload: load };
}
