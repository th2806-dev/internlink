import { Building2, Calendar } from "lucide-react";
import { useSemester } from "../../../contexts/SemesterContext";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";

const DATA_SCOPE_TABS = new Set([
  "dashboard",
  "semesters",
  "students",
  "lecturers",
  "companies",
  "assignments",
  "templates",
  "attendance",
  "report-archive",
  "notifications",
  "summary",
]);

export function ContextScopeBar({ activeTab }: { activeTab: string }) {
  const {
    semesters,
    selectedSemesterId,
    selectSemester,
    departments,
    selectedDepartmentId,
    selectDepartment,
  } = useSemester();
  const { isSuperAdmin } = useAdminCapabilities();
  const normalizedTab = activeTab.startsWith("admin-")
    ? activeTab.slice("admin-".length)
    : activeTab;

  if (!DATA_SCOPE_TABS.has(normalizedTab)) return null;

  return (
    <section
      aria-label="Phạm vi dữ liệu"
      className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-3 px-4 pt-3 md:px-6"
    >
      <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 shadow-sm sm:flex-none">
        <Calendar aria-hidden="true" className="h-4 w-4 shrink-0 text-[#026aa7]" />
        <span className="shrink-0 font-semibold">Học kỳ</span>
        <select
          aria-label="Lọc theo học kỳ"
          value={selectedSemesterId || "all"}
          onChange={(event) => selectSemester(event.target.value)}
          className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent py-2 text-xs font-medium text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] sm:min-w-36"
        >
          <option value="all">Tất cả học kỳ</option>
          {semesters.map((semester) => (
            <option key={semester.id} value={semester.id}>
              {semester.name}
            </option>
          ))}
        </select>
      </label>

      {isSuperAdmin && departments.length > 0 && (
        <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 shadow-sm sm:flex-none">
          <Building2 aria-hidden="true" className="h-4 w-4 shrink-0 text-[#026aa7]" />
          <span className="shrink-0 font-semibold">Khoa</span>
          <select
            aria-label="Lọc theo khoa"
            value={selectedDepartmentId || "all"}
            onChange={(event) => selectDepartment(event.target.value)}
            className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent py-2 text-xs font-medium text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] sm:min-w-36"
          >
            <option value="all">Tất cả khoa</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </section>
  );
}
