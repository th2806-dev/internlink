import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Search,
  Users,
  GraduationCap,
} from "lucide-react";
import { Panel } from "../../../components/common/Panel";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import type { Student } from "../../../types/student";

const UNASSIGNED_COMPANY_LABEL = "Chưa phân công doanh nghiệp";
const UNASSIGNED_COMPANY_VALUES = new Set([
  "",
  "Chưa có",
  "Chưa phân công",
  UNASSIGNED_COMPANY_LABEL,
  "—",
]);

function getCompanyLabel(company: string): string {
  return UNASSIGNED_COMPANY_VALUES.has(company.trim())
    ? UNASSIGNED_COMPANY_LABEL
    : company;
}

function getPositionLabel(position: string): string {
  return position.trim() && position !== "—" ? position : "Chưa cập nhật";
}

export const StudentsView = ({
  students = [],
  onRefresh,
  isLoading = false,
  error = null,
}: {
  students?: Student[];
  onRefresh?: () => Promise<void> | void;
  isLoading?: boolean;
  error?: string | null;
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const classOptions = useMemo(
    () => [...new Set(students.map((student) => student.class).filter(Boolean))].sort(),
    [students],
  );
  const companyOptions = useMemo(
    () =>
      [...new Set(students.map((student) => getCompanyLabel(student.company)))].sort(
        (a, b) => a.localeCompare(b, "vi"),
      ),
    [students],
  );
  const statusOptions = useMemo(
    () => [...new Set(students.map((student) => student.status).filter(Boolean))].sort(),
    [students],
  );

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return students
      .filter((student) => {
        const matchesSearch =
          !query ||
          student.name.toLowerCase().includes(query) ||
          student.mssv.toLowerCase().includes(query) ||
          getCompanyLabel(student.company).toLowerCase().includes(query) ||
          student.class.toLowerCase().includes(query) ||
          student.major.toLowerCase().includes(query) ||
          getPositionLabel(student.position).toLowerCase().includes(query);
        return (
          matchesSearch &&
          (classFilter === "all" || student.class === classFilter) &&
          (statusFilter === "all" || student.status === statusFilter) &&
          (companyFilter === "all" ||
            getCompanyLabel(student.company) === companyFilter)
        );
      })
      .sort((a, b) => {
        if (sortBy === "progress") return b.progress - a.progress;
        if (sortBy === "class") return a.class.localeCompare(b.class, "vi");
        return a.name.localeCompare(b.name, "vi");
      });
  }, [classFilter, companyFilter, searchQuery, sortBy, statusFilter, students]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedStudents = filteredStudents.slice(
    (visiblePage - 1) * pageSize,
    visiblePage * pageSize,
  );

  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const statusClass = (student: Student) => {
    if (student.riskFlag || student.status === "Quá hạn") {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (student.status === "Chờ phản hồi") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (student.status === "Đang chỉnh sửa") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (student.status === "Hoàn thành") {
      return "bg-[#7bc043]/10 text-[#446d20] border-[#7bc043]/40";
    }
    return "bg-[#026aa7]/5 text-[#025a8e] border-[#026aa7]/20";
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 animate-in fade-in duration-200 font-sans pb-12">
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#026aa7] px-4 py-3 text-white">
          <div className="flex min-w-0 items-center gap-2">
            <GraduationCap className="h-5 w-5 shrink-0 text-white/90" aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-wide">Danh sách sinh viên</h1>
              <p className="mt-0.5 text-xs text-white/80">
                Theo dõi sinh viên được phân công hướng dẫn trong học kỳ đang chọn.
              </p>
            </div>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              aria-label="Làm mới danh sách sinh viên"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              Làm mới
            </button>
          )}
        </div>
      </section>

      {isLoading ? (
        <div role="status" aria-live="polite" className="space-y-3">
          <span className="sr-only">Đang tải danh sách sinh viên...</span>
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs animate-pulse">
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
      ) : error ? (
        <Panel
          role="alert"
          className="space-y-4 rounded-xl border border-slate-200/90 p-8 text-center shadow-2xs"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              Không thể tải danh sách sinh viên
            </h3>
            <p className="text-xs text-slate-500">
              {error} — vui lòng bấm thử lại.
            </p>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="min-h-11 rounded-lg bg-[#026aa7] px-5 text-xs font-bold text-white transition-colors hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 cursor-pointer"
            >
              Thử lại
            </button>
          )}
        </Panel>
      ) : (
      <Panel className="space-y-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900">Sinh viên được phân công</h2>
          <p className="text-xs font-medium text-slate-500">
            {filteredStudents.length} / {students.length} sinh viên
          </p>
        </div>
        <div className="space-y-4 border-b border-slate-100 pb-4">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1.6fr)_repeat(4,minmax(130px,1fr))]">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                aria-label="Tìm sinh viên"
                value={searchQuery}
                onChange={(event) => updateFilter(setSearchQuery, event.target.value)}
                placeholder="Tìm tên, MSSV, lớp, ngành, doanh nghiệp, vị trí..."
                className="min-h-11 w-full rounded-full border border-slate-300 bg-white pl-9 pr-4 text-base font-medium text-slate-800 outline-none transition-colors placeholder:font-normal placeholder:text-slate-500 hover:border-slate-400 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20 sm:text-xs"
              />
            </div>
            <select aria-label="Lọc theo lớp" value={classFilter} onChange={(event) => updateFilter(setClassFilter, event.target.value)} className="min-h-11 w-full rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 outline-none transition-colors hover:border-slate-400 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20">
              <option value="all">Tất cả lớp</option>
              {classOptions.map((item) => <option key={item} value={item}>Lớp {item}</option>)}
            </select>
            <select aria-label="Lọc theo doanh nghiệp" value={companyFilter} onChange={(event) => updateFilter(setCompanyFilter, event.target.value)} className="min-h-11 w-full rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 outline-none transition-colors hover:border-slate-400 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20">
              <option value="all">Tất cả doanh nghiệp</option>
              {companyOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select aria-label="Lọc theo trạng thái" value={statusFilter} onChange={(event) => updateFilter(setStatusFilter, event.target.value)} className="min-h-11 w-full rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 outline-none transition-colors hover:border-slate-400 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20">
              <option value="all">Tất cả trạng thái</option>
              {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select aria-label="Sắp xếp sinh viên" value={sortBy} onChange={(event) => updateFilter(setSortBy, event.target.value)} className="min-h-11 w-full rounded-full border border-[#026aa7]/25 bg-[#026aa7]/5 px-4 text-xs font-semibold text-[#025a8e] outline-none transition-colors hover:border-[#026aa7]/50 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20">
              <option value="name">Sắp xếp: Tên A-Z</option>
              <option value="class">Sắp xếp: Lớp</option>
              <option value="progress">Sắp xếp: Tiến độ</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-200 md:hidden">
          {paginatedStudents.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#026aa7]/5 text-[#026aa7]">
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-xs font-semibold text-slate-700">
                {students.length === 0
                  ? "Chưa có sinh viên được phân công trong học kỳ này."
                  : "Không tìm thấy sinh viên phù hợp."}
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                {students.length === 0
                  ? "Kiểm tra lại học kỳ đang chọn hoặc làm mới dữ liệu."
                  : "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc."}
              </p>
            </div>
          ) : paginatedStudents.map((student) => (
            <article key={student.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex min-w-0 items-start gap-3">
                <InitialsAvatar name={student.name} seed={student.mssv} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold text-slate-900">{student.name}</p>
                      <p className="mt-0.5 break-all text-[11px] text-slate-500">{student.mssv} · {student.class}</p>
                    </div>
                    <span className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold ${statusClass(student)}`}>
                      {student.status}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 border-t border-slate-100 pt-3 text-xs">
                    <dt className="text-slate-500">Doanh nghiệp</dt>
                    <dd className="break-words text-right font-medium text-slate-800">{getCompanyLabel(student.company)}</dd>
                    <dt className="text-slate-500">Vị trí</dt>
                    <dd className="break-words text-right font-medium text-slate-800">{getPositionLabel(student.position)}</dd>
                    <dt className="text-slate-500">Tiến độ</dt>
                    <dd className="flex items-center justify-end gap-2 font-semibold text-slate-800">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                        <span className="block h-full rounded-full bg-[#4d74c9]" style={{ width: `${Math.min(100, Math.max(0, student.progress))}%` }} />
                      </span>
                      {student.progress}%
                    </dd>
                  </dl>
                  <button
                    type="button"
                    onClick={() => navigate(`/lecturer/students/${student.id}`)}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#026aa7]/25 bg-white px-3 text-xs font-semibold text-[#026aa7] transition-colors hover:bg-[#026aa7]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" /> Xem hồ sơ
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto rounded-xl border border-slate-200/90 md:block">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                <th scope="col" className="py-2.5 px-3 text-center w-12">STT</th>
                <th scope="col" className="py-2.5 px-3">Họ & tên</th>
                <th scope="col" className="py-2.5 px-3">MSSV & Lớp</th>
                <th scope="col" className="py-2.5 px-3">Doanh nghiệp</th>
                <th scope="col" className="py-2.5 px-3">Vị trí</th>
                <th scope="col" className="py-2.5 px-3">Tiến độ</th>
                <th scope="col" className="py-2.5 px-3 text-center">Trạng thái</th>
                <th scope="col" className="py-2.5 px-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center">
                    <div className="space-y-2 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#026aa7]/5 text-[#026aa7]">
                        <Users className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        {students.length === 0
                          ? "Chưa có sinh viên được phân công trong học kỳ này."
                          : "Không tìm thấy sinh viên phù hợp."}
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                        {students.length === 0
                          ? "Kiểm tra lại học kỳ đang chọn hoặc làm mới dữ liệu."
                          : "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginatedStudents.map((student, index) => (
                <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 text-center text-slate-400 font-mono font-bold">
                    {(visiblePage - 1) * pageSize + index + 1}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <InitialsAvatar name={student.name} seed={student.mssv} size={32} />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate leading-tight" title={student.name}>{student.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate leading-tight">{student.email ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <p className="font-mono font-bold text-slate-800">{student.mssv}</p>
                    <p className="text-[10px] font-bold text-[#025a8e]">{student.class}</p>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{getCompanyLabel(student.company)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-700">{getPositionLabel(student.position)}</td>
                  <td className="py-3 px-3 min-w-[150px]">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-[#4d74c9]" style={{ width: `${Math.min(100, Math.max(0, student.progress))}%` }} />
                      </div>
                      <span className="font-bold text-slate-700">{student.progress}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md inline-flex items-center border ${statusClass(student)}`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => navigate(`/lecturer/students/${student.id}`)}
                      aria-label={`Xem hồ sơ ${student.name}`}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[#026aa7] transition-colors hover:bg-[#026aa7]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2"
                    >
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-1 border-t border-slate-100">
          <div className="flex items-center gap-3 text-slate-500 font-medium">
            <span>Hiển thị {paginatedStudents.length} / {filteredStudents.length} sinh viên</span>
            <div className="flex items-center gap-1.5">
              <span>Số dòng:</span>
              <select aria-label="Số dòng mỗi trang" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setCurrentPage(1); }} className="min-h-11 rounded-full border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 outline-none transition-colors hover:border-slate-400 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20">
                <option value={5}>5 dòng</option>
                <option value={10}>10 dòng</option>
                <option value={20}>20 dòng</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <button type="button" onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))} disabled={visiblePage === 1} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Trang trước"><ChevronLeft className="w-4 h-4" aria-hidden="true" /></button>
            <span className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 text-slate-800">{visiblePage} / {totalPages}</span>
            <button type="button" onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))} disabled={visiblePage === totalPages} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Trang sau"><ChevronRight className="w-4 h-4" aria-hidden="true" /></button>
          </div>
        </div>
      </Panel>
      )}
    </div>
  );
};