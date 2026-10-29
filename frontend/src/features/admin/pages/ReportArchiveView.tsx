import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Archive,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileArchive,
  FileText,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Panel } from "../../../components/common/Panel";
import { EmptyState } from "../../../components/common/EmptyState";
import { RequestErrorState } from "../../../components/common/RequestErrorState";
import { TableSkeleton } from "../../../components/common/SkeletonLoader";
import { useSemester } from "../../../contexts/SemesterContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import {
  adminReportArchiveService,
  type ArchiveDocumentType,
  type StudentArchiveDocumentItemDto,
  type WeeklyReportArchiveStudentDto,
} from "../../../services/adminReportArchive.service";
import { submissionApiService } from "../../../services/submissionApi.service";
import { weeklyReportService } from "../../../services/weeklyReport.service";

const DOCUMENT_TYPES: { value: ArchiveDocumentType; label: string }[] = [
  { value: "all", label: "Tất cả tài liệu" },
  { value: "weekly", label: "Báo cáo tuần" },
  { value: "final", label: "Báo cáo cuối kỳ" },
  { value: "evidence", label: "Đánh giá doanh nghiệp" },
  { value: "product", label: "Sản phẩm thực tế" },
  { value: "other", label: "Nhật ký thực tập" },
];

const dateLabel = (value?: string | null) => value
  ? new Date(value).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      dateStyle: "short",
      timeStyle: "short",
    })
  : "—";

const statusLabel = (status: string) => ({
  Draft: "Bản nháp",
  Submitted: "Chờ duyệt",
  Reviewed: "Đã xem",
  Approved: "Đã duyệt",
  RevisionRequested: "Yêu cầu chỉnh sửa",
  Rejected: "Từ chối",
}[status] ?? status);

const isPreviewable = (fileName?: string | null) =>
  /\.(pdf|png|jpe?g|webp|gif)$/i.test(fileName ?? "");

const matchesDocumentType = (document: StudentArchiveDocumentItemDto, type: ArchiveDocumentType) => {
  if (type === "all") return true;
  if (type === "weekly") return document.documentType === "WeeklyReport";
  if (type === "final") return document.documentType === "FinalReport";
  if (type === "evidence") return document.documentType === "Evidence";
  if (type === "product") return document.documentType === "Product";
  return document.documentType === "InternshipLog";
};

