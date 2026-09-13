import { apiRequest, apiRequestRaw, ApiClientError } from "../lib/apiClient";
import type {
  EvaluationRubricDto,
  EvaluationRubricCriterionDto,
  EvaluationRubricStatus,
  RubricApplicationMode,
} from "../types/evaluation";

// --- API DTOs (backend shape) ---

interface RubricCriterionApiDto {
  id: string;
  name: string;
  description?: string | null;
  weight: number;
  maxScore: number;
  orderIndex: number;
}

interface RubricApiDto {
  id: string;
  semesterId: string;
  name: string;
  applicationMode: string;
  status: string;
  criteria: RubricCriterionApiDto[];
  rejectionReason?: string | null;
  submittedByName?: string | null;
  submittedAt?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

interface CreateRubricCriterionRequest {
  name: string;
  description?: string;
  weight: number;
  maxScore: number;
  orderIndex: number;
}

interface CreateRubricRequest {
  name: string;
  applicationMode: string;
  criteria: CreateRubricCriterionRequest[];
}

interface UpdateRubricRequest {
  name?: string;
  applicationMode?: string;
  criteria?: {
    name?: string;
    description?: string;
    weight?: number;
    maxScore?: number;
    orderIndex?: number;
  }[];
}

// --- Mappers ---

function mapCriterionFromApi(c: RubricCriterionApiDto): EvaluationRubricCriterionDto {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    weight: c.weight,
    maxScore: c.maxScore,
    orderIndex: c.orderIndex,
  };
}

function mapFromApi(r: RubricApiDto): EvaluationRubricDto {
  return {
    id: r.id,
    semesterId: r.semesterId,
    name: r.name,
    applicationMode: r.applicationMode as RubricApplicationMode,
    status: r.status as EvaluationRubricStatus,
    criteria: r.criteria.map(mapCriterionFromApi),
    rejectionReason: r.rejectionReason ?? null,
    submittedAt: r.submittedAt ?? null,
    reviewedAt: r.approvedAt ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt ?? null,
  };
}

// --- Service ---

