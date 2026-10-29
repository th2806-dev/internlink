import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { INTERNSHIP_WEEKS } from "../config/internship";
import { getApiErrorMessage } from "../lib/apiClient";
import { mapInternshipStatusToUi, mapWeeklyReportStatusToUi } from "../lib/portalMappers";
import { queryKeys } from "../lib/queryKeys";
import { studentPortalService } from "../services/studentPortal.service";
import { weeklyReportService } from "../services/weeklyReport.service";
import type { StudentProfile } from "../types/common";
import type { InternshipDto, StudentPortalProfileDto } from "../types/api";
import { useAuth } from "./useAuth";
import { useSemester } from "../contexts/SemesterContext";

const DEFAULT_LOGO =
  "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=120&auto=format&fit=crop&q=80";

const DEFAULT_EMPTY_STUDENT_PROFILE: StudentProfile = {
  name: "Sinh viên",
  mssv: "—",
  class: "—",
  semester: "—",
  major: "—",
  company: "—",
  companyLogo: DEFAULT_LOGO,
  position: "—",
  statusBadge: "Đang tải…",
  overallProgress: 0,
  currentGrade: 0,
  reportsSubmitted: 0,
  totalReports: INTERNSHIP_WEEKS,
  lecturerName: "—",
  supervisorName: "—",
  supervisorEmail: "—",
  supervisorPhone: "—",
  companyAddress: "—",
  currentPhase: "Chưa bắt đầu thực tập",
};

function internshipStatusToBadge(status: string): string {
  const map: Record<string, string> = {
    NotStarted: "Chưa bắt đầu",
    InProgress: "Đang thực tập",
    BehindSchedule: "Chậm tiến độ",
    AwaitingFeedback: "Chờ phản hồi",
    RequiresRevision: "Cần chỉnh sửa",
    Completed: "Hoàn thành",
    Graded: "Đã chấm điểm",
  };
  return map[status] ?? mapInternshipStatusToUi(status);
}

export function buildStudentProfileFromPortal(
  portal: StudentPortalProfileDto,
  weeklyReportCount = 0,
  approvedWeeklyCount = 0,
  totalWeeks = INTERNSHIP_WEEKS,
  semesterName?: string,
): StudentProfile {
  const student = portal.student;
  const internship = portal.internship;
  const company = internship?.company;

  return {
    name: student.fullName,
    mssv: student.studentCode,
    class: student.class ?? "—",
    semester: semesterName?.trim() || "Học kỳ hiện tại",
    major: student.major ?? "—",
    company: company?.companyName ?? "Chưa có doanh nghiệp",
    companyLogo: DEFAULT_LOGO,
    position: internship?.position ?? "—",
    statusBadge: internshipStatusToBadge(internship?.status ?? "NotStarted"),
    overallProgress: portal.progressPercent ?? 0,
    progressBreakdown: portal.progressBreakdown ?? null,
    currentGrade: 0,
    reportsSubmitted: approvedWeeklyCount,
    totalReports: Math.max(weeklyReportCount, approvedWeeklyCount, totalWeeks),
    lecturerName: portal.lecturerName ?? "—",
    lecturerEmail: portal.lecturerEmail ?? "—",
    lecturerPhone: portal.lecturerPhone ?? "—",
    supervisorName:
      company?.contactPerson?.trim() ||
      internship?.supervisorName?.trim() ||
      "Chưa có mentor",
    supervisorEmail: company?.contactEmail?.trim() || "—",
    supervisorPhone: company?.contactPhone?.trim() || "—",
    companyAddress: company?.address?.trim() || company?.industry?.trim() || "—",
    currentPhase: internship
      ? `${internshipStatusToBadge(internship.status)}${weeklyReportCount > 0 ? ` • ${weeklyReportCount} báo cáo tuần` : ""}`
      : "Chưa bắt đầu thực tập",
  };
}

export function useStudentPortalContext() {
  const { user, isLoggedIn } = useAuth();
  const { selectedSemester } = useSemester();
  const semesterWeeks = selectedSemester?.totalWeeks || INTERNSHIP_WEEKS;
  const semesterName = selectedSemester?.name?.trim();
  const portalQuery = useQuery({
    queryKey: queryKeys.student.profile(user?.id ?? user?.username),
    enabled: isLoggedIn,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const [portal, weeklyReports] = await Promise.all([
        studentPortalService.getMe(),
        weeklyReportService.getMine()
          .then((rows) => ({ rows, error: null }))
          .catch((error: unknown) => ({
            rows: [],
            error: getApiErrorMessage(error),
          })),
      ]);
      const approvedWeeklyCount = weeklyReports.rows.filter(
        (report) =>
          report.status === "Approved" ||
          mapWeeklyReportStatusToUi(report.status) === "Đã hoàn thành",
      ).length;
      return {
        portal,
        weeklyReportCount: weeklyReports.rows.length,
        approvedWeeklyCount,
        weeklyError: weeklyReports.error,
        internshipId: portal.internship?.id ?? weeklyReports.rows[0]?.internshipId ?? null,
      };
    },
  });
  const portalData = portalQuery.data?.portal ?? null;

  const profile: StudentProfile = useMemo(() => {
    if (portalData && portalQuery.data) {
      return buildStudentProfileFromPortal(
        portalData,
        portalQuery.data.weeklyReportCount,
        portalQuery.data.approvedWeeklyCount,
        semesterWeeks,
        semesterName,
      );
    }
    return {
      ...DEFAULT_EMPTY_STUDENT_PROFILE,
      name: user?.name ?? "Sinh viên",
      mssv: user?.username ?? "—",
      totalReports: semesterWeeks,
    };
  }, [portalData, portalQuery.data, user, semesterWeeks, semesterName]);

  const internship: InternshipDto | null = portalData?.internship ?? null;
  const refresh = async () => {
    await portalQuery.refetch();
  };

  return {
    profile,
    internship,
    internshipId: portalQuery.data?.internshipId ?? null,
    portalData,
    isArchiveReadOnly:
      portalData?.isArchiveReadOnly ?? user?.isArchiveReadOnly ?? false,
    isLoading: portalQuery.isLoading,
    error: portalQuery.error
      ? getApiErrorMessage(portalQuery.error)
      : portalQuery.data?.weeklyError ?? null,
    refresh,
  };
}
