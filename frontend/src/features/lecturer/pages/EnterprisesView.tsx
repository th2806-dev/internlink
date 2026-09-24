import { useMemo, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, Eye, GraduationCap, RefreshCw, Search, ArrowRight } from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { Toolbar } from "../../../components/common/Toolbar";
import { CompanyAvatar } from "../../../components/common/CompanyAvatar";
import { useSemester } from "../../../contexts/SemesterContext";
import { useNavigate } from "react-router-dom";
import type { Enterprise } from "../../../types/enterprise";

export const EnterprisesView = ({
  enterprises = [],
  readOnly = false,
  onRefresh,
}: {
  enterprises?: Enterprise[];
  readOnly?: boolean;
  onRefresh?: () => Promise<void> | void;
}) => {
  const { selectedSemester } = useSemester();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fields = useMemo(
    () => [...new Set(enterprises.map((company) => company.field).filter((field) => field && field !== "—"))].sort(),
    [enterprises],
  );

  const filteredEnterprises = useMemo(() => {
    const query = search.trim().toLowerCase();
    return enterprises.filter((company) => {
      const matchesSearch =
        !query ||
        company.name.toLowerCase().includes(query) ||
        company.field.toLowerCase().includes(query) ||
        company.contactPerson.toLowerCase().includes(query) ||
        company.location.toLowerCase().includes(query);
      return matchesSearch && (fieldFilter === "all" || company.field === fieldFilter);
    });
  }, [enterprises, fieldFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEnterprises.length / pageSize));
  const paginatedEnterprises = filteredEnterprises.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto animate-in fade-in duration-200 pb-10">
      <PageHeader
        icon={Building2}
        title="Doanh nghiệp được phân công"
        subtitle={readOnly ? "Danh sách doanh nghiệp đang tiếp nhận sinh viên thuộc nhóm hướng dẫn." : "Danh sách doanh nghiệp."}
        actions={[
          {
            label: "Làm mới",
            icon: RefreshCw,
            onClick: async () => {
              await onRefresh?.();
            },
            variant: "secondary",
          },
        ]}
      />

      <Toolbar
        left={
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded font-bold text-[11px]">
              {selectedSemester?.name ?? "Học kỳ hiện tại"}
            </span>
            <span>·</span>
            <span className="font-bold text-slate-800">{enterprises.length}</span> DN ·{" "}
            <span className="font-bold text-blue-700">{enterprises.reduce((sum, company) => sum + company.studentCount, 0)}</span> SV đang thực tập
          </div>
        }
      />

      <Panel className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Danh sách Doanh nghiệp ({filteredEnterprises.length})</h2>
            <p className="text-xs text-slate-500 font-medium">Dữ liệu lấy từ các internship được phân công cho giảng viên.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="relative min-w-[260px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input value={search} onChange={(event) => updateFilter(setSearch, event.target.value)} placeholder="Tìm tên, lĩnh vực, liên hệ..." className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium outline-none focus:bg-white focus:border-blue-500" />
            </div>
            <select value={fieldFilter} onChange={(event) => updateFilter(setFieldFilter, event.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500">
              <option value="all">Tất cả lĩnh vực</option>
              {fields.map((field) => <option key={field} value={field}>{field}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200/80 rounded-md">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3 text-center w-12">STT</th>
                <th className="py-2.5 px-3">Doanh nghiệp</th>
                <th className="py-2.5 px-3">Lĩnh vực</th>
                <th className="py-2.5 px-3">Người liên hệ</th>
                <th className="py-2.5 px-3">Địa chỉ</th>
                <th className="py-2.5 px-3 text-center">Sinh viên</th>
                <th className="py-2.5 px-3 text-center">Trạng thái</th>
                <th className="py-2.5 px-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {paginatedEnterprises.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">Không có doanh nghiệp phù hợp với bộ lọc hiện tại.</td></tr>
              ) : paginatedEnterprises.map((company, index) => (
                <tr key={company.id} className="hover:bg-blue-50/40 cursor-pointer" onClick={() => navigate(`/lecturer/enterprises/${company.id}`)}>
                  <td className="py-3 px-3 text-center text-slate-400 font-mono font-bold">{(currentPage - 1) * pageSize + index + 1}</td>
                  <td className="py-3 px-3 pl-4">
                    <div className="flex items-center gap-3">
                      <CompanyAvatar name={company.name} size={40} />
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 text-xs block truncate">{company.name}</span>
                        <span className="text-[10px] text-slate-400">Mã: {company.shortCode}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 ml-auto shrink-0" />
                    </div>
                  </td>
                  <td className="py-3 px-3 text-[11px] font-semibold">{company.field}</td>
                  <td className="py-3 px-3"><span className="font-bold text-slate-900 block">{company.contactPerson}</span><span className="text-[10px] text-slate-500">{company.contactPhone}</span></td>
                  <td className="py-3 px-3 text-[11px] max-w-[220px] truncate">{company.location}</td>
                  <td className="py-3 px-3 text-center"><span className="font-bold text-blue-600 font-mono text-xs px-2 py-0.5 bg-blue-50 rounded-lg border border-blue-100">{company.studentCount} SV</span></td>
                  <td className="py-3 px-3 text-center"><span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-current" />{company.status}</span></td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/lecturer/enterprises/${company.id}`);
                      }}
                      className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                      title="Xem chi tiết doanh nghiệp"
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
            <span>Hiển thị {paginatedEnterprises.length} / {filteredEnterprises.length} doanh nghiệp</span>
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
            <button type="button" onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))} disabled={currentPage === 1} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
            <span className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 text-slate-800">{currentPage} / {totalPages}</span>
            <button type="button" onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </Panel>
    </div>
  );
};