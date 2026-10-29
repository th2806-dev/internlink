import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { getApiErrorMessage } from "../lib/apiClient";
import { queryKeys } from "../lib/queryKeys";
import { weeklyReportService } from "../services/weeklyReport.service";
import type { WeeklyReportDto } from "../types/api";

export interface WeeklyReportData {
  id: string;
  weekNumber: number;
  title: string;
  submittedAt?: string | null;
  updatedAt?: string | null;
  status: "draft" | "submitted" | "revised" | "approved";
  lecturerComment?: string | null;
}

function mapApiStatus(status: string): WeeklyReportData["status"] {
  switch (status) {
    case "Draft":
      return "draft";
    case "Submitted":
    case "Reviewed":
      return "submitted";
    case "RevisionRequested":
      return "revised";
    case "Approved":
      return "approved";
    default:
      return "draft";
  }
}

function mapDto(report: WeeklyReportDto): WeeklyReportData {
  return {
    id: report.id,
    weekNumber: report.weekNumber,
    title: report.title,
    submittedAt: report.submittedAt,
    updatedAt: report.updatedAt ?? report.createdAt,
    status: mapApiStatus(report.status),
    lecturerComment: report.lecturerComment,
  };
}

export const useWeeklyReports = () => {
  const { user, isLoggedIn } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.student.weeklyReports.list({
      userId: user?.id ?? user?.username ?? "anonymous",
    }),
    enabled: isLoggedIn,
    staleTime: 3 * 60 * 1000,
    queryFn: async ({ signal }) =>
      (await weeklyReportService.getMine({ signal })).map(mapDto),
  });

  return {
    reports: query.data ?? [],
    loading: query.isLoading,
    error: query.error
      ? query.error instanceof Error
        ? query.error
        : new Error(getApiErrorMessage(query.error))
      : null,
    refetch: query.refetch,
  };
};
