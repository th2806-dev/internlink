import { useMemo } from "react";
import { ChevronDown, RefreshCw, UserCheck } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { useSemester } from "../../../contexts/SemesterContext";
import type { LecturerProfileData } from "../../../types/appState";

export function LecturerPageBanner({
  profile,
  onRefresh,
  isRefreshing = false,
}: {
  profile?: LecturerProfileData | null;
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
}) {
  const { user } = useAuth();
  const { semesters, selectedSemester, selectSemester } = useSemester();

  const academicYears = useMemo(
    () => [...new Set(semesters.map((semester) => semester.academicYear).filter(Boolean))].sort(),
    [semesters],
  );
  const terms = useMemo(
    () => [...new Set(semesters.map((semester) => semester.term).filter(Boolean))].sort(),
    [semesters],
  );
  const currentAcademicYear = selectedSemester?.id ? selectedSemester.academicYear : "";
  const currentTerm = selectedSemester?.id ? selectedSemester.term : "";
  const department = profile?.department || "";

  const handleYearChange = (year: string) => {
    const match =
      semesters.find(
        (semester) =>
          semester.academicYear === year && semester.term === currentTerm,
      ) || semesters.find((semester) => semester.academicYear === year);
    if (match) selectSemester(match.id);
  };

  const handleTermChange = (term: string) => {
    const match =
      semesters.find(
        (semester) =>
          semester.academicYear === currentAcademicYear && semester.term === term,
      ) || semesters.find((semester) => semester.term === term);
    if (match) selectSemester(match.id);
  };

  const profileDetails: [string, string][] = [
    ["Mã GV", profile?.staffCode || "—"],
    ["Họ và tên", profile?.fullName || user?.name || "—"],
    ["Bộ môn / Khoa", department || "—"],
    ["Email", profile?.email || user?.email || "—"],
    ["SĐT", profile?.phone || "—"],
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#026aa7] px-4 py-2.5 text-white">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-white/90" aria-hidden="true" />
          <h1 className="text-xs font-bold tracking-wider sm:text-sm">
            CỔNG THÔNG TIN GIẢNG VIÊN HƯỚNG DẪN
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/20 bg-white/15 px-2 py-0.5 text-[10.5px] font-medium">
            {selectedSemester?.id ? selectedSemester.name : "Chưa có học kỳ"}
          </span>
          {onRefresh && (
            <button
              type="button"
              disabled={isRefreshing}
              onClick={() => void onRefresh()}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-md bg-white/15 px-2.5 text-[11px] font-medium transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Làm mới
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 p-3.5 sm:p-4">
        <dl className="grid grid-cols-1 gap-x-5 gap-y-2 text-xs text-slate-700 sm:grid-cols-2 lg:grid-cols-5">
          {profileDetails.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-slate-500">{label} :</dt>
              <dd className="truncate font-semibold text-slate-800" title={value}>
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3">
          <label className="relative block text-[10px] font-medium text-slate-500">
            <span className="absolute -top-2 left-3.5 z-10 bg-white px-1">
              Đơn vị quản lý
            </span>
            <span className="relative block">
              <select
                aria-label="Đơn vị quản lý"
                value={department}
                disabled
                className="h-9 w-full appearance-none rounded-full border border-slate-300 bg-white px-3.5 pr-8 text-xs font-medium text-slate-800 shadow-2xs disabled:cursor-default disabled:text-slate-500"
              >
                <option value={department}>{department || "Chưa cập nhật"}</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
            </span>
          </label>
          <label className="relative block text-[10px] font-medium text-slate-500">
            <span className="absolute -top-2 left-3.5 z-10 bg-white px-1">Năm học</span>
            <span className="relative block">
              <select
                aria-label="Năm học"
                value={currentAcademicYear}
                onChange={(event) => handleYearChange(event.target.value)}
                disabled={academicYears.length === 0}
                className="h-9 w-full appearance-none rounded-full border border-slate-300 bg-white px-3.5 pr-8 text-xs font-medium text-slate-800 shadow-2xs hover:border-slate-400 focus:border-[#026aa7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/20 disabled:cursor-default disabled:text-slate-500"
              >
                <option value="">{academicYears.length === 0 ? "Chưa cập nhật" : "Chọn năm học"}</option>
                {academicYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
            </span>
          </label>
          <label className="relative block text-[10px] font-medium text-slate-500">
            <span className="absolute -top-2 left-3.5 z-10 bg-white px-1">Học kỳ</span>
            <span className="relative block">
              <select
                aria-label="Học kỳ"
                value={currentTerm}
                onChange={(event) => handleTermChange(event.target.value)}
                disabled={terms.length === 0}
                className="h-9 w-full appearance-none rounded-full border border-slate-300 bg-white px-3.5 pr-8 text-xs font-medium text-slate-800 shadow-2xs hover:border-slate-400 focus:border-[#026aa7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/20 disabled:cursor-default disabled:text-slate-500"
              >
                <option value="">{terms.length === 0 ? "Chưa cập nhật" : "Chọn học kỳ"}</option>
                {terms.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}
