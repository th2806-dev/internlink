import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../lib/apiClient";
import { lecturerCompaniesService } from "../services/lecturerCompanies.service";
import { notificationService } from "../services/notification.service";

export interface LecturerNavStats {
  studentCount: number;
  enterpriseCount: number;
  pendingReviewCount: number;
  evaluatedCount: number;
  unreadNotificationCount: number;
}

const DEFAULT_NAV_STATS: LecturerNavStats = {
  studentCount: 0,
  enterpriseCount: 0,
  pendingReviewCount: 0,
  evaluatedCount: 0,
  unreadNotificationCount: 0,
};

interface DashboardStatsDto {
  totalStudents: number;
  interningCount: number;
  pendingReviewsCount: number;
  completedCount: number;
  overdueReportsCount: number;
  averageGrade: number;
  evaluatedCount: number;
  statusDistribution: Record<string, number>;
}

/**
 * Badge số liệu cho sidebar giảng viên (SV / DN / chờ duyệt / đã đánh giá / thông báo).
 * Toàn bộ số liệu được scope theo HỌC KỲ đang chọn (semesterId) — đổi kỳ là tự tải lại,
 * khớp với số liệu các trang bên trong thay vì đếm trôi nổi toàn bộ các kỳ.
 */
export function useLecturerNavStats(semesterId?: string, enabled = true) {
  const [stats, setStats] = useState<LecturerNavStats>(DEFAULT_NAV_STATS);
  const [isLoading, setIsLoading] = useState(enabled);

  const load = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    // "all" / rỗng → không gửi semesterId (backend hiểu là toàn bộ kỳ).
    const scopedSemesterId = semesterId && semesterId !== "all" ? semesterId : undefined;
    try {
      const [statsDto, notifs, companies] = await Promise.all([
        apiRequest<DashboardStatsDto>(
          scopedSemesterId
            ? `/api/Lecturer/stats?semesterId=${encodeURIComponent(scopedSemesterId)}`
            : "/api/Lecturer/stats",
        ).catch(() => null),
        notificationService.getMine().catch(() => []),
        lecturerCompaniesService.getAll(scopedSemesterId).catch(() => []),
      ]);

      setStats({
        studentCount: statsDto?.totalStudents ?? 0,
        enterpriseCount: Array.isArray(companies) ? companies.length : 0,
        pendingReviewCount: statsDto?.pendingReviewsCount ?? 0,
        evaluatedCount: statsDto?.evaluatedCount ?? 0,
        unreadNotificationCount: notifs.filter((n) => !n.isRead).length,
      });
    } finally {
      setIsLoading(false);
    }
  }, [enabled, semesterId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { stats, isLoading, reload: load };
}
