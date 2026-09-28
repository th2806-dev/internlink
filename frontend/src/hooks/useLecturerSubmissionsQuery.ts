import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import { lecturerInternshipsService } from "../services/lecturerInternships.service";
import { submissionApiService } from "../services/submissionApi.service";
import { weeklyReportService } from "../services/weeklyReport.service";
import {
  mapSubmissionDtoToRow,
  mapUiWeeklyReportReviewStatusToApi,
} from "../lib/portalMappers";
import type { Submission } from "../types/submission";

export interface UseLecturerSubmissionsQueryOptions {
  semesterId?: string | null;
  enabled?: boolean;
}

export function useLecturerSubmissionsQuery({
  semesterId,
  enabled = true,
}: UseLecturerSubmissionsQueryOptions = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.lecturer.submissions.list(semesterId),
    queryFn: async ({ signal }) => {
      const [rawSubmissions, rawStudents] = await Promise.all([
        lecturerInternshipsService.getAllSubmissions(semesterId ?? undefined, {
          signal,
        }),
        lecturerInternshipsService
          .getStudents(semesterId ?? undefined, { signal })
          .catch(() => []),
      ]);

      const studentMap = new Map(rawStudents.map((s) => [s.id, s]));

      const mappedSubmissions: Submission[] = rawSubmissions.map((s) => {
        const student = studentMap.get(s.studentId);
        return mapSubmissionDtoToRow(s, {
          studentName: student?.fullName || s.studentName,
          mssv: student?.studentCode || s.studentCode,
          company: student?.companyName || s.companyName,
        });
      });

      return mappedSubmissions;
    },
    enabled,
    placeholderData: keepPreviousData,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      newStatus,
      note,
    }: {
      id: string;
      newStatus: string;
      note?: string;
    }) => {
      if (id.startsWith("weekly:")) {
        await weeklyReportService.review(id.slice("weekly:".length), {
          status: mapUiWeeklyReportReviewStatusToApi(newStatus),
          lecturerComment: note?.trim() || undefined,
        });
      } else {
        await submissionApiService.review(id, newStatus, note);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.lecturer.submissions.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.lecturerReports.all,
      });
    },
  });

  const updateSubmissionStatus = async (
    id: string,
    newStatus: string,
    note?: string,
  ) => {
    return updateMutation.mutateAsync({ id, newStatus, note });
  };

  return {
    submissions: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    updateSubmissionStatus,
    isUpdating: updateMutation.isPending,
  };
}