export const ReportArchiveView = ({ onShowToast }: { onShowToast: (message: string) => void }) => {
  const { semesters, selectedSemesterId, selectSemester } = useSemester();
  const [students, setStudents] = useState<WeeklyReportArchiveStudentDto[]>([]);
  const [search, setSearch] = useState("");
  const [documentType, setDocumentType] = useState<ArchiveDocumentType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ url: string; fileName: string } | null>(null);
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

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview]);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("vi");
    return students
      .map((student) => ({
        ...student,
        documents: student.documents.filter((document) => matchesDocumentType(document, documentType)),
      }))
      .filter((student) => {
        const matchesSearch = !term || [
          student.studentCode,
          student.studentName,
          student.className,
          student.companyName,
          ...student.documents.map((document) => document.title),
        ].some((value) => value?.toLocaleLowerCase("vi").includes(term));
        return matchesSearch && student.documents.length > 0;
      });
  }, [students, search, documentType]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedStudents = filteredStudents.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);
  const totalWeeklyReports = students.reduce((total, student) => total + student.weeklyReportCount, 0);
  const totalFinalReports = students.filter((student) => student.hasFinalReport).length;
  const totalEvidence = students.filter((student) => student.hasEvidence).length;
  const totalDocuments = students.reduce((total, student) => total + student.totalFilesCount, 0);
  const semesterControls = (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="archive-semester" className="text-xs font-semibold text-slate-700">Học kỳ</label>
      <select
        id="archive-semester"
        value={selectedSemesterId}
        onChange={(event) => selectSemester(event.target.value)}
        className="h-9 min-w-52 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none transition-colors focus-visible:border-[#026aa7] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
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
      {isLoading && (
        <span role="status" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#026aa7]">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Đang tải kho hồ sơ…
        </span>
      )}
    </div>
  );

  const downloadZip = async (student?: WeeklyReportArchiveStudentDto) => {
    if (!semesterId) return;
    const key = student?.studentId ?? "semester";
    setLoadingKey(key);
    try {
      await adminReportArchiveService.downloadZip(semesterId, student?.studentId, documentType);
    } catch (requestError) {
      onShowToast(getApiErrorMessage(requestError));
    } finally {
      setLoadingKey(null);
    }
  };

  const downloadDocument = async (document: StudentArchiveDocumentItemDto) => {
    const fileName = document.fileName || document.title || "tai-lieu";
    try {
      if (document.documentType === "WeeklyReport") {
        await weeklyReportService.download(document.id, fileName);
      } else if (document.submissionId && document.assetId) {
        await submissionApiService.downloadAsset(document.submissionId, document.assetId, fileName);
      } else if (document.submissionId) {
        await submissionApiService.download(document.submissionId, fileName);
      }
    } catch (requestError) {
      onShowToast(getApiErrorMessage(requestError));
    }
  };

  const previewDocument = async (document: StudentArchiveDocumentItemDto) => {
    const fileName = document.fileName || document.title || "tai-lieu";
    try {
      const result = document.documentType === "WeeklyReport"
        ? await weeklyReportService.download(document.id, fileName, false)
        : document.submissionId && document.assetId
          ? await submissionApiService.downloadAsset(document.submissionId, document.assetId, fileName, false)
          : document.submissionId
            ? await submissionApiService.download(document.submissionId, fileName, false)
            : null;
      if (!result) return;
      if (preview?.url) URL.revokeObjectURL(preview.url);
      setPreview({ url: URL.createObjectURL(result.blob), fileName: result.filename });
    } catch (requestError) {
      onShowToast(getApiErrorMessage(requestError));
    }
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 pb-12">
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#026aa7] px-4 py-3 text-white">
          <div className="flex min-w-0 items-center gap-2">
            <Archive className="h-5 w-5 shrink-0 text-white/90" aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-wide">Kho hồ sơ lưu trữ thực tập</h1>
              <p className="mt-0.5 text-xs text-white/80">
                Quản lý, tra cứu và tải báo cáo tuần, báo cáo cuối kỳ cùng hồ sơ thực tập.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void downloadZip()}
            disabled={!semesterId || totalDocuments === 0 || loadingKey !== null}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-white px-3 text-xs font-bold text-[#026aa7] transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingKey === "semester" ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileArchive className="h-4 w-4" aria-hidden="true" />
            )}
            {loadingKey === "semester" ? "Đang tạo ZIP…" : "Tải ZIP theo bộ lọc"}
          </button>
        </div>
      </section>

      {!semesterId ? (
        <Panel className="rounded-xl border-slate-200/90 shadow-2xs">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">Hồ sơ theo sinh viên</h2>
              <p className="mt-0.5 text-xs text-slate-500">Chọn học kỳ để tra cứu tài liệu đã nộp.</p>
            </div>
            {semesterControls}
          </div>
          <EmptyState
            icon={Archive}
            title="Chọn học kỳ để xem kho hồ sơ"
            description="Chọn một học kỳ cụ thể ở bộ lọc phía trên để tra cứu tài liệu đã nộp."
          />
        </Panel>
      ) : error ? (
        <Panel className="rounded-xl border-slate-200/90 shadow-2xs">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">Hồ sơ theo sinh viên</h2>
              <p className="mt-0.5 text-xs text-slate-500">{selectedSemester?.name || "Học kỳ đang chọn"}</p>
            </div>
            {semesterControls}
          </div>
          <RequestErrorState
            title="Không thể tải kho hồ sơ"
            message={error}
            onRetry={() => void loadStudents()}
            retrying={isLoading}
          />
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Sinh viên có hồ sơ", value: students.filter((student) => student.totalFilesCount > 0).length },
              { label: "Báo cáo tuần", value: totalWeeklyReports },
              { label: "Báo cáo cuối kỳ", value: totalFinalReports },
              { label: "Đánh giá doanh nghiệp", value: totalEvidence },
            ].map((stat) => (
              <Panel key={stat.label} className="rounded-xl border-slate-200/90 p-4 shadow-2xs">
                <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{stat.value}</p>
              </Panel>
            ))}
          </div>

          <Panel className="space-y-4 rounded-xl border-slate-200/90 shadow-2xs">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-3.5">
              <div>
                <h2 className="text-base font-bold tracking-tight text-slate-900">Hồ sơ theo sinh viên</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {selectedSemester?.name || "Học kỳ đang chọn"} · {totalDocuments} tài liệu
                </p>
              </div>
              {semesterControls}
              <div className="grid gap-2 sm:grid-cols-[minmax(230px,1fr)_220px]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Tìm MSSV, họ tên, lớp, doanh nghiệp"
                    className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs outline-none transition-colors focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
                    aria-label="Tìm sinh viên hoặc tài liệu trong kho"
                  />
                </label>
                <label>
                  <span className="sr-only">Lọc theo loại tài liệu</span>
                  <select
                    value={documentType}
                    onChange={(event) => {
                      setDocumentType(event.target.value as ArchiveDocumentType);
                      setCurrentPage(1);
                    }}
                    className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus-visible:border-[#026aa7] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
                  >
                    {DOCUMENT_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {isLoading ? (
              <TableSkeleton rows={5} columns={4} />
            ) : filteredStudents.length === 0 ? (
              <EmptyState
                icon={Archive}
                title={students.length === 0 ? "Chưa có tài liệu trong học kỳ này" : "Không tìm thấy hồ sơ phù hợp"}
                description={students.length === 0
                  ? "Báo cáo tuần và các hồ sơ đã nộp sẽ xuất hiện tại đây."
                  : "Thử đổi loại tài liệu hoặc từ khóa tìm kiếm."}
                secondaryAction={students.length > 0 ? {
                  label: "Xóa bộ lọc",
                  onClick: () => {
                    setSearch("");
                    setDocumentType("all");
                    setCurrentPage(1);
                  },
                } : undefined}
              />
            ) : (
              <div className="space-y-3">
                {paginatedStudents.map((student) => (
                  <article key={student.studentId} className="rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-start gap-3 p-4">
                      <details className="group min-w-0 flex-1">
                        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] [&::-webkit-details-marker]:hidden">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-[#026aa7]" aria-hidden="true">
                            {student.studentName.trim().charAt(0).toLocaleUpperCase("vi")}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-slate-900">{student.studentName}</span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {student.studentCode}{student.className ? ` · ${student.className}` : ""}
                              {student.companyName ? ` · ${student.companyName}` : ""}
                            </span>
                          </span>
                          <span className="hidden flex-wrap justify-end gap-1.5 md:flex">
                            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-800">
                              {student.weeklyReportCount} báo cáo tuần
                            </span>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${student.hasFinalReport ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                              BC cuối: {student.hasFinalReport ? "Đã nộp" : "Chưa nộp"}
                            </span>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${student.hasEvidence ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                              Đánh giá DN: {student.hasEvidence ? "Đã nộp" : "Chưa nộp"}
                            </span>
                          </span>
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
                        </summary>
                        <div className="mt-4 overflow-x-auto border-t border-slate-100 pt-3">
                          <table className="w-full min-w-[760px] text-left text-xs">
                            <thead className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              <tr>
                                <th className="px-3 py-2">Tài liệu</th>
                                <th className="px-3 py-2">Tuần</th>
                                <th className="px-3 py-2">Ngày nộp</th>
                                <th className="px-3 py-2">Trạng thái</th>
                                <th className="px-3 py-2 text-right">Thao tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {student.documents.map((document) => (
                                <tr key={`${document.documentType}-${document.id}`} className="hover:bg-slate-50">
                                  <td className="px-3 py-3">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                                      <div className="min-w-0">
                                        <p className="font-semibold text-slate-800">{document.title}</p>
                                        <p className="mt-0.5 truncate text-slate-500">
                                          {document.displayType}{document.fileName ? ` · ${document.fileName}` : ""}
                                          {document.version > 1 ? ` · Phiên bản ${document.version}` : ""}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-slate-600">{document.weekNumber ? `Tuần ${document.weekNumber}` : "—"}</td>
                                  <td className="px-3 py-3 text-slate-600">{dateLabel(document.submittedAt)}</td>
                                  <td className="px-3 py-3">
                                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700">
                                      {statusLabel(document.status)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="flex justify-end gap-1.5">
                                      {isPreviewable(document.fileName) && (
                                        <button
                                          type="button"
                                          onClick={() => void previewDocument(document)}
                                          className="inline-flex min-h-9 items-center gap-1 rounded-md border border-slate-200 px-2.5 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                                          aria-label={`Xem trước ${document.title}`}
                                        >
                                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                          Xem
                                        </button>
                                      )}
                                      {document.fileName && (
                                        <button
                                          type="button"
                                          onClick={() => void downloadDocument(document)}
                                          className="inline-flex min-h-9 items-center gap-1 rounded-md border border-slate-200 px-2.5 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                                          aria-label={`Tải ${document.title}`}
                                        >
                                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                                          Tải
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                      <button
                        type="button"
                        onClick={() => void downloadZip(student)}
                        disabled={student.documents.length === 0 || loadingKey !== null}
                        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Tải ZIP hồ sơ của ${student.studentName}`}
                      >
                        {loadingKey === student.studentId
                          ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                          : <Download className="h-4 w-4" aria-hidden="true" />}
                        <span className="hidden sm:inline">{loadingKey === student.studentId ? "Đang tạo…" : "ZIP hồ sơ"}</span>
                      </button>
                    </div>
                  </article>
                ))}
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

      {preview && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true" aria-label={`Xem trước ${preview.fileName}`}>
          <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <p className="truncate text-sm font-bold text-slate-900">{preview.fileName}</p>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                aria-label="Đóng xem trước"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <iframe title={`Xem trước ${preview.fileName}`} src={preview.url} className="h-full w-full flex-1" />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};
