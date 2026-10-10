import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import { lecturerInternshipsService } from "../services/lecturerInternships.service";
import { submissionApiService } from "../services/submissionApi.service";
import { weeklyReportService } from "../services/weeklyReport.service";
import { signalRNotificationService } from "../services/signalr.service";
import {
  mapSubmissionDtoToRow,
  mapUiWeeklyReportReviewStatusToApi,
} from "../lib/portalMappers";
import type { Submission } from "../types/submission";

interface LecturerSubmissionListData {
  submissions: Submission[];
  studentByInternship: Record<
    string,
    { studentName: string; mssv: string; company: string }
  >;
}

const EMPTY_STUDENT_CONTEXT: LecturerSubmissionListData["studentByInternship"] = {};

export interface UseLecturerSubmissionsQueryOptions {
  semesterId?: string | null;
  enabled?: boolean;
  onUpdated?: () => void;
}

export function useLecturerSubmissionsQuery({
  semesterId,
  enabled = true,
  onUpdated,
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

      const internshipCtx = new Map<
        string,
        { studentName?: string; mssv?: string; company?: string }
      >();
      for (const s of rawStudents) {
        internshipCtx.set(s.internshipId, {
          studentName: s.fullName,
          mssv: s.studentCode,
          company: s.companyName ?? undefined,
        });
      }

      const mappedSubmissions: Submission[] = rawSubmissions.map((s) => {
        const ctx = s.internshipId ? internshipCtx.get(s.internshipId) : undefined;
        return mapSubmissionDtoToRow(s, ctx ?? {
          studentName: "—",
          mssv: "—",
          company: "—",
        });
      });

      return {
        submissions: mappedSubmissions,
        studentByInternship: Object.fromEntries(internshipCtx),
      };
    },
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    const unsubscribe = signalRNotificationService.onNotification((notification) => {
      if (notification.link?.includes("/lecturer/reports")) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.lecturer.submissions.all,
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.lecturerReports.all,
        });
      }
    });
    void signalRNotificationService.start();
    return unsubscribe;
  }, [queryClient]);

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
    onSuccess: (_result, { id, newStatus }) => {
      queryClient.setQueriesData<LecturerSubmissionListData>(
        { queryKey: queryKeys.lecturer.submissions.all },
        (current) =>
          current
            ? {
                ...current,
                submissions: current.submissions.map((submission) =>
                  submission.id === id
                    ? { ...submission, status: newStatus }
                    : submission,
                ),
              }
            : current,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.lecturer.submissions.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.lecturerReports.all,
      });
      onUpdated?.();
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
    submissions: query.data?.submissions ?? [],
    studentByInternship: query.data?.studentByInternship ?? EMPTY_STUDENT_CONTEXT,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    updateSubmissionStatus,
    isUpdating: updateMutation.isPending,
  };
}
