import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getApiErrorMessage } from "../lib/apiClient";
import { mapLecturerCompanySummaryToEnterprise } from "../lib/adminMappers";
import {
  mapLecturerStudentDtoToStudent,
  mapSubmissionDtoToRow,
  mapWeeklyReportStatusToUi,
  mapUiWeeklyReportReviewStatusToApi,
  formatViDate,
} from "../lib/portalMappers";
import { queryKeys } from "../lib/queryKeys";
import { useAuth } from "../contexts/AuthContext";
import { lecturerCompaniesService } from "../services/lecturerCompanies.service";
import { lecturerInternshipsService } from "../services/lecturerInternships.service";
import { submissionApiService } from "../services/submissionApi.service";
import { weeklyReportService } from "../services/weeklyReport.service";
import { lecturerDashboardService } from "../services/lecturerDashboard.service";
import { attendanceService } from "../services/attendance.service";
import {
  semesterReportScheduleService,
  type SemesterReportScheduleDto,
} from "../services/semesterReportSchedule.service";
import type { Student } from "../types/student";
import type { Submission } from "../types/submission";
import type {
  LecturerStudentListItemDto,
} from "../types/api";

export interface LecturerProfileData {
  staffCode: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
}

const EMPTY_REPORT_TOTALS = { total: 0, pending: 0, revision: 0, approved: 0 };

