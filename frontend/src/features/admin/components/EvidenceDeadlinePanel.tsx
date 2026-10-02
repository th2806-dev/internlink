import { useEffect, useState } from "react";
import { CalendarClock, Save } from "lucide-react";
import { Panel } from "../../../components/common/Panel";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { semesterReportScheduleService } from "../../../services/semesterReportSchedule.service";

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

export function EvidenceDeadlinePanel({ semesterId, semesterName }: Props) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!semesterId) {
      setStartDate("");
      setEndDate("");
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError("");
    semesterReportScheduleService.getEvidenceDeadline(semesterId)
      .then((deadline) => {
        if (cancelled) return;
        setStartDate(toDateTimeLocal(deadline?.startDate));
        setEndDate(toDateTimeLocal(deadline?.endDate));
      })
      .catch((loadError) => {
        if (!cancelled) setError(getApiErrorMessage(loadError));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [semesterId]);

  const save = async () => {
    if (!semesterId || !startDate || !endDate || endDate < startDate || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      await semesterReportScheduleService.saveEvidenceDeadline(semesterId, {
        startDate: fromVietnamDateTimeLocal(startDate) ?? "",
        endDate: fromVietnamDateTimeLocal(endDate) ?? "",
      });
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Panel className="space-y-3 border-emerald-200 bg-emerald-50/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <CalendarClock className="h-4 w-4 text-emerald-700" /> Deadline đánh giá doanh nghiệp
          </h2>
          <p className="mt-1 text-xs text-slate-600">{semesterName} · SV phải nộp điểm và ảnh phiếu trong khoảng thời gian này.</p>
        </div>
        {isLoading && <span className="text-[11px] text-slate-500">Đang tải…</span>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="space-y-1 text-xs font-medium text-slate-600">
          Mở nhận
          <input type="datetime-local" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" />
        </label>
        <label className="space-y-1 text-xs font-medium text-slate-600">
          Hạn chót
          <input type="datetime-local" min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" />
        </label>
        <button type="button" onClick={() => void save()} disabled={!semesterId || !startDate || !endDate || endDate < startDate || isSaving} className="il-btn il-btn-primary inline-flex items-center justify-center gap-1.5 text-xs disabled:opacity-50">
          <Save className="h-3.5 w-3.5" /> {isSaving ? "Đang lưu…" : "Lưu deadline"}
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    </Panel>
  );
}