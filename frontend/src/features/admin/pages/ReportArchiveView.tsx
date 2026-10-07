import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, ChevronLeft, ChevronRight, Download, FileArchive, RefreshCw, Search } from "lucide-react";
import { Panel } from "../../../components/common/Panel";
import { Toolbar } from "../../../components/common/Toolbar";
import { EmptyState } from "../../../components/common/EmptyState";
import { RequestErrorState } from "../../../components/common/RequestErrorState";
import { TableSkeleton } from "../../../components/common/SkeletonLoader";
import { useSemester } from "../../../contexts/SemesterContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { adminReportArchiveService, type WeeklyReportArchiveStudentDto } from "../../../services/adminReportArchive.service";

const dateLabel = (value?: string | null) => value
  ? new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
  : "—";

export const ReportArchiveView = ({ onShowToast }: { onShowToast: (message: string) => void }) => {
  const { semesters, selectedSemesterId, selectSemester } = useSemester();
  const [students, setStudents] = useState<WeeklyReportArchiveStudentDto[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const semesterId = selectedSemesterId && selectedSemesterId !== "all" ? selectedSemesterId : "";
  const selectedSemester = semesters.find((semester) => semester.id === semesterId);

  const loadStudents = useCallback(async () => {
    if (!semesterId) {
      setStudents([]);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      setStudents(await adminReportArchiveService.getStudents(semesterId));
    } catch (requestError) {
      setStudents([]);
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [semesterId]);

  useEffect(() => {
    void loadStudents();
    setCurrentPage(1);
  }, [loadStudents]);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("vi");
    if (!term) return students;
    return students.filter((student) =>
      [student.studentCode, student.studentName, student.className, student.companyName]
        .some((value) => value?.toLocaleLowerCase("vi").includes(term)),
    );
  }, [students, search]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedStudents = filteredStudents.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);

  const totalReports = students.reduce((total, student) => total + student.reportCount, 0);
  const download = async (student?: WeeklyReportArchiveStudentDto) => {
    if (!semesterId) return;
    const key = student?.studentId ?? "semester";
    setLoadingKey(key);
    try {
      await adminReportArchiveService.downloadZip(semesterId, student?.studentId);
    } catch (requestError) {
      onShowToast(getApiErrorMessage(requestError));
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 pb-12">
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#026aa7] px-4 py-3 text-white">
          <div className="flex min-w-0 items-center gap-2">
            <Archive className="h-5 w-5 shrink-0 text-white/90" aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-wide">Kho báo cáo tuần</h1>
              <p className="mt-0.5 text-xs text-white/80">
                Xem và tải báo cáo tuần theo sinh viên hoặc toàn học kỳ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void download()}
            disabled={!semesterId || totalReports === 0 || loadingKey !== null}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white px-3 text-xs font-bold text-[#026aa7] transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingKey === "semester" ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileArchive className="h-4 w-4" aria-hidden="true" />
            )}
            {loadingKey === "semester" ? "Đang tạo ZIP…" : "Tải ZIP toàn kỳ"}
          </button>
        </div>
      </section>

      <Toolbar
        left={(
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            <span>
              Học kỳ: <strong className="font-semibold text-slate-800">{selectedSemester?.name || "—"}</strong>
            </span>
            {isLoading && (
              <span role="status" className="inline-flex items-center gap-1.5 font-medium text-[#026aa7]">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Đang tải kho báo cáo…
              </span>
            )}
          </div>
        )}
        right={(
          <>
            <label htmlFor="archive-semester" className="text-xs font-semibold text-slate-700">Học kỳ</label>
            <select
              id="archive-semester"
              value={selectedSemesterId}
              onChange={(event) => selectSemester(event.target.value)}
              className="min-h-9 min-w-60 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus-visible:border-[#026aa7] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            >
              <option value="all">Chọn học kỳ</option>
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name || `${semester.term} · ${semester.academicYear}`}
                </option>
              ))}
            </select>
            {semesterId && (
              <button
                type="button"
                onClick={() => void loadStudents()}
                disabled={isLoading}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Làm mới danh sách"
                title="Làm mới"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
              </button>
            )}
          </>
        )}
      />

      {!semesterId ? (
        <Panel className="rounded-xl border-slate-200/90 shadow-2xs">
          <EmptyState
            icon={Archive}
            title="Chọn học kỳ để xem kho báo cáo"
            description="Chọn một học kỳ cụ thể ở bộ lọc phía trên để xem báo cáo tuần đã lưu."
          />
        </Panel>
      ) : error ? (
        <Panel className="rounded-xl border-slate-200/90 shadow-2xs">
          <RequestErrorState
            title="Không thể tải kho báo cáo"
            message={error}
            onRetry={() => void loadStudents()}
            retrying={isLoading}
          />
        </Panel>
      ) : (
        <>
          <Panel className="space-y-4 rounded-xl border-slate-200/90 shadow-2xs">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold tracking-tight text-slate-900">Báo cáo theo sinh viên</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {selectedSemester?.name || "Học kỳ đang chọn"} · ZIP toàn kỳ theo thư mục MSSV/Tuần
                </p>
              </div>
              <label className="relative block w-full sm:w-72">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Tìm MSSV, họ tên, lớp, doanh nghiệp"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs outline-none focus:border-[#026aa7] focus:bg-white"
                  aria-label="Tìm sinh viên trong kho báo cáo"
                />
              </label>
            </div>
            {isLoading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : filteredStudents.length === 0 ? (
              <EmptyState
                icon={Archive}
                title={students.length === 0 ? "Chưa có báo cáo trong học kỳ này" : "Không tìm thấy sinh viên phù hợp"}
                description={students.length === 0
                  ? "Chưa có báo cáo tuần nào được lưu cho học kỳ đã chọn."
                  : "Thử thay đổi từ khóa tìm kiếm để tìm sinh viên trong kho báo cáo."}
                secondaryAction={students.length > 0 ? {
                  label: "Xóa từ khóa tìm kiếm",
                  onClick: () => {
                    setSearch("");
                    setCurrentPage(1);
                  },
                } : undefined}
              />
            ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200/80">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Sinh viên</th>
                    <th className="px-4 py-2.5">Doanh nghiệp</th>
                    <th className="px-4 py-2.5 text-center">Báo cáo</th>
                    <th className="px-4 py-2.5">Tuần có báo cáo</th>
                    <th className="px-4 py-2.5">Nộp gần nhất</th>
                    <th className="px-4 py-2.5 text-right">Tải xuống</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedStudents.map((student) => (
                    <tr key={student.studentId} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{student.studentName}</p>
                        <p className="mt-0.5 text-slate-500">{student.studentCode}{student.className ? ` · ${student.className}` : ""}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{student.companyName || "Chưa phân doanh nghiệp"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-slate-800">{student.reportCount}</span>
                        <span className="text-slate-500"> · {student.fileCount} tệp</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {student.weeks.length ? student.weeks.map((week) => `T${week}`).join(", ") : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{dateLabel(student.lastSubmittedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void download(student)}
                          disabled={student.reportCount === 0 || loadingKey !== null}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:cursor-not-allowed disabled:opacity-40"
                          title={`Tải ZIP báo cáo của ${student.studentCode}`}
                          aria-label={`Tải ZIP báo cáo của ${student.studentName}`}
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          {loadingKey === student.studentId ? "Đang tạo…" : "ZIP"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
            {!isLoading && filteredStudents.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span>
                    Hiển thị {(visiblePage - 1) * pageSize + 1}
                    –{Math.min(visiblePage * pageSize, filteredStudents.length)} / {filteredStudents.length} sinh viên
                  </span>
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    className="min-h-9 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-700 outline-none focus-visible:border-[#026aa7] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
                    aria-label="Số sinh viên mỗi trang"
                  >
                    <option value={10}>10 / trang</option>
                    <option value={25}>25 / trang</option>
                    <option value={50}>50 / trang</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={visiblePage === 1}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:pointer-events-none disabled:opacity-40"
                    aria-label="Trang trước"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="min-w-16 text-center font-semibold text-slate-700">{visiblePage} / {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={visiblePage === totalPages}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:pointer-events-none disabled:opacity-40"
                    aria-label="Trang sau"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
};
