import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, FileCheck, Save } from "lucide-react";
import { Panel } from "../../../components/common/Panel";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { queryKeys } from "../../../lib/queryKeys";
import { semesterReportScheduleService } from "../../../services/semesterReportSchedule.service";
import { useAuth } from "../../../hooks/useAuth";

type Props = {
  semesterId: string;
  semesterName: string;
};

function toDateTimeLocal(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

function fromVietnamDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() - 7 * 60 * 60 * 1000).toISOString();
}

export function ArchiveReportDeadlinePanel({ semesterId, semesterName }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const deadlineKey = queryKeys.admin.archiveReportDeadline(
    semesterId,
    user?.id ?? user?.username,
  );
  const deadlineQuery = useQuery({
    queryKey: deadlineKey,
    enabled: Boolean(semesterId && user),
    staleTime: 5 * 60 * 1000,
    queryFn: () => semesterReportScheduleService.getArchiveReportDeadline(semesterId),
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setStartDate(toDateTimeLocal(deadlineQuery.data?.startDate));
    setEndDate(toDateTimeLocal(deadlineQuery.data?.endDate));
  }, [deadlineQuery.data, semesterId]);

  const save = async () => {
    if (!semesterId || !startDate || !endDate || endDate < startDate || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      const request = {
        startDate: fromVietnamDateTimeLocal(startDate),
        endDate: fromVietnamDateTimeLocal(endDate),
      };
      if (!request.startDate || !request.endDate) {
        setError("Thời gian deadline không hợp lệ.");
        return;
      }
      await semesterReportScheduleService.saveArchiveReportDeadline(semesterId, request);
      await queryClient.invalidateQueries({ queryKey: deadlineKey });
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };
  const isLoading = deadlineQuery.isPending;
  const visibleError = error || (deadlineQuery.error ? getApiErrorMessage(deadlineQuery.error) : "");

  return (
    <Panel className="space-y-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <CalendarClock className="h-4 w-4 text-[#026aa7]" aria-hidden="true" />
            Deadline nộp báo cáo đã chỉnh sửa lưu khoa
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {semesterName} · Sinh viên nộp bản báo cáo hoàn thiện sau khi chỉnh sửa theo góp ý của Hội đồng/Giảng viên để lưu trữ cấp Khoa.
          </p>
        </div>
        {isLoading && <span className="text-[11px] text-slate-500">Đang tải…</span>}
      </div>
      <div className="inline-flex items-center gap-1.5 rounded-full border border-[#026aa7]/20 bg-[#026aa7]/5 px-3 py-1 text-[11px] font-semibold text-[#025a8e]">
        <FileCheck className="h-3.5 w-3.5" aria-hidden="true" />
        Định dạng nhận: Duy nhất PDF (.pdf)
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label htmlFor={`archive-report-start-${semesterId}`} className="space-y-1 text-xs font-medium text-slate-600">
          Mở nhận
          <input
            id={`archive-report-start-${semesterId}`}
            type="datetime-local"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="block min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/30"
          />
        </label>
        <label htmlFor={`archive-report-end-${semesterId}`} className="space-y-1 text-xs font-medium text-slate-600">
          Hạn chót
          <input
            id={`archive-report-end-${semesterId}`}
            type="datetime-local"
            min={startDate || undefined}
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="block min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/30"
          />
        </label>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!semesterId || !startDate || !endDate || endDate < startDate || isSaving}
          className="il-btn il-btn-primary inline-flex min-h-11 items-center justify-center gap-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          {isSaving ? "Đang lưu…" : "Lưu deadline"}
        </button>
      </div>
      {visibleError && <p role="alert" className="text-xs text-rose-700">{visibleError}</p>}
    </Panel>
  );
}
