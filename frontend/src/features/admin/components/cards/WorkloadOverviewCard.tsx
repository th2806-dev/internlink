import { BarChart3, AlertCircle, UserPlus } from "lucide-react";
import type { AdminDashboardStats } from "../../../../hooks/useAdminDashboardStats";

export const WorkloadOverviewCard = ({
  stats,
  isLoading,
  onAssignClick,
}: {
  stats?: AdminDashboardStats | null;
  isLoading?: boolean;
  onAssignClick?: () => void;
}) => {
  const totalStudents = stats?.studentCount ?? 0;
  const assignedStudents = stats?.assignedStudents ?? 0;
  const unassignedStudents = stats?.unassignedStudents ?? 0;
  const avgRatio = stats?.avgStudentsPerLecturer ?? 0;
  const lecturerCount = stats?.lecturerCount ?? 0;
  const workloadBreakdown = stats?.workloadBreakdown ?? [];
  const assignedPct =
    totalStudents > 0
      ? Math.round((assignedStudents / totalStudents) * 1000) / 10
      : 0;
  const availableCapacity = workloadBreakdown
    .filter((b) => b.category.startsWith("Dưới"))
    .reduce((sum, b) => sum + b.count, 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <BarChart3 className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Phân bổ tải công việc
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tỷ lệ sinh viên / giảng viên và công suất tiếp nhận
            </p>
          </div>
        </div>

        {onAssignClick && (
          <button
            type="button"
            onClick={onAssignClick}
            className="il-btn il-btn-primary shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Phân công hướng dẫn</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
            Sinh viên trung bình / giảng viên
          </p>
          <p className="text-xl font-bold text-slate-900">
            {isLoading ? "…" : avgRatio}
          </p>
          <p className="text-[10px] text-slate-500">Theo phân công hiện tại</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
            Đã phân công
          </p>
          <p className="text-xl font-bold text-slate-900">
            {isLoading ? "…" : assignedStudents}
            <span className="text-sm font-medium text-slate-500">
              {" "}
              / {totalStudents}
            </span>
          </p>
          <p className="text-[10px] text-slate-500">{assignedPct}% tổng SV</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase text-rose-600 tracking-wider">
            Chưa phân công
          </p>
          <p className="text-xl font-bold text-rose-600">
            {isLoading ? "…" : unassignedStudents}
          </p>
          <p className="text-[10px] text-rose-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Cần ghép GV
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase text-emerald-700 tracking-wider">
            Giảng viên dưới định mức
          </p>
          <p className="text-xl font-bold text-emerald-700">
            {isLoading ? "…" : availableCapacity}
          </p>
          <p className="text-[10px] text-slate-500">
            Dưới 10 sinh viên / giảng viên
          </p>
        </div>
      </div>

      {workloadBreakdown.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
            <span>Phân bố định mức tải ({lecturerCount} giảng viên)</span>
          </div>
          <div className="w-full bg-slate-200 h-2 flex overflow-hidden">
            {workloadBreakdown.map((item, idx) => (
              <div
                key={idx}
                style={{ width: `${item.percent}%` }}
                className={`${item.color} h-full`}
                title={`${item.category}: ${item.count} GV (${item.percent}%)`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            {workloadBreakdown.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 ${item.color} shrink-0`} />
                <span className="text-slate-600">
                  {item.category}: {item.count} ({item.percent}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
