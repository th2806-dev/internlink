import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
  Phone,
  RefreshCw,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Panel } from "../../../components/common/Panel";
import { CompanyAvatar } from "../../../components/common/CompanyAvatar";
import { LecturerSubPageHeader } from "../components/LecturerSubPageHeader";
import type { Enterprise } from "../../../types/enterprise";

export const EnterprisesView = ({
  enterprises = [],
  readOnly = false,
  onRefresh,
  isLoading = false,
  error = null,
}: {
  enterprises?: Enterprise[];
  readOnly?: boolean;
  onRefresh?: () => Promise<void> | void;
  isLoading?: boolean;
  error?: string | null;
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fields = useMemo(
    () => [...new Set(enterprises.map((company) => company.field).filter((field) => field && field !== "—"))].sort(),
    [enterprises],
  );

  const filteredEnterprises = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    return enterprises.filter((company) => {
      const matchesSearch =
        !query ||
        company.name.toLocaleLowerCase("vi").includes(query) ||
        company.shortCode.toLocaleLowerCase("vi").includes(query) ||
        company.field.toLocaleLowerCase("vi").includes(query) ||
        company.contactPerson.toLocaleLowerCase("vi").includes(query) ||
        company.contactPhone.toLocaleLowerCase("vi").includes(query) ||
        company.location.toLocaleLowerCase("vi").includes(query);
      return matchesSearch && (fieldFilter === "all" || company.field === fieldFilter);
    });
  }, [enterprises, fieldFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEnterprises.length / pageSize));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedEnterprises = filteredEnterprises.slice(
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

  const openCompany = (companyId: string) => {
    navigate(`/lecturer/enterprises/${companyId}`);
  };

  return (
    <div className="mx-auto max-w-[1300px] animate-in fade-in duration-200 space-y-4 pb-12 font-sans">
      <LecturerSubPageHeader
        icon={Building2}
        title="Danh sách doanh nghiệp"
        subtitle={readOnly
          ? "Các doanh nghiệp đang tiếp nhận sinh viên thuộc nhóm hướng dẫn."
          : "Thông tin doanh nghiệp trong hệ thống."}
      >
        <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
          {filteredEnterprises.length} / {enterprises.length} doanh nghiệp
        </span>
        {onRefresh && (
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            aria-label="Làm mới danh sách doanh nghiệp"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            Làm mới
          </button>
        )}
      </LecturerSubPageHeader>

      {isLoading ? (
        <Panel className="rounded-xl border border-slate-200/90 p-6 text-center shadow-2xs">
          <p role="status" className="text-sm font-medium text-slate-600">
            Đang tải danh sách doanh nghiệp...
          </p>
        </Panel>
      ) : error ? (
        <Panel role="alert" className="space-y-3 rounded-xl border border-rose-200 p-6 text-center shadow-2xs">
          <p className="text-sm font-semibold text-rose-800">
            Không thể tải danh sách doanh nghiệp: {error}
          </p>
          {onRefresh && (
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="min-h-10 rounded-lg bg-[#026aa7] px-4 text-xs font-semibold text-white hover:bg-[#025a8e]"
            >
              Thử lại
            </button>
          )}
        </Panel>
      ) : (
      <Panel className="space-y-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="space-y-4 border-b border-slate-100 pb-4">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(240px,1.6fr)_minmax(180px,1fr)]">
            <div className="relative min-w-0">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                aria-label="Tìm doanh nghiệp"
                value={search}
                onChange={(event) => updateFilter(setSearch, event.target.value)}
                placeholder="Tìm tên, mã, lĩnh vực, liên hệ..."
                className="min-h-11 w-full rounded-full border border-slate-300 bg-white pl-9 pr-3 text-base font-medium text-slate-800 outline-none transition-colors placeholder:font-normal placeholder:text-slate-500 hover:border-slate-400 focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20 sm:text-xs"
              />
            </div>
            <select
              aria-label="Lọc theo lĩnh vực"
              value={fieldFilter}
              onChange={(event) => updateFilter(setFieldFilter, event.target.value)}
              className="min-h-11 w-full rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 outline-none hover:border-slate-400 focus:border-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            >
              <option value="all">Tất cả lĩnh vực</option>
              {fields.map((field) => <option key={field} value={field}>{field}</option>)}
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-200 md:hidden">
          {paginatedEnterprises.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Building2 className="h-8 w-8 text-slate-300" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-700">
                {enterprises.length === 0
                  ? "Chưa có doanh nghiệp được phân công trong học kỳ này."
                  : "Không tìm thấy doanh nghiệp phù hợp."}
              </p>
              <p className="max-w-sm text-xs leading-5 text-slate-500">
                {enterprises.length === 0
                  ? "Kiểm tra lại học kỳ đang chọn hoặc làm mới dữ liệu."
                  : "Thử thay đổi từ khóa tìm kiếm hoặc lĩnh vực."}
              </p>
            </div>
          ) : (
            paginatedEnterprises.map((company) => (
              <article key={company.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-start gap-3">
                  <CompanyAvatar name={company.name} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-bold text-slate-900">
                          {company.name}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Mã: {company.shortCode || "—"} · {company.field || "Chưa cập nhật lĩnh vực"}
                        </p>
                      </div>
                    </div>
                    <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 border-t border-slate-100 pt-3 text-xs">
                      <dt className="text-slate-500">Người liên hệ</dt>
                      <dd className="break-words text-right font-medium text-slate-800">
                        {company.contactPerson || "Chưa cập nhật"}
                      </dd>
                      <dt className="text-slate-500">Điện thoại</dt>
                      <dd className="break-all text-right font-medium text-slate-800">
                        {company.contactPhone || "—"}
                      </dd>
                      <dt className="text-slate-500">Địa chỉ</dt>
                      <dd className="break-words text-right font-medium text-slate-800">
                        {company.location || "Chưa cập nhật"}
                      </dd>
                      <dt className="text-slate-500">Sinh viên</dt>
                      <dd className="text-right font-semibold tabular-nums text-slate-800">
                        {company.studentCount} sinh viên
                      </dd>
                    </dl>
                    <button
                      type="button"
                      onClick={() => openCompany(company.id)}
                      className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#026aa7]/25 bg-white px-3 text-xs font-semibold text-[#026aa7] transition-colors hover:bg-[#026aa7]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      Xem doanh nghiệp
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto rounded-xl border border-slate-200/90 md:block">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th scope="col" className="w-12 px-3 py-2.5 text-center">STT</th>
                <th scope="col" className="px-3 py-2.5">Doanh nghiệp</th>
                <th scope="col" className="px-3 py-2.5">Lĩnh vực</th>
                <th scope="col" className="px-3 py-2.5">Người liên hệ</th>
                <th scope="col" className="px-3 py-2.5">Địa chỉ</th>
                <th scope="col" className="px-3 py-2.5 text-center">Sinh viên</th>
                <th scope="col" className="px-3 py-2.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {paginatedEnterprises.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="h-8 w-8 text-slate-300" aria-hidden="true" />
                      <p className="text-sm font-semibold text-slate-700">
                        {enterprises.length === 0
                          ? "Chưa có doanh nghiệp được phân công trong học kỳ này."
                          : "Không tìm thấy doanh nghiệp phù hợp."}
                      </p>
                      <p className="text-xs text-slate-500">
                        {enterprises.length === 0
                          ? "Kiểm tra lại học kỳ đang chọn hoặc làm mới dữ liệu."
                          : "Thử thay đổi từ khóa tìm kiếm hoặc lĩnh vực."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEnterprises.map((company, index) => (
                  <tr key={company.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-3 py-3 text-center font-mono font-bold text-slate-400">
                      {(visiblePage - 1) * pageSize + index + 1}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <CompanyAvatar name={company.name} size={40} />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-900" title={company.name}>
                            {company.name}
                          </p>
                          <p className="text-[10px] text-slate-500">Mã: {company.shortCode || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[11px] font-semibold">
                      {company.field || "Chưa cập nhật"}
                    </td>
                    <td className="px-3 py-3">
                      <span className="block font-semibold text-slate-900">
                        {company.contactPerson || "Chưa cập nhật"}
                      </span>
                      {company.contactPhone && company.contactPhone !== "—" ? (
                        <a
                          href={`tel:${company.contactPhone}`}
                          onClick={(event) => event.stopPropagation()}
                          className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-[#026aa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                        >
                          <Phone className="h-3 w-3" aria-hidden="true" />
                          {company.contactPhone}
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-500">—</span>
                      )}
                    </td>
                    <td className="max-w-[220px] px-3 py-3 text-[11px]">
                      <span className="flex items-center gap-1.5" title={company.location || "Chưa cập nhật"}>
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                        <span className="truncate">{company.location || "Chưa cập nhật"}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex rounded-full border border-[#026aa7]/20 bg-[#026aa7]/5 px-2.5 py-1 font-mono text-xs font-bold tabular-nums text-[#025a8e]">
                        {company.studentCount}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => openCompany(company.id)}
                        aria-label={`Xem doanh nghiệp ${company.name}`}
                        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-[#026aa7] transition-colors hover:bg-[#026aa7]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2"
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-3 font-medium text-slate-500 sm:justify-start">
            <span>
              Hiển thị {paginatedEnterprises.length} / {filteredEnterprises.length} doanh nghiệp
            </span>
            <label className="flex items-center gap-1.5">
              <span>Số dòng:</span>
              <select
                aria-label="Số dòng mỗi trang"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setCurrentPage(1);
                }}
                className="min-h-10 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-800 outline-none focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
              >
                <option value={5}>5 dòng</option>
                <option value={10}>10 dòng</option>
                <option value={20}>20 dòng</option>
              </select>
            </label>
          </div>
          <nav aria-label="Phân trang doanh nghiệp" className="flex items-center gap-1.5 font-bold">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              disabled={visiblePage === 1}
              aria-label="Trang trước"
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span aria-live="polite" className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-800 tabular-nums">
              {visiblePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              disabled={visiblePage === totalPages}
              aria-label="Trang sau"
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </Panel>
      )}
    </div>
  );
};
