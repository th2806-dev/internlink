import { Eye, ShieldAlert, X } from "lucide-react";
import { useImpersonation } from "../../../contexts/ImpersonationContext";
import { useToast } from "../../../hooks/useToast";

export function SuperAdminImpersonationBanner() {
  const { impersonation, tenantSupportSession, stopImpersonation, stopTenantSupport } = useImpersonation();
  const { showToast } = useToast();
  if (!impersonation && !tenantSupportSession) return null;

  if (tenantSupportSession) {
    return (
      <aside
        role="alert"
        aria-label="Phiên hỗ trợ kỹ thuật đang hoạt động"
        className="sticky top-0 z-50 flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-rose-900 bg-rose-700 px-4 py-2 text-white shadow-sm"
      >
        <div className="flex min-w-0 items-center gap-2 text-xs font-bold">
          <ShieldAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="min-w-0">
            ĐANG TRONG PHIÊN HỖ TRỢ KỸ THUẬT: {tenantSupportSession.tenantName}
            {" "}({tenantSupportSession.tenantCode}) - Mọi thao tác đều được kiểm toán.
          </span>
          <time className="hidden shrink-0 text-[10px] font-medium sm:inline" dateTime={tenantSupportSession.expiresAt}>
            Hết hạn {new Date(tenantSupportSession.expiresAt).toLocaleTimeString("vi-VN")}
          </time>
        </div>
        <button
          type="button"
          onClick={() => void stopTenantSupport().catch((error: unknown) =>
            showToast(error instanceof Error ? error.message : "Không thể kết thúc phiên hỗ trợ.", "danger"),
          )}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-[4px] border border-white/80 bg-white px-3 text-xs font-bold text-rose-800 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-rose-700"
        >
          <X aria-hidden="true" className="h-4 w-4" />
          Rời khỏi phiên hỗ trợ
        </button>
      </aside>
    );
  }

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
