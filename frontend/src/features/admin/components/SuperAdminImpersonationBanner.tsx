import { Eye, X } from "lucide-react";
import { useImpersonation } from "../../../contexts/ImpersonationContext";

export function SuperAdminImpersonationBanner() {
  const { impersonation, stopImpersonation } = useImpersonation();
  if (!impersonation) return null;

  return (
    <aside
      role="status"
      aria-label="Chế độ xem trước vai trò"
      className="sticky top-0 z-50 flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-amber-600 bg-amber-400 px-4 py-2 text-slate-950 shadow-sm"
    >
      <div className="flex min-w-0 items-center gap-2 text-xs font-semibold">
        <Eye aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span className="min-w-0">
          CHẾ ĐỘ MÔ PHỎNG: Đang xem giao diện với tư cách {impersonation.roleName}.
          {" "}Dữ liệu hiển thị không cấp thêm quyền truy cập.
        </span>
      </div>
      <button
        type="button"
        onClick={stopImpersonation}
        className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-900 bg-white px-3 text-xs font-bold text-slate-900 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
      >
        <X aria-hidden="true" className="h-4 w-4" />
        Thoát chế độ mô phỏng
      </button>
    </aside>
  );
}