export function useLecturerPortalData(
  enabled: boolean,
  lecturerName: string,
  onError?: (msg: string) => void,
  semesterId?: string | null,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [weeklyReportQuery, setWeeklyReportQuery] = useState({
    status: "",
    searchTerm: "",
    skip: 0,
  });

  const portalQuery = useQuery({
    queryKey: queryKeys.lecturerPortal.data({
      semesterId: semesterId ?? "all",
      lecturerId: user?.id ?? user?.username ?? "",
    }),
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [
        internships,
        assignedStudents,
        companies,
        allSubmissions,
        stats,
        trend,
        meOverview,
        schedulesData,
        absenceSummary,
      ] = await Promise.all([
        lecturerInternshipsService.getAll(semesterId ?? undefined),
        lecturerInternshipsService.getStudents(semesterId ?? undefined),
        lecturerCompaniesService.getActive(semesterId ?? undefined),
        lecturerInternshipsService.getAllSubmissions(semesterId ?? undefined),
        lecturerDashboardService.getStats(semesterId ?? undefined),
        lecturerDashboardService.getWeeklyTrend(semesterId ?? undefined),
        apiRequest<{ lecturer?: { staffCode?: string; fullName?: string; email?: string; phone?: string; department?: string } }>("/api/Lecturer/me"),
        semesterId && semesterId !== "all"
          ? semesterReportScheduleService.getSchedules(semesterId)
          : Promise.resolve([] as SemesterReportScheduleDto[]),
        semesterId && semesterId !== "all"
          ? attendanceService.getStudentAbsenceSummary(semesterId).catch((absenceError: unknown) => {
              onError?.(getApiErrorMessage(absenceError));
              return null;
            })
          : Promise.resolve(null),
      ]);

      const profile: LecturerProfileData | null = meOverview?.lecturer
        ? {
            staffCode: meOverview.lecturer.staffCode || "",
            fullName: meOverview.lecturer.fullName || lecturerName,
            email: meOverview.lecturer.email || "",
            phone: meOverview.lecturer.phone || "",
            department: meOverview.lecturer.department || "",
          }
        : null;

      const finalReportInternshipIds = new Set(
        allSubmissions
          .filter((submission) => submission.type === "FinalReport")
          .map((submission) => submission.internshipId),
      );
      const studentRows: Student[] = assignedStudents.map((item: LecturerStudentListItemDto) => ({
        ...mapLecturerStudentDtoToStudent(item, lecturerName),
        studentId: item.studentId,
        absentCount: absenceSummary === null ? undefined : absenceSummary[item.studentId] ?? 0,
        hasFinalReport: finalReportInternshipIds.has(item.internshipId),
      }));

      const internshipContext = Object.fromEntries(
        internships.map((internship) => [
          internship.id,
          {
            studentName: internship.student?.fullName,
            mssv: internship.student?.studentCode,
            company: internship.company?.companyName,
          },
        ]),
      );
      const submissionRows = allSubmissions.map((submission) => {
        const ctx = submission.internshipId
          ? internshipContext[submission.internshipId]
          : undefined;
        return mapSubmissionDtoToRow(submission, ctx ?? {
          studentName: "—",
          mssv: "—",
          company: "—",
        });
      });

      return {
        profile,
        schedules: schedulesData,
        students: studentRows,
        submissions: submissionRows,
        enterprises: companies.map(mapLecturerCompanySummaryToEnterprise),
        internshipContext,
        dashboardStats: stats,
        weeklyTrend: trend,
      };
    },
  });

  const reportsQuery = useQuery({
    queryKey: queryKeys.lecturerReports.list({
      semesterId: semesterId ?? "all",
      lecturerId: user?.id ?? user?.username ?? "",
      status: weeklyReportQuery.status,
      searchTerm: weeklyReportQuery.searchTerm,
      skip: weeklyReportQuery.skip,
      take: 100,
    }),
    enabled,
    staleTime: 2 * 60 * 1000,
    queryFn: () =>
      weeklyReportService.getAllForLecturer({
        semesterId: semesterId ?? undefined,
        skip: weeklyReportQuery.skip,
        take: 100,
        status: weeklyReportQuery.status || undefined,
        searchTerm: weeklyReportQuery.searchTerm || undefined,
      }),
  });

  const totalsQuery = useQuery({
    queryKey: queryKeys.lecturerReports.totals(
      semesterId,
      user?.id ?? user?.username,
    ),
    enabled,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!semesterId || semesterId === "all") return EMPTY_REPORT_TOTALS;
      const countBy = (status?: string) =>
        weeklyReportService.getAllForLecturer({
          semesterId,
          skip: 0,
          take: 1,
          status,
        }).then((result) => result.total);
      const [total, pending, revision, approved] = await Promise.all([
        countBy(),
        countBy("Submitted"),
        countBy("RevisionRequested"),
        countBy("Approved"),
      ]);
      return { total, pending, revision, approved };
    },
  });

  useEffect(() => {
    if (portalQuery.error) onError?.(getApiErrorMessage(portalQuery.error));
  }, [portalQuery.error, onError]);
  useEffect(() => {
    if (reportsQuery.error) onError?.(getApiErrorMessage(reportsQuery.error));
  }, [reportsQuery.error, onError]);
  useEffect(() => {
    if (totalsQuery.error) onError?.(getApiErrorMessage(totalsQuery.error));
  }, [totalsQuery.error, onError]);

  const queryWeeklyReports = useCallback((query: { status: string; searchTerm: string; skip: number }) => {
    setWeeklyReportQuery(query);
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([
      portalQuery.refetch(),
      reportsQuery.refetch(),
      totalsQuery.refetch(),
    ]);
  }, [portalQuery, reportsQuery, totalsQuery]);

  const invalidateLecturerData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.lecturerPortal.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.lecturerReports.all }),
    ]);
  }, [queryClient]);

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
        await invalidateLecturerData();
      } catch (err) {
        onError?.(getApiErrorMessage(err));
        throw err;
      }
    },
    [enabled, invalidateLecturerData, onError],
  );

  const reviewWeeklyReport = useCallback(
    async (id: string, uiStatus: string, comment?: string) => {
      if (!enabled) return;
      try {
        await weeklyReportService.review(id, {
          status: mapUiWeeklyReportReviewStatusToApi(uiStatus),
          lecturerComment: comment?.trim() || undefined,
        });
        await invalidateLecturerData();
      } catch (err) {
        onError?.(getApiErrorMessage(err));
      }
    },
    [enabled, invalidateLecturerData, onError],
  );

  const data = portalQuery.data;
  const weeklyReports = reportsQuery.data?.items ?? [];
  const weeklyReportRows: Submission[] = weeklyReports.map((report) => {
    const ctx = data?.internshipContext[report.internshipId];
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
      submittedAt: report.submittedAt ?? undefined,
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
  const submissions = [...weeklyReportRows, ...(data?.submissions ?? [])].sort((a, b) => {
    const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return timeB - timeA;
  });
  return {
    profile: data?.profile ?? null,
    schedules: data?.schedules ?? [],
    students: data?.students ?? [],
    submissions,
    enterprises: data?.enterprises ?? [],
    weeklyReports,
    weeklyReportPage: {
      total: reportsQuery.data?.total ?? 0,
      skip: reportsQuery.data?.skip ?? weeklyReportQuery.skip,
      take: reportsQuery.data?.take ?? 100,
    },
    weeklyReportQuery,
    weeklyReportTotals: totalsQuery.data ?? EMPTY_REPORT_TOTALS,
    queryWeeklyReports,
    dashboardStats: data?.dashboardStats ?? null,
    weeklyTrend: data?.weeklyTrend ?? [],
    isLoading: portalQuery.isLoading || reportsQuery.isLoading,
    error: portalQuery.error
      ? getApiErrorMessage(portalQuery.error)
      : reportsQuery.error
        ? getApiErrorMessage(reportsQuery.error)
        : null,
    refresh,
    updateSubmissionStatus,
    reviewWeeklyReport,
  };
}
