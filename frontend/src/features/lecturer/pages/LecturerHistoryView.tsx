import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Award,
  Building2,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  History,
  MessageSquareText,
  Search,
  X,
} from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { Toolbar } from "../../../components/common/Toolbar";
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
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(10);
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(10);
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

  const studentTotalPages = Math.max(1, Math.ceil(students.length / studentPageSize));
  const safeStudentPage = Math.min(studentPage, studentTotalPages);
  const paginatedStudents = students.slice(
    (safeStudentPage - 1) * studentPageSize,
    safeStudentPage * studentPageSize,
  );
  const activities = history?.activities ?? [];
  const activityTotalPages = Math.max(1, Math.ceil(activities.length / activityPageSize));
  const safeActivityPage = Math.min(activityPage, activityTotalPages);
  const paginatedActivities = activities.slice(
    (safeActivityPage - 1) * activityPageSize,
    safeActivityPage * activityPageSize,
  );

  const companyCount = new Set((history?.students ?? []).map((student) => student.companyName).filter(Boolean)).size;
  const reviewedCount = (history?.students ?? []).reduce((total, student) => total + student.reviewedReportCount, 0);
  const finalizedCount = (history?.students ?? []).filter((student) => student.isFinalized).length;

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <PageHeader
        icon={History}
        title="Lịch sử hướng dẫn"
        subtitle="Tra cứu sinh viên, kết quả và hoạt động hướng dẫn theo từng học kỳ."
      />

      <Toolbar
        left={(
          <div className="flex w-full flex-col gap-1.5 sm:w-auto">
            <label htmlFor="history-semester" className="text-[11px] font-semibold text-slate-600">Học kỳ tham gia</label>
            <select
              id="history-semester"
              value={semesterId}
              onChange={(event) => {
                setSemesterId(event.target.value);
                setStudentPage(1);
                setActivityPage(1);
              }}
              disabled={isLoadingSemesters || semesters.length === 0}
              className="w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 sm:min-w-64"
            >
              {isLoadingSemesters && <option value="">Đang tải học kỳ…</option>}
              {semesters.length === 0 && <option value="">Chưa có học kỳ tham gia</option>}
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name || `${semester.term} · ${semester.academicYear}`}
                </option>
              ))}
            </select>
          </div>
        )}
        right={history?.lastActivityAt && (
          <span className="text-xs text-slate-500">
            Hoạt động gần nhất <time className="font-medium text-slate-700">{formatDateTime(history.lastActivityAt)}</time>
          </span>
        )}
      />

      {error && (
        <Panel role="alert" className="flex items-start gap-2.5 border-rose-200 bg-rose-50 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </Panel>
      )}

      {isLoadingHistory || isLoadingSemesters ? (
        <Panel className="py-12 text-center text-sm text-slate-500">Đang tải lịch sử hướng dẫn…</Panel>
      ) : !error && history ? (
        <>
          <section aria-label="Tổng quan học kỳ" className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 lg:grid-cols-4">
            <Metric icon={History} label="Sinh viên" value={history.students.length} />
            <Metric icon={Building2} label="Doanh nghiệp" value={companyCount} />
            <Metric icon={MessageSquareText} label="Báo cáo đã phản hồi" value={reviewedCount} />
            <Metric icon={Award} label="Kết quả đã chốt" value={finalizedCount} />
          </section>

          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
            <Panel className="space-y-4">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-700" />
                    <h2 className="text-sm font-bold text-slate-900">Sinh viên trong kỳ</h2>
                  </div>
                  <p className="mt-1 pl-6 text-[11px] text-slate-500">
                    {search.trim() ? `${students.length} kết quả phù hợp` : `${history.students.length} sinh viên`}
                  </p>
                </div>
                <label className="relative block w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setStudentPage(1);
                    }}
                    placeholder="Tìm SV, lớp, doanh nghiệp"
                    aria-label="Tìm sinh viên theo tên, mã, lớp hoặc doanh nghiệp"
                    className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-9 text-xs outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setStudentPage(1);
                      }}
                      aria-label="Xóa nội dung tìm kiếm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-blue-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </label>
              </div>
              <div className="divide-y divide-slate-200 lg:hidden">
                {paginatedStudents.map((student) => (
                  <article key={student.internshipId} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-xs font-semibold text-slate-900">{student.studentName}</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {student.studentCode}{student.className ? ` · ${student.className}` : ""}
                        </p>
                      </div>
                      {student.isFinalized && student.finalGrade != null ? (
                        <span className="shrink-0 rounded-sm bg-emerald-50 px-2 py-1 text-xs font-bold tabular-nums text-emerald-700">
                          {student.finalGrade.toFixed(1)} / 10
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-sm bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                          Chưa chốt
                        </span>
                      )}
                    </div>
                    <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2.5 text-[11px]">
                      <dt className="text-slate-500">Doanh nghiệp</dt>
                      <dd className="text-right font-medium text-slate-700">{student.companyName || "Chưa phân doanh nghiệp"}</dd>
                      <dt className="text-slate-500">Báo cáo đã phản hồi</dt>
                      <dd className="text-right font-medium tabular-nums text-slate-700">{student.reviewedReportCount}</dd>
                    </dl>
                  </article>
                ))}
                {students.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-500">
                    {search.trim() ? "Không tìm thấy sinh viên phù hợp." : "Chưa có sinh viên trong học kỳ này."}
                  </p>
                )}
              </div>
              <div className="hidden overflow-x-auto rounded-md border border-slate-200/80 lg:block">
                <table className="w-full min-w-[680px] text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5">Sinh viên</th>
                      <th className="px-4 py-2.5">Doanh nghiệp</th>
                      <th className="px-4 py-2.5 text-center">Đã phản hồi</th>
                      <th className="px-4 py-2.5 text-right">Kết quả cuối kỳ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedStudents.map((student) => (
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
                      <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                        {search.trim() ? "Không tìm thấy sinh viên phù hợp." : "Chưa có sinh viên trong học kỳ này."}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                label="sinh viên"
                page={safeStudentPage}
                pageSize={studentPageSize}
                totalPages={studentTotalPages}
                totalItems={students.length}
                visibleItems={paginatedStudents.length}
                onPageChange={setStudentPage}
                onPageSizeChange={(size) => { setStudentPageSize(size); setStudentPage(1); }}
              />
            </Panel>

            <Panel padding="none" className="min-w-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-emerald-700" />
                  <h2 className="text-sm font-bold text-slate-900">Hoạt động theo thời gian</h2>
                </div>
                <span className="shrink-0 text-[11px] text-slate-500">{history.activities.length} hoạt động</span>
              </div>
              <div className="divide-y divide-slate-100">
                {paginatedActivities.map((activity) => {
                  const Icon = activityIcon(activity.activityType);
                  return (
                    <article key={`${activity.activityType}-${activity.id}`} className="flex min-w-0 gap-3 px-4 py-3.5">
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
                        <time dateTime={activity.occurredAt} className="mt-1.5 block text-[10px] text-slate-400">{formatDateTime(activity.occurredAt)}</time>
                      </div>
                    </article>
                  );
                })}
                {activities.length === 0 && (
                  <div className="px-4 py-10 text-center">
                    <Clock3 className="mx-auto h-5 w-5 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-600">Chưa có hoạt động được lưu cho học kỳ này.</p>
                  </div>
                )}
              </div>
              <div className="border-t border-slate-200 px-4 py-2 text-[10px] text-slate-400">
                Tải lúc: {formatDateTime(history.generatedAt)}
              </div>
              <div className="px-4 pb-3">
                <PaginationControls
                  label="hoạt động"
                  page={safeActivityPage}
                  pageSize={activityPageSize}
                  totalPages={activityTotalPages}
                  totalItems={activities.length}
                  visibleItems={paginatedActivities.length}
                  onPageChange={setActivityPage}
                  onPageSizeChange={(size) => { setActivityPageSize(size); setActivityPage(1); }}
                />
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

function PaginationControls({
  label,
  page,
  pageSize,
  totalPages,
  totalItems,
  visibleItems,
  onPageChange,
  onPageSizeChange,
}: {
  label: string;
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  visibleItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs sm:flex-row">
      <div className="flex items-center gap-3 font-medium text-slate-500">
        <span>Hiển thị {visibleItems} / {totalItems} {label}</span>
        <label className="flex items-center gap-1.5">
          <span>Số dòng:</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value={5}>5 dòng</option>
            <option value={10}>10 dòng</option>
            <option value={20}>20 dòng</option>
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1.5 font-bold">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          disabled={page === 1}
          aria-label="Trang trước"
          className="cursor-pointer rounded-md bg-slate-100 p-1.5 text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-800">{page} / {totalPages}</span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          disabled={page === totalPages}
          aria-label="Trang sau"
          className="cursor-pointer rounded-md bg-slate-100 p-1.5 text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

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