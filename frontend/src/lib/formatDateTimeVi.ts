const BACKEND_TIMEZONE = "Asia/Ho_Chi_Minh";

export function parseBackendDate(value: string | Date): Date {
  if (value instanceof Date) return value;

  // API DateTime values are UTC but may be serialized without a timezone suffix.
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

export function formatDateTimeVi(value: string | Date): string {
  const date = parseBackendDate(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: BACKEND_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}
