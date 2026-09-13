import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "../lib/apiClient";
import { mapLecturerCompanySummaryToEnterprise } from "../lib/adminMappers";
import {
  mapLecturerStudentDtoToStudent,
  mapSubmissionDtoToRow,
  mapWeeklyReportStatusToUi,
  mapUiWeeklyReportReviewStatusToApi,
  formatViDate,
} from "../lib/portalMappers";
import { lecturerCompaniesService } from "../services/lecturerCompanies.service";
import { lecturerInternshipsService } from "../services/lecturerInternships.service";
import { submissionApiService } from "../services/submissionApi.service";
import { weeklyReportService } from "../services/weeklyReport.service";
import { lecturerDashboardService } from "../services/lecturerDashboard.service";
import type { Student } from "../types/student";
import type { Submission } from "../types/submission";
import type { Enterprise } from "../types/enterprise";
import type {
  LecturerDashboardStatsDto,
  LecturerStudentListItemDto,
  LecturerWeeklyTrendDto,
  WeeklyReportDto,
} from "../types/api";

export function useLecturerPortalData(
  enabled: boolean,
  lecturerName: string,
  onError?: (msg: string) => void,
  semesterId?: string | null,
) {
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReportDto[]>([]);
  const [dashboardStats, setDashboardStats] = useState<LecturerDashboardStatsDto | null>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<LecturerWeeklyTrendDto[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [weeklyReportPage, setWeeklyReportPage] = useState({ total: 0, skip: 0, take: 20 });
  const [weeklyReportQuery, setWeeklyReportQuery] = useState({ status: "", searchTerm: "", skip: 0 });

  const loadWeeklyReports = useCallback(async (query = weeklyReportQuery) => {
    const result = await weeklyReportService.getAllForLecturer({
      semesterId: semesterId ?? undefined,
      skip: query.skip,
      take: 20,
      status: query.status || undefined,
      searchTerm: query.searchTerm || undefined,
    });
    setWeeklyReportPage({ total: result.total, skip: result.skip, take: result.take });
    setWeeklyReports(result.items);
    return result.items;
  }, [semesterId, weeklyReportQuery]);

  const load = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const [internships, assignedStudents, companies, allSubmissions, allWeeklyReports, stats, trend] =
        await Promise.all([
          lecturerInternshipsService.getAll(semesterId ?? undefined),
          lecturerInternshipsService.getStudents(semesterId ?? undefined),
          lecturerCompaniesService.getActive(semesterId ?? undefined),
          lecturerInternshipsService.getAllSubmissions(semesterId ?? undefined),
          loadWeeklyReports(),
          lecturerDashboardService.getStats(semesterId ?? undefined),
          lecturerDashboardService.getWeeklyTrend(semesterId ?? undefined),
        ]);

      const studentRows = assignedStudents.map((item: LecturerStudentListItemDto) =>
        mapLecturerStudentDtoToStudent(item, lecturerName),
      );

      const internshipCtx = new Map(
        internships.map((i) => [
          i.id,
          {
            studentName: i.student?.fullName,
            mssv: i.student?.studentCode,
            company: i.company?.companyName,
          },
        ]),
      );

      const submissionRows = allSubmissions.map((s) => {
        const ctx = s.internshipId ? internshipCtx.get(s.internshipId) : undefined;
        return mapSubmissionDtoToRow(s, ctx ?? {
          studentName: "—",
          mssv: "—",
          company: "—",
        });
      });

      const weeklyReportRows: Submission[] = allWeeklyReports.map((report) => {
        const ctx = internshipCtx.get(report.internshipId);
        const submittedAt = report.submittedAt ? formatViDate(report.submittedAt) : "—";
        return {
          id: `weekly:${report.id}`,
          sourceId: report.id,
          sourceType: "weeklyReport",
          studentName: ctx?.studentName ?? "—",
          mssv: ctx?.mssv ?? "—",
          avatar: "",
          company: ctx?.company ?? "—",
          reportType: "Báo cáo tuần",
          time: submittedAt !== "—" ? submittedAt.split(" ").slice(1).join(" ") : "—",
          date: submittedAt !== "—" ? submittedAt.split(" ")[0] : "—",
          status: report.status === "Submitted"
            ? "Chờ duyệt"
            : report.status === "RevisionRequested"
              ? "Yêu cầu sửa"
              : report.status === "Approved"
                ? "Đã duyệt"
                : mapWeeklyReportStatusToUi(report.status),
          fileName: report.fileName ?? "",
          fileUrl: report.fileUrl ?? "",
          fileSize: report.fileSize ? `${(report.fileSize / (1024 * 1024)).toFixed(1)} MB` : "—",
          summary: report.title,
          duplicateScore: 0,
          lecturerNote: report.lecturerComment ?? "",
          approvedAt: report.status === "Approved" ? report.updatedAt ?? undefined : undefined,
        };
      });

      setStudents(studentRows);
      setSubmissions([...weeklyReportRows, ...submissionRows]);
      setWeeklyReports(allWeeklyReports);
      setEnterprises(companies.map(mapLecturerCompanySummaryToEnterprise));
      setDashboardStats(stats);
      setWeeklyTrend(trend);
    } catch (err) {
      const message = getApiErrorMessage(err);
      setError(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, lecturerName, semesterId, onError, loadWeeklyReports]);

  const queryWeeklyReports = useCallback((query: { status: string; searchTerm: string; skip: number }) => {
    setWeeklyReportQuery(query);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateSubmissionStatus = useCallback(
    async (id: string, uiStatus: string, note?: string) => {
      if (!enabled) return;
      try {
        if (id.startsWith("weekly:")) {
          await weeklyReportService.review(id.slice("weekly:".length), {
            status: mapUiWeeklyReportReviewStatusToApi(uiStatus),
            lecturerComment: note?.trim() || undefined,
          });
        } else {
          await submissionApiService.review(id, uiStatus, note);
        }
      } catch (err) {
        onError?.(getApiErrorMessage(err));
        throw err;
      }
    },
    [enabled, load, onError],
  );

  const reviewWeeklyReport = useCallback(
    async (id: string, uiStatus: string, comment?: string) => {
      if (!enabled) return;
      try {
        await weeklyReportService.review(id, {
          status: mapUiWeeklyReportReviewStatusToApi(uiStatus),
          lecturerComment: comment?.trim() || undefined,
        });
        await load();
      } catch (err) {
        onError?.(getApiErrorMessage(err));
      }
    },
    [enabled, load, onError],
  );

  return {
    students,
    submissions,
    enterprises,
    weeklyReports,
    weeklyReportPage,
    weeklyReportQuery,
    queryWeeklyReports,
    dashboardStats,
    weeklyTrend,
    isLoading,
    error,
    refresh: load,
    updateSubmissionStatus,
    reviewWeeklyReport,
  };
}
