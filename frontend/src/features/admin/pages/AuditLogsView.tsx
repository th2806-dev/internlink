import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, FileSearch, X } from "lucide-react";
import { CompactActionBar } from "../../../components/common/CompactActionBar";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { systemAdminService } from "../../../services/systemAdmin.service";
import type { AuditLogEntry } from "../../../types/systemAdmin";

function localDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toUtcStart(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

function toUtcExclusiveEnd(date: string): string {
  const end = new Date(`${date}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return end.toISOString();
}

function prettyJson(value: string | null): string {
  if (!value) return "Không có dữ liệu";
  try {
    return JSON.stringify(JSON.parse(value) as unknown, null, 2);
  } catch {
    return value;
  }
}

const ACTION_STYLES: Record<AuditLogEntry["actionType"], string> = {
  CREATE: "border-[#7bc043]/30 bg-[#7bc043]/10 text-slate-800 font-bold",
  UPDATE: "border-amber-200 bg-amber-50 text-amber-800",
  SOFT_DELETE: "border-rose-200 bg-rose-50 text-rose-800",
};

const ACTION_LABELS: Record<AuditLogEntry["actionType"], string> = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  SOFT_DELETE: "DELETE",
};

export function AuditLogsView() {
  const today = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState(() => {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return localDateInput(start);
  });
  const [toDate, setToDate] = useState(() => localDateInput(today));
  const [actionType, setActionType] = useState("");
  const [tableName, setTableName] = useState("");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const filters = useMemo(() => ({
    from: fromDate ? toUtcStart(fromDate) : "",
    to: toDate ? toUtcExclusiveEnd(toDate) : "",
    actionType,
    tableName: tableName.trim(),
    page,
    pageSize: 50,
  }), [actionType, fromDate, page, tableName, toDate]);
  const logsQuery = useQuery({
    queryKey: ["system-admin", "audit-logs", filters],
    queryFn: () => systemAdminService.getAuditLogs(filters),
    enabled: !fromDate || !toDate || fromDate <= toDate,
  });

  useEffect(() => {
    if (!selectedLog) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedLog(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [selectedLog]);

  const logs = logsQuery.data?.items ?? [];
  const totalCount = logsQuery.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / filters.pageSize));
  const handleFilterChange = (update: () => void) => {
    update();
    setPage(1);
  };

  return (
    <div className="w-full space-y-2 animate-in fade-in duration-200 font-sans pb-12">
      <CompactActionBar
        icon={ClipboardList}
        title="Nhật ký Kiểm toán & Giám sát (F1006)"
        subtitle="Tra cứu thay đổi dữ liệu và đối soát giá trị trước / sau thao tác."
        total={`${totalCount.toLocaleString("vi-VN")} bản ghi`}
        search={{
          value: tableName,
          onChange: (value) => handleFilterChange(() => setTableName(value)),
          placeholder: "Bảng dữ liệu",
          ariaLabel: "Bảng dữ liệu",
        }}
        filters={
          <div className="flex flex-wrap items-center gap-1.5">
            <label className="sr-only" htmlFor="audit-from">Từ ngày</label>
            <input
              id="audit-from"
              type="date"
              value={fromDate}
              onChange={(event) => handleFilterChange(() => setFromDate(event.target.value))}
              aria-label="Từ ngày"
              className="h-8 rounded-[4px] border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
            />
            <label className="sr-only" htmlFor="audit-to">Đến ngày</label>
            <input
              id="audit-to"
              type="date"
              value={toDate}
              onChange={(event) => handleFilterChange(() => setToDate(event.target.value))}
              aria-label="Đến ngày"
              className="h-8 rounded-[4px] border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
            />
            <label className="sr-only" htmlFor="audit-action">Loại thao tác</label>
            <select
              id="audit-action"
              value={actionType}
              onChange={(event) => handleFilterChange(() => setActionType(event.target.value))}
              aria-label="Loại thao tác"
              className="h-8 rounded-[4px] border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
            >
              <option value="">Tất cả thao tác</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="SOFT_DELETE">DELETE</option>
            </select>
          </div>
        }
      />

      <>
        {fromDate && toDate && fromDate > toDate && (
          <p role="alert" className="text-xs text-rose-700">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</p>
        )}
        {logsQuery.error && (
          <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            {getApiErrorMessage(logsQuery.error)}
          </div>
        )}
        {logsQuery.isLoading ? (
          <p role="status" className="py-3 text-center text-xs text-slate-600">Đang tải nhật ký…</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-[1080px] w-full border-collapse text-xs">
                <thead className="bg-slate-100/90 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th scope="col" className="px-2.5 py-1.5">Thời gian</th>
                    <th scope="col" className="px-2.5 py-1.5">Thao tác</th>
                    <th scope="col" className="px-2.5 py-1.5">Bảng dữ liệu</th>
                    <th scope="col" className="px-2.5 py-1.5">Record ID</th>
                    <th scope="col" className="px-2.5 py-1.5">Người thực hiện</th>
                    <th scope="col" className="px-2.5 py-1.5">IP Address</th>
                    <th scope="col" className="px-2.5 py-1.5">Chức năng</th>
                    <th scope="col" className="px-2.5 py-1.5">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-2.5 py-1.5 font-mono text-[10px] text-slate-700">
                        {new Date(log.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-2.5 py-1.5">
                        <span className={`inline-flex rounded-[3px] border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${ACTION_STYLES[log.actionType]}`}>
                          {ACTION_LABELS[log.actionType]}
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5 font-medium text-slate-700">{log.tableName}</td>
                      <td className="max-w-44 break-all px-2.5 py-1.5 font-mono text-xs text-slate-600">{log.recordId}</td>
                      <td className="px-2.5 py-1.5 text-slate-700">{log.username || log.userId || "—"}</td>
                      <td className="px-2.5 py-1.5 text-slate-700">
                        <span className="inline-flex rounded-[3px] bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">{log.ipAddress || "—"}</span>
                      </td>
                      <td className="px-2.5 py-1.5 text-slate-700">{log.functionCode || "—"}</td>
                      <td className="px-2.5 py-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="h-7 rounded-[4px] px-2 text-xs font-semibold text-[#026aa7] hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                        >
                          Xem Diff chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!logs.length && (
                    <tr>
                      <td colSpan={8} className="px-2.5 py-4 text-center text-xs text-slate-500">
                        Không tìm thấy nhật ký trong phạm vi lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <p>{totalCount.toLocaleString("vi-VN")} bản ghi · Trang {page} / {totalPages}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || logsQuery.isFetching}
                  className="h-8 rounded-[4px] border border-slate-200 px-3 text-xs font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages || logsQuery.isFetching}
                  className="h-8 rounded-[4px] border border-slate-200 px-3 text-xs font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Tiếp
                </button>
              </div>
            </div>
          </>
        )}
      </>

      {selectedLog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedLog(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-diff-title"
            className="flex max-h-[90dvh] w-full max-w-6xl flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 id="audit-diff-title" className="text-lg font-semibold text-slate-900">Chi tiết thay đổi</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedLog.tableName} · {selectedLog.recordId} · {new Date(selectedLog.createdAt).toLocaleString("vi-VN")}
                </p>
                {selectedLog.functionCode && (
                  <p className="mt-1 text-xs text-slate-500">Chức năng: {selectedLog.functionCode}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                aria-label="Đóng chi tiết nhật ký"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </header>
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-2 md:p-5">
              <section aria-labelledby="audit-old-values-title" className="min-w-0 rounded-md border border-rose-200 bg-rose-50/70">
                <h3 id="audit-old-values-title" className="border-b border-rose-200 px-4 py-3 text-sm font-semibold text-rose-900">Dữ liệu cũ</h3>
                <pre className="max-h-[55dvh] overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-5 text-rose-950">{prettyJson(selectedLog.oldValuesJson)}</pre>
              </section>
              <section aria-labelledby="audit-new-values-title" className="min-w-0 rounded-md border border-[#7bc043]/30 bg-[#7bc043]/10">
                <h3 id="audit-new-values-title" className="border-b border-[#7bc043]/30 px-4 py-3 text-sm font-semibold text-slate-900">Dữ liệu mới</h3>
                <pre className="max-h-[55dvh] overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-5 text-slate-800">{prettyJson(selectedLog.newValuesJson)}</pre>
              </section>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
