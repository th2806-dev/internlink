import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import { weeklyReportService } from "../services/weeklyReport.service";
import {
  semesterReportScheduleService,
  type SemesterReportScheduleDto,
} from "../services/semesterReportSchedule.service";
import { mapWeeklyReportDtoToUi } from "../lib/portalMappers";
import type { WeeklyReportDto } from "../types/api";

export type WeeklyReportRow = {
  id?: string;
  internshipId?: string;
  weekNumber: number;
  title: string;
  content?: string;
  deadline: string;
  allowLateSubmission?: boolean;
  scheduleDueDate?: string;
  scheduleStartDate?: string | null;
  submittedAt: string | null;
  version: string;
  status: string;
  fileName?: string;
  fileSize?: string;
  versions?: {
    id: string;
    version: number;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
  }[];
  feedback?: string;
  feedbackDate?: string;
  stepIndex: number;
};

export interface UseStudentWeeklyReportsQueryOptions {
  semesterId?: string | null;
  enabled?: boolean;
}

export function useStudentWeeklyReportsQuery({
  semesterId,
  enabled = true,
}: UseStudentWeeklyReportsQueryOptions = {}) {
  const queryClient = useQueryClient();

  const queryKey = queryKeys.student.weeklyReports.list({
    semesterId: semesterId ?? "all",
  });

  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const [rawReports, schedules] = await Promise.all([
        weeklyReportService.getMine({ signal }),
        semesterId && semesterId !== "all"
          ? semesterReportScheduleService
              .getSchedules(semesterId, { signal })
              .catch(() => [] as SemesterReportScheduleDto[])
          : Promise.resolve([] as SemesterReportScheduleDto[]),
      ]);

      const mappedReports: WeeklyReportRow[] =
        rawReports.map(mapWeeklyReportDtoToUi);

      return {
        rawReports,
        reports: mappedReports,
        schedules,
      };
    },
    enabled,
    placeholderData: keepPreviousData,
  });

  const submitMutation = useMutation({
    mutationFn: async ({
      internshipId,
      weekNumber,
      title,
      file,
      reportId,
    }: {
      internshipId: string;
      weekNumber: number;
      title: string;
      file: File;
      reportId?: string;
    }) => {
      let uploaded: WeeklyReportDto;
      if (!reportId) {
        uploaded = await weeklyReportService.upload({
          internshipId,
          weekNumber,
          title,
          file,
        });
      } else {
        uploaded = await weeklyReportService.uploadRevision(
          reportId,
          title,
          file,
        );
      }

      if (uploaded?.id) {
        await weeklyReportService.submit(uploaded.id);
      }
      return uploaded;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.student.weeklyReports.all,
      });
      if (semesterId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.student.dashboard(semesterId),
        });
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reportId: string) =>
      weeklyReportService.cancelSubmission(reportId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.student.weeklyReports.all,
      });
      if (semesterId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.student.dashboard(semesterId),
        });
      }
    },
  });

  return {
    reports: query.data?.reports ?? [],
    rawReports: query.data?.rawReports ?? [],
    schedules: query.data?.schedules ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    submitReport: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    cancelSubmission: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
  };
}