export const rubricService = {
  /**
   * Get rubric for a semester
   */
  async getBySemester(semesterId: string): Promise<EvaluationRubricDto | null> {
    try {
      const raw = await apiRequest<RubricApiDto>(
        `/api/Admin/semesters/${semesterId}/rubric`,
      );
      if (!raw || typeof raw !== "object" || !("criteria" in raw) || !("id" in raw)) {
        return null;
      }
      return mapFromApi(raw as RubricApiDto);
    } catch {
      return null;
    }
  },

  /**
   * Get approved rubric for a semester (lecturer view)
   */
  async getApproved(semesterId: string): Promise<EvaluationRubricDto | null> {
    try {
      const raw = await apiRequestRaw<RubricApiDto>(
        `/api/Lecturer/rubric?semesterId=${semesterId}`,
      );
      return mapFromApi(raw);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) return null;
      throw error;
    }
  },

  /** Get the approved rubric for a student's current semester. */
  async getStudentApproved(semesterId: string): Promise<EvaluationRubricDto | null> {
    try {
      const raw = await apiRequestRaw<RubricApiDto>(
        `/api/Evaluation/rubric?semesterId=${semesterId}`,
      );
      return mapFromApi(raw);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) return null;
      throw error;
    }
  },

  /**
   * Create a new rubric
   */
  async create(
    semesterId: string,
    request: CreateRubricRequest,
  ): Promise<EvaluationRubricDto> {
    const raw = await apiRequest<RubricApiDto>(
      `/api/Admin/semesters/${semesterId}/rubric`,
      {
        method: "POST",
        body: request,
      },
    );
    if (!raw || typeof raw !== "object" || !("criteria" in raw) || !("id" in raw)) {
      throw new Error("Phản hồi tạo rubric không hợp lệ");
    }
    return mapFromApi(raw as RubricApiDto);
  },

  /**
   * Update rubric
   */
  async update(
    semesterId: string,
    request: UpdateRubricRequest,
  ): Promise<EvaluationRubricDto> {
    const raw = await apiRequest<RubricApiDto>(
      `/api/Admin/semesters/${semesterId}/rubric`,
      {
        method: "PUT",
        body: request,
      },
    );
    if (!raw || typeof raw !== "object" || !("criteria" in raw) || !("id" in raw)) {
      throw new Error("Phản hồi cập nhật rubric không hợp lệ");
    }
    return mapFromApi(raw as RubricApiDto);
  },

  /**
   * Delete rubric
   */
  async delete(semesterId: string): Promise<void> {
    await apiRequest(`/api/Admin/semesters/${semesterId}/rubric`, {
      method: "DELETE",
    });
    return;
  },

  /**
   * Save rubric-based evaluation scores for a student.
   * If an evaluation already exists it is updated; otherwise a draft evaluation
   * is created first so rubric scoring does not depend on legacy score fields.
   */
  async saveScores(
    evaluationId: string | undefined,
    criteriaScores: {
      criterionId: string;
      criterionName: string;
      weight: number;
      maxScore: number;
      score: number;
      comment?: string;
    }[],
    comments?: string,
    internshipId?: string,
    finalize?: boolean,
  ): Promise<{
    evaluationId: string;
    finalGrade: number;
    isFinalized: boolean;
  }> {
    if (evaluationId) {
      const saved = await apiRequestRaw<{
        evaluationId: string;
        finalGrade: number;
        isFinalized: boolean;
      }>(
        `/api/Lecturer/evaluation/${evaluationId}/scores`,
        {
          method: "PUT",
          body: { criteriaScores, comments },
        },
      );
      if (finalize) {
        return apiRequestRaw(`/api/Evaluation/${evaluationId}/finalize`, {
          method: "POST",
        });
      }
      return saved;
    }

    if (!internshipId) {
      throw new Error("Không tìm thấy thực tập để lưu điểm rubric.");
    }

    return apiRequestRaw(
      `/api/Lecturer/evaluation/scores`,
      {
        method: "POST",
        body: {
          internshipId,
          criteriaScores,
          comments,
          finalize: finalize ?? false,
        },
      },
    );
  },

  /**
   * Get evaluation scores for a student (lecturer/student view)
   */
  async getScores(
    evaluationId: string,
  ): Promise<{
    evaluationId: string;
    criteriaScores: {
      criterionId?: string;
      criterionName: string;
      weight: number;
      maxScore: number;
      score: number;
      comment?: string;
    }[];
    finalGrade: number;
    isFinalized: boolean;
  }> {
    return apiRequestRaw(
      `/api/Lecturer/evaluation/${evaluationId}/scores`,
    );
  },

  async getStudentScores(evaluationId: string): Promise<Awaited<ReturnType<typeof rubricService.getScores>>> {
    return apiRequestRaw(
      `/api/Evaluation/${evaluationId}/scores`,
    );
  },

  /**
   * Get all students assigned to lecturer (with evaluation status)
   */
  async getLecturerStudents(semesterId?: string): Promise<
    {
      studentId: string;
      internshipId: string;
      semesterId?: string | null;
      studentCode: string;
      fullName: string;
      email?: string | null;
      phone?: string | null;
      class?: string | null;
      major?: string | null;
      companyId?: string | null;
      companyName?: string | null;
      position?: string | null;
      internshipStatus: string;
      weeklyReportCount: number;
      evaluationId?: string | null;
      hasEvaluation: boolean;
      isEvaluationFinalized: boolean;
      finalGrade?: number | null;
      progressPercent: number;
    }[]
  > {
    const qs = semesterId ? `?semesterId=${semesterId}` : "";
    return apiRequestRaw(`/api/Lecturer/evaluation-students${qs}`);
  },
};
