import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  GraduationCap,
  RefreshCw,
  Search,
} from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { useSemester } from "../../../contexts/SemesterContext";
import type { Student } from "../../../types/student";

export const StudentsView = ({
  students = [],
  onRefresh,
}: {
  students?: Student[];
  onRefresh?: () => Promise<void> | void;
}) => {
  const navigate = useNavigate();
  const { selectedSemester } = useSemester();
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
    () => [...new Set(students.map((student) => student.company).filter(Boolean))].sort(),
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
          student.company.toLowerCase().includes(query) ||
          student.class.toLowerCase().includes(query) ||
          student.major.toLowerCase().includes(query);
        return (
          matchesSearch &&
          (classFilter === "all" || student.class === classFilter) &&
          (statusFilter === "all" || student.status === statusFilter) &&
          (companyFilter === "all" || student.company === companyFilter)
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

  const statusClass = (student: Student) => {
    if (student.riskFlag || student.status === "Quá hạn") {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (student.status === "Chờ phản hồi") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (student.status === "Hoàn thành") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto">
      <PageHeader
        icon={GraduationCap}
        title="Sinh viên được phân công"
        subtitle="Sinh viên thuộc nhóm hướng dẫn trong học kỳ đang chọn."
        actions={[
          {
            label: "Làm mới",
            icon: RefreshCw,
            onClick: async () => {
              if (isRefreshing) return;
              setIsRefreshing(true);
              try {
                await onRefresh?.();
              } finally {
                setIsRefreshing(false);
              }
            },
            variant: "secondary",
            loading: isRefreshing,
            disabled: isRefreshing,
          },
        ]}
      />

      <Panel className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Danh sách sinh viên</h2>
              {selectedSemester?.name && (
                <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                  {selectedSemester.name}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {filteredStudents.length} / {students.length} sinh viên
            </p>
          </div>

          <div className="flex flex-col gap-2 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
            <div className="relative w-full min-w-0 sm:w-auto sm:min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                value={searchQuery}
                onChange={(event) => updateFilter(setSearchQuery, event.target.value)}
                placeholder="Tìm tên, MSSV, lớp, doanh nghiệp..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
            <select value={classFilter} onChange={(event) => updateFilter(setClassFilter, event.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 sm:w-auto">
              <option value="all">Tất cả Lớp</option>
              {classOptions.map((item) => <option key={item} value={item}>Lớp {item}</option>)}
            </select>
            <select value={companyFilter} onChange={(event) => updateFilter(setCompanyFilter, event.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 sm:w-auto">
              <option value="all">Tất cả DN</option>
              {companyOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => updateFilter(setStatusFilter, event.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 sm:w-auto">
              <option value="all">Tất cả trạng thái</option>
              {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={sortBy} onChange={(event) => updateFilter(setSortBy, event.target.value)} className="w-full px-3 py-2 bg-blue-50/80 border border-blue-200 rounded-md font-bold text-blue-900 outline-none focus:bg-white focus:border-blue-500 sm:w-auto">
              <option value="name">Sắp xếp: Tên A-Z</option>
              <option value="class">Sắp xếp: Lớp</option>
              <option value="progress">Sắp xếp: Tiến độ</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-200 md:hidden">
          {paginatedStudents.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Không tìm thấy sinh viên phù hợp với bộ lọc hiện tại.
            </p>
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
                    <dd className="break-words text-right font-medium text-slate-800">{student.company || "Chưa phân công"}</dd>
                    <dt className="text-slate-500">Vị trí</dt>
                    <dd className="break-words text-right font-medium text-slate-800">{student.position || "Chưa cập nhật"}</dd>
                    <dt className="text-slate-500">Tiến độ</dt>
                    <dd className="flex items-center justify-end gap-2 font-semibold text-slate-800">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                        <span className="block h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, student.progress))}%` }} />
                      </span>
                      {student.progress}%
                    </dd>
                  </dl>
                  <button
                    type="button"
                    onClick={() => navigate(`/lecturer/students/${student.id}`)}
                    className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <Eye className="h-4 w-4" /> Xem hồ sơ
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto border border-slate-200/80 rounded-md md:block">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3 text-center w-12">STT</th>
                <th className="py-2.5 px-3">Họ & tên</th>
                <th className="py-2.5 px-3">MSSV & Lớp</th>
                <th className="py-2.5 px-3">Doanh nghiệp</th>
                <th className="py-2.5 px-3">Vị trí</th>
                <th className="py-2.5 px-3">Tiến độ</th>
                <th className="py-2.5 px-3 text-center">Trạng thái</th>
                <th className="py-2.5 px-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Không tìm thấy sinh viên phù hợp với bộ lọc hiện tại.
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
                    <p className="text-[10px] text-blue-600 font-bold">{student.class}</p>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{student.company}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-700">{student.position}</td>
                  <td className="py-3 px-3 min-w-[150px]">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, student.progress))}%` }} />
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
                      className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-4 h-4" />
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
              <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setCurrentPage(1); }} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer text-xs">
                <option value={5}>5 dòng</option>
                <option value={10}>10 dòng</option>
                <option value={20}>20 dòng</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <button type="button" onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))} disabled={visiblePage === 1} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition-colors cursor-pointer" aria-label="Trang trước"><ChevronLeft className="w-4 h-4" /></button>
            <span className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 text-slate-800">{visiblePage} / {totalPages}</span>
            <button type="button" onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))} disabled={visiblePage === totalPages} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition-colors cursor-pointer" aria-label="Trang sau"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </Panel>
    </div>
  );
};