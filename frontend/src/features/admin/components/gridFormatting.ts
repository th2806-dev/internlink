import type { SysGridConfig } from "../../../types/system";

type GridFormat = SysGridConfig["cellFormatType"];

export function getGridFieldValue(row: object, fieldCode: string): unknown {
  return fieldCode.split(".").reduce<unknown>((value, segment) => {
    if (value === null || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[segment];
  }, row);
}

export function formatGridCell(value: unknown, format: GridFormat): string {
  if (value === null || value === undefined || value === "") return "—";

  if (format === "date") {
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime())
      ? String(value)
      : new Intl.DateTimeFormat("vi-VN").format(date);
  }

  const numberValue = typeof value === "number" ? value : Number(value);
  if (format !== "text" && Number.isFinite(numberValue)) {
    const options: Intl.NumberFormatOptions = format === "percent"
      ? { style: "percent", maximumFractionDigits: 2 }
      : format === "currency"
        ? { style: "currency", currency: "VND", maximumFractionDigits: 0 }
        : { maximumFractionDigits: 2 };
    return new Intl.NumberFormat("vi-VN", options).format(numberValue);
  }

  return String(value);
}
