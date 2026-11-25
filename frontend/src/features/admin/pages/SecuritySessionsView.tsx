import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Laptop, RefreshCw, ShieldCheck, ShieldX } from "lucide-react";
import { CompactActionBar } from "../../../components/common/CompactActionBar";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import type { ToastType } from "../../../contexts/ToastContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { PLATFORM_PAGE_CONTENT_CLASS, PlatformPageHeader } from "../components/PlatformPageHeader";
import {
  platformOperationsService,
  type AdministrativeSession,
} from "../../../services/platformOperations.service";

type Props = { onShowToast: (message: string, type?: ToastType) => void };

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Không rõ thiết bị";
  const platform = /Android|iPhone|iPad|Mobile/i.test(userAgent)
    ? "Thiết bị di động"
    : /Windows/i.test(userAgent)
      ? "Windows"
      : /Mac OS|Macintosh/i.test(userAgent)
        ? "macOS"
        : /Linux/i.test(userAgent)
          ? "Linux"
          : "Thiết bị khác";
  const browser = /Edg\//i.test(userAgent)
    ? "Edge"
    : /Firefox\//i.test(userAgent)
      ? "Firefox"
      : /Chrome\//i.test(userAgent)
        ? "Chrome"
        : /Safari\//i.test(userAgent)
          ? "Safari"
          : "Trình duyệt";
  return `${platform} · ${browser}`;
}

function SessionRow({
  session,
  onRevoke,
  busy,
}: {
  session: AdministrativeSession;
  onRevoke: () => void;
  busy: boolean;
}) {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
      <td className="px-2.5 py-2 align-top">
        <p className="text-xs font-semibold text-slate-800">{session.userName}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{session.email}</p>
      </td>
      <td className="whitespace-nowrap px-2.5 py-2 align-top text-[11px] text-slate-600">{session.role === "SuperAdmin" ? "Quản trị nền tảng" : "Quản trị đơn vị"}</td>
      <td className="max-w-48 px-2.5 py-2 align-top text-[11px] text-slate-600">{session.tenantName}</td>
      <td className="whitespace-nowrap px-2.5 py-2 align-top font-mono text-[11px] text-slate-600">{session.ipAddress ?? "—"}</td>
      <td className="px-2.5 py-2 align-top text-[11px] text-slate-600" title={session.userAgent ?? undefined}>
        <span className="inline-flex items-center gap-1.5"><Laptop aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" />{deviceLabel(session.userAgent)}</span>
      </td>
      <td className="whitespace-nowrap px-2.5 py-2 align-top text-[11px] text-slate-600">{formatDate(session.createdAt)}</td>
      <td className="whitespace-nowrap px-2.5 py-2 align-top text-[11px] text-slate-600">{formatDate(session.expiresAt)}</td>
      <td className="whitespace-nowrap px-2.5 py-2 text-right align-top">
        <button type="button" onClick={onRevoke} disabled={busy} aria-label={`Cưỡng chế đăng xuất ${session.userName}`} className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-rose-300 px-2 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-wait disabled:opacity-50">
          <ShieldX aria-hidden="true" className="h-3.5 w-3.5" />
          {busy ? "Đang thu hồi..." : "Cưỡng chế đăng xuất"}
        </button>
      </td>
    </tr>
  );
}

export function SecuritySessionsView({ onShowToast }: Props) {
  const queryClient = useQueryClient();
  const [revokeTarget, setRevokeTarget] = useState<AdministrativeSession | null>(null);
  const sessionsQuery = useQuery({
    queryKey: ["system-security", "active-sessions"],
    queryFn: ({ signal }) => platformOperationsService.getActiveSessions(signal),
    refetchInterval: 30_000,
  });
  const revokeMutation = useMutation({
    mutationFn: platformOperationsService.revokeSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["system-security", "active-sessions"] });
      setRevokeTarget(null);
      onShowToast("Đã thu hồi phiên đăng nhập. Access token của phiên này bị từ chối ngay ở các request tiếp theo.", "success");
    },
    onError: (reason) => onShowToast(getApiErrorMessage(reason), "danger"),
  });
  const sessions = sessionsQuery.data ?? [];

  return (
    <div className="min-h-full bg-slate-50">
      <PlatformPageHeader
        title="Lá chắn Phiên làm việc"
        description="Giám sát phiên quản trị đang hoạt động và thu hồi access token khi phát hiện rủi ro."
        breadcrumbs={[
          { label: "Quản trị nền tảng", href: "/admin/dashboard" },
          { label: "Hạ tầng & an ninh" },
          { label: "Phiên quản trị" },
        ]}
        statistic={sessionsQuery.data ? `${sessions.length} phiên hoạt động` : undefined}
      />
      <CompactActionBar
        icon={ShieldCheck}
        title="Phiên quản trị"
        subtitle="Phiên SuperAdmin và quản trị viên đơn vị"
        hideTitle
        total={`${sessions.length} phiên`}
        actions={[{
          label: "Làm mới",
          icon: RefreshCw,
          onClick: () => void sessionsQuery.refetch(),
          loading: sessionsQuery.isFetching,
        }]}
      />
      <main className={PLATFORM_PAGE_CONTENT_CLASS}>
        {sessionsQuery.error && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <span>{getApiErrorMessage(sessionsQuery.error)}</span>
            <button type="button" onClick={() => void sessionsQuery.refetch()} className="rounded-[4px] border border-rose-300 bg-white px-2.5 py-1 font-semibold hover:bg-rose-100">Thử lại</button>
          </div>
        )}
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Phiên đăng nhập đang hoạt động</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">Danh sách chỉ hiển thị phiên SuperAdmin và quản trị viên đơn vị.</p>
            </div>
            <span className="rounded-[3px] border border-[#026aa7]/20 bg-[#026aa7]/5 px-1.5 py-0.5 text-[10px] font-semibold text-[#026aa7]">{sessions.length} phiên</span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1160px] border-collapse text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  {["Người dùng", "Vai trò", "Đơn vị", "Địa chỉ IP", "Thiết bị", "Đăng nhập lúc", "Hết hạn lúc", "Thao tác"].map((heading) => <th key={heading} className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {sessionsQuery.isLoading ? (
                  <tr><td colSpan={8} className="px-3 py-10 text-center text-xs text-slate-500"><RefreshCw aria-hidden="true" className="mr-1 inline h-4 w-4 animate-spin" />Đang tải phiên...</td></tr>
                ) : !sessions.length ? (
                  <tr><td colSpan={8} className="px-3 py-10 text-center text-xs text-slate-500">Không có phiên quản trị đang hoạt động.</td></tr>
                ) : sessions.map((session) => (
                  <SessionRow
                    key={session.tokenId}
                    session={session}
                    busy={revokeMutation.isPending && revokeMutation.variables === session.tokenId}
                    onRevoke={() => setRevokeTarget(session)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <ConfirmDialog
        open={revokeTarget !== null}
        title="Cưỡng chế đăng xuất phiên này?"
        description={revokeTarget
          ? <>Phiên của <strong>{revokeTarget.userName}</strong> tại <strong>{revokeTarget.tenantName}</strong> sẽ bị thu hồi. Các request tiếp theo từ access token này sẽ bị từ chối.</>
          : ""}
        confirmLabel="Thu hồi phiên"
        variant="danger"
        loading={revokeTarget !== null && revokeMutation.isPending && revokeMutation.variables === revokeTarget.tokenId}
        onConfirm={() => {
          if (revokeTarget) revokeMutation.mutate(revokeTarget.tokenId);
        }}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
