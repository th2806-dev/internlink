import { apiRequestRaw, ApiClientError } from "../lib/apiClient";

import type {
  CreateEvaluationRequestDto,
  EvaluationDetailDto,
  EvaluationListItemDto,
  UpdateEvaluationRequestDto,
} from "../types/api";

export type UiEvaluationPayload = {
  id?: string;
  internshipId?: string;
  enterpriseScore?: number;
  lecturerScore?: number;
  presentationScore?: number;
  lecturerComments?: string;
};

/**
 * Map the 4 UI score fields to the 4 backend entity fields.
 *
 * Mapping (aligned with docs rubric 40/20/20/20):
 *   enterpriseScore    → CommunicationScore  (Đánh giá DN → Kỹ năng giao tiếp/làm việc)
 *   lecturerScore      → TechnicalScore      (Đánh giá GV → Chuyên môn kỹ thuật)
 *   presentationScore  → InitiativeScore     (Bảo vệ/Hội đồng → Chủ động/Phản biện)
 *   (derived average)  → TeamworkScore       (Trung bình 3 điểm còn lại)
 *
 * No lossy overwrites; every UI field maps to exactly one backend field.
 */
function toScoreBody(s: UiEvaluationPayload): UpdateEvaluationRequestDto {
  const tech = Math.round(s.lecturerScore ?? 8);
  const comm = Math.round(s.enterpriseScore ?? 8);
  const init = Math.round(s.presentationScore ?? 8);
  // Teamwork derived as average of the other 3 (keeps all 4 fields populated)
  const team = Math.round((tech + comm + init) / 3);

  return {
    technicalScore: tech,
    communicationScore: comm,
    teamworkScore: team,
    initiativeScore: init,
    comments: s.lecturerComments?.trim() || undefined,
  };
}

function isGuid(id?: string) {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

type DefenseStatus = EvaluationDetailDto["defenseStatus"];

const defenseStatusValues: Record<DefenseStatus, number> = {
  NotScheduled: 0,
  Scheduled: 1,
  Completed: 2,
};

function normalizeDefenseStatus(value: DefenseStatus | number): DefenseStatus {
  if (typeof value === "number") {
    return value === 2 ? "Completed" : value === 1 ? "Scheduled" : "NotScheduled";
  }
  return value;
}

function normalizeEvaluationDetail(evaluation: EvaluationDetailDto): EvaluationDetailDto {
  return {
    ...evaluation,
    defenseStatus: normalizeDefenseStatus(evaluation.defenseStatus),
  };
}

export const evaluationService = {
  list(skip = 0, take = 500): Promise<EvaluationListItemDto[]> {
    return apiRequestRaw<EvaluationListItemDto[]>(
      `/api/Evaluation?skip=${skip}&take=${take}`,
    );
  },

  getById(id: string): Promise<EvaluationDetailDto> {
    return apiRequestRaw<EvaluationDetailDto>(`/api/Evaluation/${id}`).then(normalizeEvaluationDetail);
  },

  getByInternship(internshipId: string): Promise<EvaluationDetailDto | null> {
    return apiRequestRaw<EvaluationDetailDto>(
      `/api/Evaluation/internship/${internshipId}`,
    ).then(normalizeEvaluationDetail).catch((error) => {
      if (error instanceof ApiClientError && error.status === 404) return null;
      throw error;
    });
  },

  create(body: CreateEvaluationRequestDto): Promise<EvaluationDetailDto> {
    return apiRequestRaw<EvaluationDetailDto>("/api/Evaluation", {
      method: "POST",
      body,
    });
  },

  update(
    id: string,
    body: UpdateEvaluationRequestDto,
  ): Promise<EvaluationDetailDto> {
    return apiRequestRaw<EvaluationDetailDto>(`/api/Evaluation/${id}`, {
      method: "PUT",
      body,
    });
  },

  finalize(id: string): Promise<EvaluationDetailDto> {
    return apiRequestRaw<EvaluationDetailDto>(
      `/api/Evaluation/${id}/finalize`,
      { method: "POST" },
    );
  },

  updateDefense(
    id: string,
    body: {
      defenseDate?: string | null;
      defenseStatus: "NotScheduled" | "Scheduled" | "Completed";
      defenseCouncilName?: string | null;
      defenseExaminerName?: string | null;
    },
  ): Promise<EvaluationDetailDto> {
    return apiRequestRaw<EvaluationDetailDto>(`/api/Lecturer/evaluations/${id}/defense`, {
      method: "PUT",
      body: { ...body, defenseStatus: defenseStatusValues[body.defenseStatus] },
    }).then(normalizeEvaluationDetail);
  },

  /**
   * Schedule defense for an internship.
   * If an evaluation already exists, update its defense fields.
   * If no evaluation exists yet, create a draft evaluation (scores = 0, not finalized)
   * and set the defense fields — so lecturers can schedule the defense before grading.
   */
  async scheduleDefense(
    internshipId: string,
    body: {
      defenseDate?: string | null;
      defenseStatus: "NotScheduled" | "Scheduled" | "Completed";
      defenseCouncilName?: string | null;
      defenseExaminerName?: string | null;
    },
  ): Promise<EvaluationDetailDto> {
    const existing = await this.getByInternship(internshipId);
    if (existing) {
      return this.updateDefense(existing.id, body);
    }
    const draft = await this.create({
      internshipId,
      technicalScore: 0,
      communicationScore: 0,
      teamworkScore: 0,
      initiativeScore: 0,
      isFinalized: false,
    });
    return this.updateDefense(draft.id, body);
  },

  /**
   * Map UI grading form → create/update + optional finalize.
   * Fixes: no duplicate finalScore overwrite, correct field mapping.
   */
  async persistFromUi(
    student: UiEvaluationPayload,
    finalize: boolean,
  ): Promise<EvaluationDetailDto> {
    const scores = toScoreBody(student);

    if (isGuid(student.id)) {
      await this.update(student.id!, scores);
      if (finalize) {
        return this.finalize(student.id!);
      }
      return this.getById(student.id!);
    }

    if (!student.internshipId) {
      throw new Error("Thiếu internshipId để tạo đánh giá");
    }

    return this.create({
      internshipId: student.internshipId,
      technicalScore: scores.technicalScore ?? 8,
      communicationScore: scores.communicationScore ?? 8,
      teamworkScore: scores.teamworkScore ?? 8,
      initiativeScore: scores.initiativeScore ?? 8,
      comments: scores.comments,
      isFinalized: finalize,
    });
  },
};
