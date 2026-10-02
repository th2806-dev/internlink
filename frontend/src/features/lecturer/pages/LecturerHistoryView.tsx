import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Building2,
  CalendarCheck2,
  Clock3,
  FileText,
  History,
  MessageSquareText,
  Search,
} from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { useSemester } from "../../../contexts/SemesterContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { lecturerHistoryService, type LecturerParticipationHistory } from "../../../services/lecturerHistory.service";
import { lecturerInternshipsService, type LecturerSemesterOptionDto } from "../../../services/lecturerInternships.service";

const formatDateTime = (value?: string | null) => value
  ? new Date(value).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" })
  : "—";

const activityIcon = (activityType: string) => {
  if (activityType.includes("attendance")) return CalendarCheck2;
  if (activityType.includes("report")) return MessageSquareText;
  if (activityType.includes("result")) return Award;
  return Clock3;
};

export const LecturerHistoryView = () => {
  const { selectedSemesterId } = useSemester();
  const [semesters, setSemesters] = useState<LecturerSemesterOptionDto[]>([]);
  const [semesterId, setSemesterId] = useState("");
  const [history, setHistory] = useState<LecturerParticipationHistory | null>(null);
  const [search, setSearch] = useState("");
  const [isLoadingSemesters, setIsLoadingSemesters] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    lecturerInternshipsService.getAssignedSemesters()
      .then((options) => {
        if (cancelled) return;
        setSemesters(options);
        setSemesterId((current) =>
          options.some((option) => option.id === current)
            ? current
            : options.find((option) => option.id === selectedSemesterId)?.id ?? options[0]?.id ?? "",
        );
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSemesters(false);
      });
    return () => { cancelled = true; };
  }, [selectedSemesterId]);

  useEffect(() => {
    if (!semesterId) {
      setHistory(null);
      return;
    }
    let cancelled = false;
    setIsLoadingHistory(true);
    setError("");
    lecturerHistoryService.getSemesterHistory(semesterId)
      .then((result) => { if (!cancelled) setHistory(result); })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setHistory(null);
          setError(getApiErrorMessage(requestError));
        }
      })
      .finally(() => { if (!cancelled) setIsLoadingHistory(false); });
    return () => { cancelled = true; };
  }, [semesterId]);

  const students = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    if (!query) return history?.students ?? [];
    return (history?.students ?? []).filter((student) =>
      [student.studentCode, student.studentName, student.className, student.companyName]
        .some((value) => value?.toLocaleLowerCase("vi").includes(query)),
    );
  }, [history, search]);

  const companyCount = new Set((history?.students ?? []).map((student) => student.companyName).filter(Boolean)).size;
  const reviewedCount = (history?.students ?? []).reduce((total, student) => total + student.reviewedReportCount, 0);
  const finalizedCount = (history?.students ?? []).filter((student) => student.isFinalized).length;

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 animate-in fade-in duration-200">
      <PageHeader
        icon={History}
        title="Lịch sử hướng dẫn"
        subtitle="Sinh viên, doanh nghiệp, kết quả và các hoạt động đã được ghi nhận theo học kỳ."
      />

      <Panel padding="sm" className="flex flex-wrap items-center gap-3">
        <label htmlFor="history-semester" className="text-xs font-semibold text-slate-700">Học kỳ tham gia</label>
        <select
          id="history-semester"
          value={semesterId}
          onChange={(event) => setSemesterId(event.target.value)}
          disabled={isLoadingSemesters || semesters.length === 0}
          className="min-w-64 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-600 focus:outline-none"
        >
          {semesters.length === 0 && <option value="">Chưa có học kỳ tham gia</option>}
          {semesters.map((semester) => (
            <option key={semester.id} value={semester.id}>
              {semester.name || `${semester.term} · ${semester.academicYear}`}
            </option>
          ))}
        </select>
        {history?.lastActivityAt && (
          <span className="ml-auto text-xs text-slate-500">Hoạt động gần nhất: {formatDateTime(history.lastActivityAt)}</span>
        )}
      </Panel>

      {error && <Panel className="border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</Panel>}

      {isLoadingHistory || isLoadingSemesters ? (
        <Panel className="py-12 text-center text-sm text-slate-500">Đang tải lịch sử hướng dẫn…</Panel>
      ) : !error && history ? (
        <>
          <section className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 lg:grid-cols-4">
            <Metric icon={History} label="Sinh viên" value={history.students.length} />
            <Metric icon={Building2} label="Doanh nghiệp" value={companyCount} />
            <Metric icon={MessageSquareText} label="Báo cáo đã phản hồi" value={reviewedCount} />
            <Metric icon={Award} label="Kết quả đã chốt" value={finalizedCount} />
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
            <Panel padding="none" className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-700" />
                  <h2 className="text-sm font-bold text-slate-900">Sinh viên trong kỳ</h2>
                </div>
                <label className="relative block w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm SV, lớp, doanh nghiệp"
                    className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3 text-xs outline-none focus:border-blue-600"
                  />
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5">Sinh viên</th>
                      <th className="px-4 py-2.5">Doanh nghiệp</th>
                      <th className="px-4 py-2.5 text-center">Đã phản hồi</th>
                      <th className="px-4 py-2.5 text-right">Kết quả cuối kỳ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student) => (
                      <tr key={student.internshipId} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{student.studentName}</p>
                          <p className="mt-0.5 text-slate-500">{student.studentCode}{student.className ? ` · ${student.className}` : ""}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{student.companyName || "Chưa phân doanh nghiệp"}</td>
                        <td className="px-4 py-3 text-center font-medium text-slate-700">{student.reviewedReportCount}</td>
                        <td className="px-4 py-3 text-right">
                          {student.isFinalized && student.finalGrade != null ? (
                            <span className="font-bold text-emerald-700">{student.finalGrade.toFixed(1)} / 10</span>
                          ) : <span className="text-slate-500">Chưa chốt</span>}
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">Không có sinh viên phù hợp bộ lọc.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel padding="none" className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-emerald-700" />
                  <h2 className="text-sm font-bold text-slate-900">Hoạt động theo thời gian</h2>
                </div>
                <span className="text-[11px] text-slate-500">{history.activities.length} mốc</span>
              </div>
              <div className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto">
                {history.activities.map((activity) => {
                  const Icon = activityIcon(activity.activityType);
                  return (
                    <article key={`${activity.activityType}-${activity.id}`} className="flex gap-3 px-4 py-3.5">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900">{activity.title}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {[activity.studentName, activity.companyName, activity.weekNumber ? `Tuần ${activity.weekNumber}` : null]
                            .filter(Boolean).join(" · ") || "Hoạt động hướng dẫn"}
                        </p>
                        {activity.detail && <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{activity.detail}</p>}
                        <time className="mt-1.5 block text-[10px] text-slate-400">{formatDateTime(activity.occurredAt)}</time>
                      </div>
                    </article>
                  );
                })}
                {history.activities.length === 0 && (
                  <div className="px-4 py-10 text-center">
                    <Clock3 className="mx-auto h-5 w-5 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-600">Chưa có hoạt động được lưu cho học kỳ này.</p>
                  </div>
                )}
              </div>
              <div className="border-t border-slate-200 px-4 py-2 text-[10px] text-slate-400">
                Tải lúc: {formatDateTime(history.generatedAt)}
              </div>
            </Panel>
          </div>
        </>
      ) : !error && !isLoadingSemesters ? (
        <Panel className="py-12 text-center text-sm text-slate-500">Chưa có học kỳ hướng dẫn được ghi nhận.</Panel>
      ) : null}
    </div>
  );
};

function Metric({ icon: Icon, label, value }: { icon: typeof History; label: string; value: number }) {
  return (
    <div className="bg-white px-4 py-3.5">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}