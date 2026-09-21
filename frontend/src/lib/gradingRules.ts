/**
 * ============================================================================
 * CORE BUSINESS LOGIC — Module Quản lý Thực tập Doanh nghiệp — quy định chấm điểm mới
 * ============================================================================
 * Thực thi đúng quy định chấm điểm mới:
 *
 * 1) Kỳ báo cáo gồm 6 tuần (TUẦN 1..TUẦN 6) + 1 Báo cáo cuối kỳ.
 *    - Nộp trước/đúng deadline  → is_late = false, is_missing = false
 *    - Nộp sau deadline         → is_late = true
 *    - Quá deadline không nộp   → is_missing = true
 *
 * 2) Điều kiện dự thi (cột U — TỔNG): "Không đủ điều kiện" khi vi phạm 1 trong 2:
 *    - Không nộp báo cáo cuối kỳ (NỘP BC = "X" hoặc trống)
 *    - Số tuần vắng/không nộp báo cáo tuần (is_missing hoặc điểm danh V) >= 2 tuần
 *
 * 3) Điểm QT (cột I, thang 10, hệ số 40%):
 *    Điểm QT = MIN(10, Điểm_Nộp_Đủ + Điểm_Đúng_Hạn + Điểm_Chất_Lượng + Điểm_Cộng)
 *    - Nộp đủ   (max 2.0): 2.0 - (số bài thiếu * 0.5)
 *    - Đúng hạn (max 2.0): 2.0 - (số bài trễ * 0.5)
 *    - Chất lượng (max 5.0): rubric 5 mức 1.0 / 2.0 / 3.5 / 4.0 / 5.0
 *    - Cộng sáng tạo (+1.0): has_creative_product = true
 *
 * 4) Điểm Thi (cột J, thang 10, hệ số 60%): GVHD nhập tay.
 *
 * 5) Điểm TB (cột K) & Xếp loại (cột L):
 *    - Không đủ điều kiện → Điểm TB = 0, Xếp loại = "không thực tập"
 *    - Đủ điều kiện       → TB = ROUND(QT * 0.4 + Thi * 0.6, 1)
 *      >= 9.0 Xuất sắc | >= 8.0 Giỏi | >= 6.5 Khá | >= 5.0 Trung bình | < 5.0 Không đạt
 *
 * Module này là pure functions (không I/O) để dùng chung cho:
 *  - Màn hình 2 (chấm điểm rubric — tự nhảy Điểm QT tạm tính)
 *  - Màn hình 4 (bảng tổng hợp — tính real-time khi gõ Điểm Thi)
 *  - Unit tests (src/test/c23Grading.test.ts)
 * ============================================================================
 */

/** Số tuần báo cáo trong kỳ */
/** Vị trí báo cáo cuối kỳ, luôn đứng sau số tuần do kỳ thực tập cấu hình. */
export function getFinalReportWeek(totalWeeks: number): number {
  return Math.max(1, Math.trunc(totalWeeks)) + 1;
}

/** Thang điểm & hệ số */
export const GR_SUBMISSION_MAX = 2.0;
export const GR_PUNCTUALITY_MAX = 2.0;
export const GR_QUALITY_MAX = 5.0;
export const GR_CREATIVE_BONUS = 1.0;
export const GR_MISSING_PENALTY = 0.5;
export const GR_LATE_PENALTY = 0.5;
export const GR_PROCESS_WEIGHT = 0.4;
export const GR_ORAL_WEIGHT = 0.6;

/** Ngưỡng vắng/không nộp để bị mất điều kiện dự thi */
export const GR_MAX_MISSING_WEEKS = 2;

/** Ngưỡng cảnh báo "Sắp hết hạn" (ms) */
export const GR_CLOSING_SOON_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Rubric chất lượng bài — 5 mức theo quy định */
export const GR_QUALITY_RUBRIC_LEVELS = [
  { value: 1.0, label: "Không tốt" },
  { value: 2.0, label: "Trung bình" },
  { value: 3.5, label: "Tốt" },
  { value: 4.0, label: "Khá" },
  { value: 5.0, label: "Giỏi" },
] as const;

const VALID_QUALITY_LEVELS = new Set<number>(GR_QUALITY_RUBRIC_LEVELS.map((l) => l.value));

