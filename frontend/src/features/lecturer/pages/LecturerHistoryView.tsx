import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
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
  Users,
  X,
} from "lucide-react";
import { Panel } from "../../../components/common/Panel";
import { LecturerSubPageHeader } from "../components/LecturerSubPageHeader";
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
  const [reloadToken, setReloadToken] = useState(0);

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
  }, [selectedSemesterId, reloadToken]);

  useEffect(() => {
    if (!semesterId) {
      setHistory(null);
      setIsLoadingHistory(false);
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
  }, [semesterId, reloadToken]);

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

  const handleRetry = () => {
    setError("");
    setReloadToken((token) => token + 1);
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 animate-in fade-in duration-200 font-sans pb-12">
      <LecturerSubPageHeader
        icon={History}
        title="Lịch sử hướng dẫn"
        subtitle="Tra cứu sinh viên, kết quả và hoạt động hướng dẫn theo từng học kỳ."
      />

      <Panel className="flex flex-col gap-4 rounded-xl border border-slate-200/90 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
        {history && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <strong className="font-bold text-slate-800">{history.students.length}</strong> sinh viên
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <strong className="font-bold text-slate-800">{companyCount}</strong> doanh nghiệp
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageSquareText className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <strong className="font-bold text-slate-800">{reviewedCount}</strong> báo cáo đã phản hồi
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <strong className="font-bold text-slate-800">{finalizedCount}</strong> kết quả đã chốt
            </span>
          </div>
        )}
        <div className="flex w-full flex-col gap-1.5 lg:w-auto lg:min-w-64">
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
            className="min-h-10 w-full rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-800 outline-none transition-colors hover:border-slate-400 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
          >
            {isLoadingSemesters && <option value="">Đang tải học kỳ…</option>}
            {semesters.length === 0 && <option value="">Chưa có học kỳ tham gia</option>}
            {semesters.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.name || `${semester.term} · ${semester.academicYear}`}
              </option>
            ))}
          </select>
          {history?.lastActivityAt && (
            <span className="text-xs text-slate-500">
              Hoạt động gần nhất <time className="font-medium text-slate-700">{formatDateTime(history.lastActivityAt)}</time>
            </span>
          )}
        </div>
      </Panel>

      {error && (
        <Panel
          role="alert"
          className="flex flex-col items-center gap-3 rounded-xl border border-slate-200/90 p-8 text-center shadow-2xs"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Không thể tải lịch sử hướng dẫn</h3>
            <p className="text-xs text-slate-500">{error} — vui lòng bấm thử lại.</p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="min-h-11 rounded-lg bg-[#026aa7] px-5 text-xs font-bold text-white transition-colors hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 cursor-pointer"
          >
            Thử lại
          </button>
        </Panel>
      )}

      {isLoadingHistory || isLoadingSemesters ? (
        <div role="status" aria-live="polite" className="space-y-3">
          <span className="sr-only">Đang tải lịch sử hướng dẫn…</span>
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs animate-pulse">
            <div className="h-3 w-44 bg-slate-200 rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-slate-200" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3 w-1/3 bg-slate-200 rounded" />
                    <div className="h-2.5 w-1/4 bg-slate-100 rounded" />
                  </div>
                  <div className="h-4 w-20 shrink-0 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : !error && history ? (
        <>
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
            <Panel className="space-y-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#026aa7]" />
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
                    className="w-full rounded-full border border-slate-300 bg-white py-2 pl-8 pr-9 text-xs outline-none transition-colors hover:border-slate-400 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setStudentPage(1);
                      }}
                      aria-label="Xóa nội dung tìm kiếm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-[#026aa7]"
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
                        <span className="shrink-0 rounded-md border border-[#7bc043]/40 bg-[#7bc043]/10 px-2 py-1 text-xs font-bold tabular-nums text-[#446d20]">
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
                  <div className="py-12 text-center space-y-2">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#026aa7]/5 text-[#026aa7]">
                      <Users className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">
                      {search.trim() ? "Không tìm thấy sinh viên phù hợp." : "Chưa có sinh viên trong học kỳ này."}
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      {search.trim() ? "Thử thay đổi từ khóa tìm kiếm." : "Chọn học kỳ khác hoặc làm mới dữ liệu."}
                    </p>
                  </div>
                )}
              </div>
              <div className="hidden overflow-x-auto rounded-xl border border-slate-200/90 lg:block">
                <table className="w-full min-w-[680px] text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                    <tr>
                      <th className="px-4 py-2.5">Sinh viên</th>
                      <th className="px-4 py-2.5">Doanh nghiệp</th>
                      <th className="px-4 py-2.5 text-center">Đã phản hồi</th>
                      <th className="px-4 py-2.5 text-right">Kết quả cuối kỳ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedStudents.map((student) => (
                      <tr key={student.internshipId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{student.studentName}</p>
                          <p className="mt-0.5 text-slate-500">{student.studentCode}{student.className ? ` · ${student.className}` : ""}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{student.companyName || "Chưa phân doanh nghiệp"}</td>
                        <td className="px-4 py-3 text-center font-medium text-slate-700">{student.reviewedReportCount}</td>
                        <td className="px-4 py-3 text-right">
                          {student.isFinalized && student.finalGrade != null ? (
                            <span className="font-bold text-[#446d20]">{student.finalGrade.toFixed(1)} / 10</span>
                          ) : <span className="text-slate-500">Chưa chốt</span>}
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-10 text-center">
                        <div className="space-y-2 text-center">
                          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#026aa7]/5 text-[#026aa7]">
                            <Users className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <p className="text-xs font-semibold text-slate-700">
                            {search.trim() ? "Không tìm thấy sinh viên phù hợp." : "Chưa có sinh viên trong học kỳ này."}
                          </p>
                          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                            {search.trim() ? "Thử thay đổi từ khóa tìm kiếm." : "Chọn học kỳ khác hoặc làm mới dữ liệu."}
                          </p>
                        </div>
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

            <Panel padding="none" className="min-w-0 overflow-hidden rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-[#026aa7]" />
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
                  <div className="px-4 py-12 text-center space-y-2">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#026aa7]/5 text-[#026aa7]">
                      <Clock3 className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">Chưa có hoạt động được lưu cho học kỳ này.</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">Hoạt động sẽ hiển thị khi bạn phản hồi báo cáo hoặc chấm kết quả trong học kỳ.</p>
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
        <Panel className="rounded-xl border border-slate-200/90 p-10 text-center shadow-2xs">
          <div className="space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#026aa7]/5 text-[#026aa7]">
              <History className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold text-slate-700">Chưa có học kỳ hướng dẫn được ghi nhận.</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">Dữ liệu lịch sử sẽ xuất hiện sau khi bạn hướng dẫn sinh viên trong một học kỳ.</p>
          </div>
        </Panel>
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
            aria-label="Số dòng mỗi trang"
            className="min-h-9 cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-800 outline-none transition-colors hover:border-slate-400 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
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
          className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-full bg-slate-100 p-1.5 text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-800">{page} / {totalPages}</span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          disabled={page === totalPages}
          aria-label="Trang sau"
          className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-full bg-slate-100 p-1.5 text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
