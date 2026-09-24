/**
 * ============================================================================
 * Đồng bộ TUẦN THỰC TẬP (tương đối) ↔ TUẦN HỌC KỲ (tuyệt đối) theo lịch trường
 * ============================================================================
 * Thực tập là một học phần liên tiếp của học kỳ, ví dụ:
 *   - Tuần thực tập 1..6      → tuần 14..19 của học kỳ
 *   - Tuần chuẩn bị 0..-3      → tuần 13..10 của học kỳ (GV chuẩn bị/hội đồng)
 * ⇒ InternshipStartWeek = 14, công thức: tuần HK = start + (tuần tương đối - 1)
 *
 * Mốc thời gian từng tuần tính từ tuần bắt đầu thực tập trong học kỳ.
 */

/** Số tuần chuẩn bị tối đa trước Tuần thực tập 1 (0, -1, -2, -3). */
export const MAX_PREP_WEEKS = 3;

/** Tuần tương đối → tuần học kỳ tuyệt đối. */
export function toSemesterWeek(relativeWeek: number, internshipStartWeek = 1): number {
  return (internshipStartWeek || 1) - 1 + relativeWeek;
}

/** Tuần học kỳ tuyệt đối → tuần tương đối. */
export function toRelativeWeek(semesterWeek: number, internshipStartWeek = 1): number {
  return semesterWeek - ((internshipStartWeek || 1) - 1);
}

/** Parse "dd/MM/yyyy" (định dạng hiển thị của context) hoặc ISO → Date (local). */
export function parseSemesterDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = value.trim();
  if (!raw) return null;
  const vi = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (vi) {
    const [, d, m, y] = vi;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Khung 7 ngày của một tuần tương đối: [from, to). null nếu chưa cấu hình ngày bắt đầu kỳ. */
export function getWeekWindow(
  relativeWeek: number,
  semesterStartDate?: string | Date | null,
  internshipStartWeek = 1,
): { from: Date; to: Date } | null {
  const start = parseSemesterDate(semesterStartDate);
  if (!start) return null;
  start.setDate(start.getDate() + ((internshipStartWeek || 1) - 1) * 7);
  const from = new Date(start);
  from.setDate(from.getDate() + (relativeWeek - 1) * 7);
  const to = new Date(start);
  to.setDate(to.getDate() + relativeWeek * 7);
  return { from, to };
}

/** Ngày họp có nằm đúng trong tuần tương đối đã chọn không. */
export function isMeetingDateInWeek(
  meetingDate: string | Date,
  relativeWeek: number,
  semesterStartDate?: string | Date | null,
  internshipStartWeek = 1,
): boolean {
  const window = getWeekWindow(relativeWeek, semesterStartDate, internshipStartWeek);
  const date = meetingDate instanceof Date ? meetingDate : new Date(meetingDate);
  if (!window || Number.isNaN(date.getTime())) return false;
  return date >= window.from && date < window.to;
}

/**
 * Suy ra tuần tương ứng của một ngày họp.
 * Trả về null nếu nằm ngoài khoảng cho phép (-MAX_PREP_WEEKS .. totalWeeks).
 */
export function relativeWeekFromMeetingDate(
  meetingDate: string | Date,
  semesterStartDate?: string | Date | null,
  totalWeeks = 6,
  internshipStartWeek = 1,
): number | null {
  const start = parseSemesterDate(semesterStartDate);
  const date = meetingDate instanceof Date ? meetingDate : new Date(meetingDate);
  if (!start || Number.isNaN(date.getTime())) return null;
  start.setDate(start.getDate() + ((internshipStartWeek || 1) - 1) * 7);
  const diffDays = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.floor(diffDays / 7) + 1;
  return week < -MAX_PREP_WEEKS || week > totalWeeks ? null : week;
}

/**
 * Đưa ngày họp vào đúng khung tuần đã chọn khi người dùng ĐỔI TUẦN:
 * giữ nguyên GIỜ và THỨ TRONG TUẦN, dời sang tuần mới.
 */
export function shiftDateIntoWeek(
  meetingDate: string | Date,
  relativeWeek: number,
  semesterStartDate?: string | Date | null,
  internshipStartWeek = 1,
): string | null {
  const window = getWeekWindow(relativeWeek, semesterStartDate, internshipStartWeek);
  const date = meetingDate instanceof Date ? new Date(meetingDate) : new Date(meetingDate);
  if (!window || Number.isNaN(date.getTime())) return null;

  // Đã nằm trong khung tuần đích → giữ nguyên.
  if (date >= window.from && date < window.to) return date.toISOString();

  // Giữ cùng thứ trong tuần (vd: luôn là Thứ Ba) + cùng giờ, chuyển sang tuần mới.
  const dayOffset = (date.getDay() - window.from.getDay() + 7) % 7;
  const shifted = new Date(window.from);
  shifted.setDate(shifted.getDate() + dayOffset);
  shifted.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
  if (shifted >= window.to) shifted.setDate(shifted.getDate() - 7);
  return shifted.toISOString();
}

/** Hiển thị ngắn cho một tuần: "Tuần 14 học kỳ" / "Tuần 13 (chuẩn bị)". */
export function semesterWeekLabel(relativeWeek: number, internshipStartWeek = 1): string {
  const abs = toSemesterWeek(relativeWeek, internshipStartWeek);
  return relativeWeek <= 0 ? `Tuần ${abs} (chuẩn bị)` : `Tuần ${abs} học kỳ`;
}
