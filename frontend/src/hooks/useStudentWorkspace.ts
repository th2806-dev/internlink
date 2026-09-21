import { useCallback, useEffect, useState } from "react";
import { useSemester } from "../contexts/SemesterContext";
import { lecturerInternshipsService } from "../services/lecturerInternships.service";
import { weeklyReportService } from "../services/weeklyReport.service";
import { evaluationService } from "../services/evaluation.service";
import { getApiErrorMessage } from "../lib/apiClient";
import type {
  InternshipDetailDto,
  LecturerStudentListItemDto,
  WeeklyReportDto,
  SubmissionDto,
  EvaluationDetailDto,
} from "../types/api";

export interface StudentWorkspaceData {
  detail: InternshipDetailDto | null;
  assignment: LecturerStudentListItemDto | null;
  weeklyReports: WeeklyReportDto[];
  submissions: SubmissionDto[];
  evaluation: EvaluationDetailDto | null;
  isLoading: boolean;
  error: string | null;
  sectionErrors: {
    reports: string | null;
    submissions: string | null;
    evaluation: string | null;
  };
  refresh: () => Promise<void>;
}

export function useStudentWorkspace(internshipId: string | undefined): StudentWorkspaceData {
  const { activeSemesterId, selectedSemester } = useSemester();
  const semesterId = selectedSemester?.id && selectedSemester.id !== "all"
    ? selectedSemester.id
    : activeSemesterId || undefined;

  const [detail, setDetail] = useState<InternshipDetailDto | null>(null);
  const [assignment, setAssignment] = useState<LecturerStudentListItemDto | null>(null);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReportDto[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionDto[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState({
    reports: null as string | null,
    submissions: null as string | null,
    evaluation: null as string | null,
  });

  const load = useCallback(async () => {
    if (!internshipId) {
      setIsLoading(false);
      return;
    }
    if (!semesterId) {
      setIsLoading(false);
      setError("Chưa có kỳ thực tập đang hoạt động.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSectionErrors({ reports: null, submissions: null, evaluation: null });
    try {
      const [detailData, assignedStudents] = await Promise.all([
        lecturerInternshipsService.getById(internshipId),
        lecturerInternshipsService.getStudents(semesterId),
      ]);

      setDetail(detailData);
      setAssignment(
        assignedStudents.find((item) => item.internshipId === internshipId) ?? null,
      );
      const results = await Promise.allSettled([
        weeklyReportService.getByInternship(internshipId),
        lecturerInternshipsService.getSubmissions(internshipId, semesterId),
        evaluationService.getByInternship(internshipId),
      ]);

      const [reportsResult, submissionsResult, evaluationResult] = results;
      if (reportsResult.status === "fulfilled") setWeeklyReports(reportsResult.value);
      else setSectionErrors((previous) => ({ ...previous, reports: getApiErrorMessage(reportsResult.reason) }));
      if (submissionsResult.status === "fulfilled") setSubmissions(submissionsResult.value);
      else setSectionErrors((previous) => ({ ...previous, submissions: getApiErrorMessage(submissionsResult.reason) }));
      if (evaluationResult.status === "fulfilled") setEvaluation(evaluationResult.value);
      else setSectionErrors((previous) => ({ ...previous, evaluation: getApiErrorMessage(evaluationResult.reason) }));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [internshipId, semesterId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { detail, assignment, weeklyReports, submissions, evaluation, isLoading, error, sectionErrors, refresh: load };
}
