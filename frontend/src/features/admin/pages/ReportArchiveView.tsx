import { useEffect, useMemo, useState } from "react";
import { Archive, ChevronLeft, ChevronRight, Download, FileArchive, FileText, RefreshCw, Search, Users } from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
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

  const loadStudents = async () => {
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
  };

  useEffect(() => {
    void loadStudents();
    setCurrentPage(1);
  }, [semesterId]);

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
  const totalFiles = students.reduce((total, student) => total + student.fileCount, 0);

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
    <div className="mx-auto max-w-[1440px] space-y-5 animate-in fade-in duration-200">
      <PageHeader
        icon={Archive}
        title="Kho báo cáo tuần"
        subtitle="Tập hợp báo cáo tuần của sinh viên theo học kỳ; tệp ZIP được phân thư mục theo mã sinh viên."
        actions={[
          {
            label: loadingKey === "semester" ? "Đang tạo ZIP…" : "Tải ZIP toàn kỳ",
            icon: FileArchive,
            onClick: () => void download(),
            variant: "primary",
            disabled: !semesterId || totalReports === 0 || loadingKey !== null,
            loading: loadingKey === "semester",
          },
        ]}
      />

      <Panel padding="sm" className="flex flex-wrap items-center gap-3">
        <label htmlFor="archive-semester" className="text-xs font-semibold text-slate-700">Học kỳ</label>
        <select
          id="archive-semester"
          value={selectedSemesterId}
          onChange={(event) => selectSemester(event.target.value)}
          className="min-w-64 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-600 focus:outline-none"
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            aria-label="Làm mới danh sách"
            title="Làm mới"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        )}
      </Panel>

      {!semesterId ? (
        <Panel className="py-12 text-center text-sm text-slate-500">Chọn một học kỳ cụ thể trên bộ lọc để xem kho báo cáo.</Panel>
      ) : error ? (
        <Panel className="flex flex-wrap items-center justify-between gap-3 border-rose-200 bg-rose-50 text-sm text-rose-800">
          <span>{error}</span>
          <button type="button" onClick={() => void loadStudents()} className="font-semibold underline underline-offset-2">Thử lại</button>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-3">
            <Metric icon={Users} label="Sinh viên trong kỳ" value={students.length} />
            <Metric icon={FileText} label="Báo cáo tuần" value={totalReports} />
            <Metric icon={FileArchive} label="Tệp đính kèm" value={totalFiles} />
          </div>

          <Panel padding="none" className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Báo cáo theo sinh viên</h2>
                <p className="mt-0.5 text-xs text-slate-500">ZIP toàn kỳ giữ cấu trúc thư mục MSSV/Tuần.</p>
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
                  className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3 text-xs outline-none focus:border-blue-600"
                  aria-label="Tìm sinh viên trong kho báo cáo"
                />
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
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
                  {isLoading ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">Đang tải kho báo cáo…</td></tr>
                  ) : paginatedStudents.map((student) => (
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
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                          title={`Tải ZIP báo cáo của ${student.studentCode}`}
                        >
                          <Download className="h-3.5 w-3.5" />
                          {loadingKey === student.studentId ? "Đang tạo…" : "ZIP"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && filteredStudents.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">Không tìm thấy sinh viên hoặc kỳ này chưa có sinh viên.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span>
                  Hiển thị {filteredStudents.length === 0 ? 0 : (visiblePage - 1) * pageSize + 1}
                  –{Math.min(visiblePage * pageSize, filteredStudents.length)} / {filteredStudents.length} sinh viên
                </span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700 outline-none"
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
                  className="rounded-md border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-16 text-center font-semibold text-slate-700">{visiblePage} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={visiblePage === totalPages}
                  className="rounded-md border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                  aria-label="Trang sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
};

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="bg-white px-4 py-3.5">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

