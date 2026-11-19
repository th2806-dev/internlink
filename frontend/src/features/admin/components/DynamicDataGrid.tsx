import { useGridConfig } from "../../../hooks/useSystemMenu";
import type { SysGridConfig } from "../../../types/system";
import { formatGridCell, getGridFieldValue } from "./gridFormatting";
import type { ReactNode } from "react";

interface DynamicDataGridProps<T extends object> {
  featureCode: string;
  rows: T[];
  getRowKey?: (row: T, index: number) => string | number;
  loadingMessage?: string;
  emptyMessage?: string;
  configOverride?: SysGridConfig[];
  renderCell?: (row: T, fieldCode: string) => ReactNode;
  renderHeader?: (fieldCode: string) => ReactNode;
  hideFieldCodes?: string[];
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
}

const SAFE_HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function safeColor(value: string | null | undefined): string | undefined {
  return value && SAFE_HEX_COLOR.test(value) ? value : undefined;
}

export function DynamicDataGrid<T extends object>({
  featureCode,
  rows,
  getRowKey,
  loadingMessage = "Đang tải cấu hình bảng...",
  emptyMessage = "Không có dữ liệu.",
  configOverride,
  renderCell,
  renderHeader,
  hideFieldCodes = [],
  isLoading = false,
  onRowClick,
}: DynamicDataGridProps<T>) {
  const configQuery = useGridConfig(
    featureCode,
    configOverride === undefined,
    null,
    configOverride === undefined,
  );

  if (configOverride === undefined && configQuery.isPending) {
    return <p role="status" className="p-4 text-sm text-slate-500">{loadingMessage}</p>;
  }
  if (configOverride === undefined && configQuery.isError) {
    return <p role="alert" className="p-4 text-sm text-rose-700">Không thể tải cấu hình bảng.</p>;
  }

  if (isLoading) {
    return <p role="status" className="p-4 text-sm text-slate-500">{loadingMessage}</p>;
  }

  const hiddenFields = new Set(hideFieldCodes);
  const columns = (configOverride ?? configQuery.data ?? [])
    .filter((column) => column.isVisible)
    .filter((column) => !hiddenFields.has(column.fieldCode))
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const leftFrozenOffsets = new Map<string, number>();
  const rightFrozenOffsets = new Map<string, number>();
  let nextLeftOffset = 0;
  for (const column of columns) {
    if (!column.isFrozen || column.frozenSide === "right") continue;
    leftFrozenOffsets.set(column.fieldCode, nextLeftOffset);
    nextLeftOffset += column.columnWidth;
  }
  let nextRightOffset = 0;
  for (const column of [...columns].reverse()) {
    if (!column.isFrozen || column.frozenSide !== "right") continue;
    rightFrozenOffsets.set(column.fieldCode, nextRightOffset);
    nextRightOffset += column.columnWidth;
  }

  if (columns.length === 0) {
    return <p className="p-4 text-sm text-slate-500">Chưa có cấu hình cột cho màn hình này.</p>;
  }

  return (
    <div className="max-w-full overflow-auto rounded-lg border border-slate-200">
      <table className="w-full border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.fieldCode}
                scope="col"
                className={`sticky top-0 z-20 border-b border-r border-slate-200 px-3 py-2 font-semibold text-slate-800 ${
                  column.isFrozen ? "z-30" : ""
                }`}
                style={{
                  width: column.columnWidth,
                  minWidth: column.columnWidth,
                  left: column.isFrozen && column.frozenSide !== "right"
                    ? leftFrozenOffsets.get(column.fieldCode)
                    : undefined,
                  right: column.isFrozen && column.frozenSide === "right"
                    ? rightFrozenOffsets.get(column.fieldCode)
                    : undefined,
                  backgroundColor: safeColor(column.headerBgColor) ?? "#f8fafc",
                  color: safeColor(column.headerTextColor),
                }}
              >
                {renderHeader?.(column.fieldCode) ?? column.headerTitle}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : rows.map((row, rowIndex) => (
            <tr
              key={getRowKey?.(row, rowIndex) ?? rowIndex}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`odd:bg-white even:bg-slate-50/60 ${onRowClick ? "cursor-pointer hover:bg-slate-100" : ""}`}
            >
              {columns.map((column) => (
                <td
                  key={column.fieldCode}
                  className={`border-b border-r border-slate-100 px-3 py-2 ${
                    column.isFrozen ? "sticky z-10 bg-inherit" : ""
                  }`}
                  style={{
                    width: column.columnWidth,
                    minWidth: column.columnWidth,
                    left: column.isFrozen && column.frozenSide !== "right"
                      ? leftFrozenOffsets.get(column.fieldCode)
                      : undefined,
                    right: column.isFrozen && column.frozenSide === "right"
                      ? rightFrozenOffsets.get(column.fieldCode)
                      : undefined,
                  }}
                >
                  {renderCell?.(row, column.fieldCode) ??
                    formatGridCell(
                      getGridFieldValue(row, column.fieldCode),
                      column.cellFormatType,
                    )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type { SysGridConfig };