/** Ngưỡng xếp loại thang 10 (xấp xỉ trên, khớp Excel VLOOKUP approximate) */
export const GR_CLASSIFICATION_THRESHOLDS = [
  { min: 9.0, label: "Xuất sắc" },
  { min: 8.0, label: "Giỏi" },
  { min: 6.5, label: "Khá" },
  { min: 5.0, label: "Trung bình" },
  { min: 0.0, label: "Không đạt" },
] as const;

export const GR_INELIGIBLE_LABEL = "không thực tập";
export const GR_INELIGIBLE_REASON_NO_FINAL = "Chưa nộp báo cáo cuối kỳ";
export const GR_INELIGIBLE_REASON_ABSENCE = "Vắng buổi hẹn >= 2 buổi";

/** Nhãn hiển thị trên Excel cột U (TỔNG) */
export const GR_INELIGIBLE_CELL = "Không đủ điều kiện";

// ────────────────────────────────────────────────────────────────────────────
// Date helpers
// ────────────────────────────────────────────────────────────────────────────

/** Parse ngày từ backend (DateTime UTC, có thể thiếu suffix "Z") hoặc Date. */
export function parseGradingDate(value?: string | Date | null): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = value.trim();
  if (!raw) return null;
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const parsed = new Date(hasTimezone ? raw : `${raw}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Làm tròn kiểu Excel ROUND (half away from zero), mặc định 1 chữ số thập phân. */
export function roundScore(value: number, digits = 1): number {
  if (!Number.isFinite(value)) return 0;
  // Dùng ký pháp "e" trên chuỗi thập phân để tránh lỗi floating point (6.35 → 6.3)
  const shifted = Number(`${value}e${digits}`);
  const rounded = Math.round(shifted);
  return Number(`${rounded}e-${digits}`);
}

function clampScore(value: number | null | undefined, max = 10): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, value));
}

// ────────────────────────────────────────────────────────────────────────────
// 1) Trạng thái cửa sổ nộp bài (Màn hình 1: badge trạng thái)
// ────────────────────────────────────────────────────────────────────────────

export type ReportWindowStatus =
  | "disabled"      // Toggle tắt — không kích hoạt bài nộp
  | "unconfigured"  // Chưa chọn start_date / deadline
  | "upcoming"      // Chưa mở (bây giờ < start_date)
  | "open"          // Đang diễn ra
  | "closing_soon"  // Sắp hết hạn (còn <= 48h)
  | "closed";       // Đã đóng (bây giờ > deadline)

export const GR_REPORT_WINDOW_LABELS: Record<ReportWindowStatus, string> = {
  disabled: "Tạm dừng nhận bài",
  unconfigured: "Chưa cấu hình",
  upcoming: "Sắp diễn ra",
  open: "Đang diễn ra",
  closing_soon: "Sắp hết hạn",
  closed: "Đã đóng",
};

export function resolveReportWindow(params: {
  startDate?: string | Date | null;
  deadline?: string | Date | null;
  isEnabled?: boolean;
  now?: Date;
}): ReportWindowStatus {
  const { isEnabled = true } = params;
  if (!isEnabled) return "disabled";

  const start = parseGradingDate(params.startDate);
  const deadline = parseGradingDate(params.deadline);
  if (!deadline) return "unconfigured";

  const now = params.now ?? new Date();
  if (start && now < start) return "upcoming";
  if (now <= deadline) {
    return deadline.getTime() - now.getTime() <= GR_CLOSING_SOON_WINDOW_MS ? "closing_soon" : "open";
  }
  return "closed";
}

// ────────────────────────────────────────────────────────────────────────────
// 2) Trạng thái nộp bài từng tuần (is_late / is_missing)
// ────────────────────────────────────────────────────────────────────────────

export type SubmissionState = "on_time" | "late" | "missing" | "pending";

export const GR_SUBMISSION_LABELS: Record<SubmissionState, string> = {
  on_time: "Đúng hạn",
  late: "Nộp trễ",
  missing: "Không nộp",
  pending: "Chưa đến hạn",
};

/**
 * Quy tắc:
 *  - Có submittedAt <= deadline → on_time
 *  - Có submittedAt  > deadline → late
 *  - Không nộp, đã quá deadline → missing
 *  - Không nộp, chưa đến hạn    → pending (chưa tính thiếu/vắng)
 */
export function resolveSubmission(params: {
  submittedAt?: string | Date | null;
  deadline?: string | Date | null;
  now?: Date;
}): SubmissionState {
  const submittedAt = parseGradingDate(params.submittedAt);
  const deadline = parseGradingDate(params.deadline);
  const now = params.now ?? new Date();

  if (submittedAt) {
    if (!deadline || submittedAt <= deadline) return "on_time";
    return "late";
  }
  return deadline && now > deadline ? "missing" : "pending";
}

// ────────────────────────────────────────────────────────────────────────────
// 3) Tính điểm tổng hợp
// ────────────────────────────────────────────────────────────────────────────

export interface WeekRecord {
  /** 1..6 */
  weekNumber: number;
  /** Thời điểm sinh viên nộp báo cáo tuần (null = chưa nộp) */
  submittedAt?: string | Date | null;
  /** Hạn nộp của tuần này theo cấu hình kỳ báo cáo */
  deadline?: string | Date | null;
  /** Điểm danh buổi gặp tuần này = Vắng */
  isAbsent?: boolean;
}

export interface GradeInput {
  /** 6 báo cáo tuần */
  weeks?: WeekRecord[];
  /** Báo cáo cuối kỳ đã nộp chưa */
  finalReportSubmittedAt?: string | Date | null;
  finalReportDeadline?: string | Date | null;
  /** Mức rubric chất lượng do GV chọn: 1 / 2 / 3.5 / 4 / 5 (null = chưa chấm) */
  qualityLevel?: number | null;
  /** Có sản phẩm sáng tạo (+1.0) */
  hasCreativeProduct?: boolean;
  /** Điểm thi vấn đáp nhập tay (0..10) */
  oralExamScore?: number | null;
  now?: Date;
}

export interface GradeResult {
  /** Trạng thái từng tuần (1..6) */
  weekStates: { weekNumber: number; state: SubmissionState }[];
  /** Các tuần bị tính thiếu/vắng (is_missing hoặc điểm danh V) — union theo tuần */
  missingWeeks: number[];
  /** Các tuần nộp trễ */
  lateWeeks: number[];
  missingCount: number;
  lateCount: number;
  finalReportSubmitted: boolean;
  finalReportLate: boolean;

  /** Cột U — điều kiện dự thi */
  isEligible: boolean;
  ineligibilityReasons: string[];

  /** Thành phần Điểm QT */
  submissionPoints: number;   // max 2.0
  punctualityPoints: number;  // max 2.0
  qualityPoints: number;      // max 5.0
  creativeBonus: number;      // 0 | 1
  /** Cột I — Điểm QT = MIN(10, tổng thành phần) */
  processScore: number;

  /** Cột J */
  oralExamScore: number | null;
  /** Cột K — Điểm TB (null khi đủ điều kiện nhưng chưa nhập Điểm Thi) */
  averageScore: number | null;
  /** Cột L — Xếp loại */
  classification: string;
}

export function classifyScore(score: number): string {
  for (const tier of GR_CLASSIFICATION_THRESHOLDS) {
    if (score >= tier.min) return tier.label;
  }
  return GR_CLASSIFICATION_THRESHOLDS[GR_CLASSIFICATION_THRESHOLDS.length - 1].label;
}

export function computeGrade(input: GradeInput): GradeResult {
  const now = input.now ?? new Date();
  const weeks = (input.weeks ?? []).slice().sort((a, b) => a.weekNumber - b.weekNumber);

  const weekStates = weeks.map((week) => ({
    weekNumber: week.weekNumber,
    state: resolveSubmission({ submittedAt: week.submittedAt, deadline: week.deadline, now }),
  }));

  // Union: tuần bị tính thiếu/vắng khi không nộp quá hạn HOẶC điểm danh V trong tuần đó
  const missingWeeks = weeks
    .filter((week, index) => {
      const state = weekStates[index].state;
      return state === "missing" || Boolean(week.isAbsent);
    })
    .map((week) => week.weekNumber);

  const lateWeeks = weekStates
    .filter((item) => item.state === "late")
    .map((item) => item.weekNumber);

  const missingCount = missingWeeks.length;
  const lateCount = lateWeeks.length;

  const finalReportSubmitted = parseGradingDate(input.finalReportSubmittedAt) != null;
  const finalReportDeadline = parseGradingDate(input.finalReportDeadline);
  const finalReportLate = Boolean(
    finalReportSubmitted &&
      finalReportDeadline &&
      (parseGradingDate(input.finalReportSubmittedAt) as Date) > finalReportDeadline,
  );

  // ── Cột U: Điều kiện dự thi ──
  const ineligibilityReasons: string[] = [];
  if (!finalReportSubmitted) ineligibilityReasons.push(GR_INELIGIBLE_REASON_NO_FINAL);
  if (missingCount >= GR_MAX_MISSING_WEEKS) ineligibilityReasons.push(GR_INELIGIBLE_REASON_ABSENCE);
  const isEligible = ineligibilityReasons.length === 0;

  // ── Cột I: Điểm QT ──
  const submissionPoints = roundScore(Math.max(0, GR_SUBMISSION_MAX - missingCount * GR_MISSING_PENALTY));
  const punctualityPoints = roundScore(Math.max(0, GR_PUNCTUALITY_MAX - lateCount * GR_LATE_PENALTY));
  const qualityLevel = input.qualityLevel != null && VALID_QUALITY_LEVELS.has(input.qualityLevel)
    ? input.qualityLevel
    : null;
  const qualityPoints = qualityLevel ?? 0;
  const creativeBonus = input.hasCreativeProduct ? GR_CREATIVE_BONUS : 0;
  const rawProcessScore = submissionPoints + punctualityPoints + qualityPoints + creativeBonus;
  const processScore = roundScore(Math.min(10, rawProcessScore));

  // ── Cột J: Điểm Thi ──
  const hasOral = input.oralExamScore != null && Number.isFinite(input.oralExamScore);
  const oralExamScore = hasOral ? clampScore(input.oralExamScore) : null;

  // ── Cột K & L ──
  let averageScore: number | null;
  let classification: string;
  if (!isEligible) {
    averageScore = 0;
    classification = GR_INELIGIBLE_LABEL;
  } else if (oralExamScore == null) {
    averageScore = null;
    classification = "";
  } else {
    averageScore = roundScore(processScore * GR_PROCESS_WEIGHT + oralExamScore * GR_ORAL_WEIGHT);
    classification = classifyScore(averageScore);
  }

  return {
    weekStates,
    missingWeeks,
    lateWeeks,
    missingCount,
    lateCount,
    finalReportSubmitted,
    finalReportLate,
    isEligible,
    ineligibilityReasons,
    submissionPoints,
    punctualityPoints,
    qualityPoints,
    creativeBonus,
    processScore,
    oralExamScore,
    averageScore,
    classification,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 4) Map ra ký tự cột Excel template (T1..T6, NỘP BC, TỔNG)
// ────────────────────────────────────────────────────────────────────────────

/** Ký tự ô TUẦN 1..6 trong template: ✓ đúng hạn, T trễ, V không nộp/vắng */
export function toWeekCell(state: SubmissionState): string {
  switch (state) {
    case "on_time": return "✓";
    case "late": return "T";
    case "missing": return "V";
    default: return "";
  }
}

/** Ô NỘP BC: "Đã nộp" hoặc "X" khi thiếu báo cáo cuối kỳ */
export function toFinalReportCell(finalReportSubmitted: boolean): string {
  return finalReportSubmitted ? "Đã nộp" : "X";
}

/** Ô TỔNG (cột U): "Không đủ điều kiện" hoặc rỗng */
export function toEligibilityCell(isEligible: boolean): string {
  return isEligible ? "" : GR_INELIGIBLE_CELL;
}

/** Nhãn màu cho badge xếp loại trên UI */
export function getClassificationTone(classification: string): string {
  switch (classification) {
    case "Xuất sắc": return "text-violet-700 bg-violet-50 border-violet-200";
    case "Giỏi": return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "Khá": return "text-blue-700 bg-blue-50 border-blue-200";
    case "Trung bình": return "text-amber-700 bg-amber-50 border-amber-200";
    case "Không đạt": return "text-rose-700 bg-rose-50 border-rose-200";
    case GR_INELIGIBLE_LABEL: return "text-slate-700 bg-slate-100 border-slate-200";
    default: return "text-slate-500 bg-white border-slate-200";
  }
}
