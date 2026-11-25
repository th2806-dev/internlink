import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Building2,
  Clock3,
  Database,
  KeyRound,
  RefreshCw,
  UsersRound,
  Webhook,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { CompactActionBar } from "../../../components/common/CompactActionBar";
import { getApiErrorMessage } from "../../../lib/apiClient";
import {
  licenseTierLabel,
  systemTenantsService,
  tenantStatusLabel,
  type TenantDirectoryItem,
} from "../../../services/systemTenants.service";
import { systemApiGatewayService } from "../../../services/systemApiGateway.service";
import { PLATFORM_PAGE_CONTENT_CLASS, PlatformPageHeader } from "../components/PlatformPageHeader";

const TIER_COLORS = ["#026aa7", "#7bc043", "#64748b"];
const EMPTY_TENANTS: TenantDirectoryItem[] = [];

function formatNumber(value: number): string {
  return value.toLocaleString("vi-VN");
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "blue",
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  detail: string;
  tone?: "blue" | "green" | "amber" | "slate";
}) {
  const toneStyles = {
    blue: "bg-[#026aa7]/10 text-[#026aa7]",
    green: "bg-[#7bc043]/15 text-[#385d1b]",
    amber: "bg-amber-100 text-amber-800",
    slate: "bg-slate-100 text-slate-600",
  } as const;

  return (
    <article className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-bold tabular-nums text-slate-900">{value}</p>
        </div>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${toneStyles[tone]}`}>
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-slate-500">{detail}</p>
    </article>
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <header className="flex min-h-10 items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <h2 className="text-xs font-bold text-slate-800">{title}</h2>
        {action}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

function getExpiringTenants(tenants: TenantDirectoryItem[], now: Date): TenantDirectoryItem[] {
  const end = new Date(now);
  end.setDate(end.getDate() + 30);
  return tenants
    .filter((tenant) => {
      if (tenant.status === 3 || !tenant.licenseValidTo) return false;
      const expiry = new Date(tenant.licenseValidTo);
      return !Number.isNaN(expiry.getTime()) && expiry >= now && expiry <= end;
    })
    .sort((left, right) =>
      new Date(left.licenseValidTo!).getTime() - new Date(right.licenseValidTo!).getTime(),
    );
}

export function PlatformExecutiveDashboardView() {
  const tenantsQuery = useQuery({
    queryKey: ["system-admin", "tenants", "directory"],
    queryFn: ({ signal }) => systemTenantsService.getAllTenants(signal),
    staleTime: 60_000,
  });
  const healthQuery = useQuery({
    queryKey: ["erp3-health"],
    queryFn: ({ signal }) => systemApiGatewayService.getHealth(signal),
    staleTime: 30_000,
  });
  const jobsQuery = useQuery({
    queryKey: ["erp3-jobs"],
    queryFn: ({ signal }) => systemApiGatewayService.getJobs(signal),
    staleTime: 30_000,
  });

  const tenants = tenantsQuery.data ?? EMPTY_TENANTS;
  const totals = useMemo(() => {
    const quotaTenantCount = tenants.filter((tenant) => tenant.maxStudentsQuota != null).length;
    return {
      activeTenants: tenants.filter((tenant) => tenant.status === 1).length,
      trialTenants: tenants.filter((tenant) => tenant.status === 2).length,
      suspendedTenants: tenants.filter((tenant) => tenant.status === 3).length,
      studentQuota: tenants.reduce((sum, tenant) => sum + (tenant.maxStudentsQuota ?? 0), 0),
      activeStudents: tenants.reduce((sum, tenant) => sum + tenant.activeStudentCount, 0),
      quotaTenantCount,
    };
  }, [tenants]);

  const tierData = useMemo(() => ([1, 2, 3].map((tier, index) => ({
    name: licenseTierLabel(tier as 1 | 2 | 3),
    value: tenants.filter((tenant) => tenant.licenseTier === tier).length,
    fill: TIER_COLORS[index],
  })).filter((item) => item.value > 0)), [tenants]);
  const consumptionData = useMemo(() => tenants
    .filter((tenant) => tenant.maxStudentsQuota != null)
    .sort((left, right) => right.activeStudentCount - left.activeStudentCount)
    .slice(0, 8)
    .map((tenant) => ({
      tenant: tenant.tenantCode,
      used: tenant.activeStudentCount,
      quota: tenant.maxStudentsQuota ?? 0,
    })), [tenants]);
  const expiringTenants = useMemo(() => getExpiringTenants(tenants, new Date()), [tenants]);
  const healthyProbeCount = healthQuery.data?.probes.filter((probe) => probe.status === "Healthy").length ?? 0;
  const totalProbeCount = healthQuery.data?.probes.length ?? 0;
  const recentExecutions = [...(jobsQuery.data?.recentExecutions ?? [])]
    .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())
    .slice(0, 5);

  const refresh = () => {
    void Promise.all([tenantsQuery.refetch(), healthQuery.refetch(), jobsQuery.refetch()]);
  };
  const dataError = tenantsQuery.error ?? healthQuery.error ?? jobsQuery.error;

  return (
    <div className="min-h-full bg-slate-50">
      <PlatformPageHeader
        title="Tổng quan điều hành nền tảng"
        description="Trạng thái khách hàng, bản quyền và hạ tầng InternLink."
        breadcrumbs={[
          { label: "Quản trị nền tảng" },
          { label: "Tổng Quan" },
        ]}
        statistic={tenantsQuery.isSuccess ? `${formatNumber(tenants.length)} đơn vị` : undefined}
      />
      <CompactActionBar
        icon={Activity}
        title="Tổng quan điều hành nền tảng"
        subtitle="Theo dõi quy mô đơn vị, bản quyền, quota và sức khỏe hạ tầng."
        hideTitle
        total={tenantsQuery.isSuccess
          ? `${formatNumber(tenants.length)} đơn vị`
          : tenantsQuery.isError
            ? "Không tải được dữ liệu đơn vị"
            : "Đang tải dữ liệu đơn vị"}
        actions={[{
          label: "Làm mới",
          icon: RefreshCw,
          onClick: refresh,
          loading: tenantsQuery.isFetching || healthQuery.isFetching || jobsQuery.isFetching,
        }]}
      />

      <main className={PLATFORM_PAGE_CONTENT_CLASS}>
        {dataError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <span>{getApiErrorMessage(dataError)}</span>
            <button type="button" onClick={refresh} className="h-8 rounded-[4px] border border-rose-200 px-2.5 font-semibold hover:bg-rose-100">
              Thử lại
            </button>
          </div>
        )}

        <section aria-label="KPI điều hành nền tảng" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {tenantsQuery.isLoading ? (
            <div role="status" className="col-span-full rounded-md border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
              <RefreshCw aria-hidden="true" className="mr-1 inline h-4 w-4 animate-spin" /> Đang tải dữ liệu nền tảng…
            </div>
          ) : tenantsQuery.isError ? null : (
            <>
              <MetricCard
                icon={Building2}
                label="Đơn vị triển khai"
                value={formatNumber(tenants.length)}
                detail={`${totals.activeTenants} hoạt động · ${totals.trialTenants} dùng thử · ${totals.suspendedTenants} tạm khóa`}
              />
              <MetricCard
                icon={UsersRound}
                label="Quota sinh viên toàn sàn"
                value={totals.quotaTenantCount > 0 ? `${formatNumber(totals.activeStudents)} / ${formatNumber(totals.studentQuota)}` : "—"}
                detail={totals.quotaTenantCount > 0
                  ? `SV đang hoạt động / hạn mức của ${totals.quotaTenantCount} đơn vị có quota`
                  : "Chưa có dữ liệu quota để tổng hợp"}
                tone="green"
              />
              <MetricCard
                icon={Database}
                label="Sức khỏe hạ tầng"
                value={totalProbeCount > 0 ? `${healthyProbeCount}/${totalProbeCount}` : "—"}
                detail={healthQuery.data
                  ? `${healthQuery.data.probes.map((probe) => `${probe.label}: ${probe.status}`).join(" · ")} · ${new Date(healthQuery.data.checkedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
                  : healthQuery.isError ? "Không tải được health probes" : "Đang kiểm tra SQL, Redis, Storage và SMTP"}
                tone={totalProbeCount > 0 && healthyProbeCount === totalProbeCount ? "green" : "amber"}
              />
              <MetricCard
                icon={KeyRound}
                label="Request API trong 24 giờ"
                value="—"
                detail="Chưa có request telemetry; không suy ra từ thời điểm sử dụng API key."
                tone="slate"
              />
            </>
          )}
        </section>

        <section className="grid gap-3 xl:grid-cols-2">
          <Panel title="Phân bổ bản quyền theo gói">
            {tenantsQuery.isLoading ? (
              <p role="status" className="py-8 text-center text-xs text-slate-500">Đang tải dữ liệu bản quyền…</p>
            ) : tenantsQuery.isError ? (
              <p className="py-8 text-center text-xs text-slate-500">Không thể hiển thị biểu đồ khi chưa tải được dữ liệu đơn vị.</p>
            ) : tierData.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">Chưa có dữ liệu bản quyền để phân bổ.</p>
            ) : (
              <>
                <p className="sr-only" role="img" aria-label={`Phân bổ gói bản quyền: ${tierData.map((item) => `${item.name} ${item.value} đơn vị`).join(", ")}`}>
                  Phân bổ các gói bản quyền theo số đơn vị.
                </p>
                <div className="h-56 w-full" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={tierData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>
                        {tierData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} đơn vị`, "Số lượng"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <caption className="sr-only">Dữ liệu phân bổ bản quyền theo gói</caption>
                    <thead><tr className="border-b border-slate-100 text-slate-500"><th className="py-1.5">Gói</th><th className="py-1.5 text-right">Số đơn vị</th></tr></thead>
                    <tbody>{tierData.map((item) => <tr key={item.name} className="border-b border-slate-50"><th className="py-1.5 font-medium text-slate-700">{item.name}</th><td className="py-1.5 text-right tabular-nums text-slate-700">{formatNumber(item.value)}</td></tr>)}</tbody>
                  </table>
                </div>
              </>
            )}
          </Panel>

          <Panel title="Mức sử dụng quota theo đơn vị">
            {tenantsQuery.isLoading ? (
              <p role="status" className="py-8 text-center text-xs text-slate-500">Đang tải dữ liệu quota…</p>
            ) : tenantsQuery.isError ? (
              <p className="py-8 text-center text-xs text-slate-500">Không thể hiển thị biểu đồ khi chưa tải được dữ liệu đơn vị.</p>
            ) : consumptionData.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">Chưa có đơn vị được cấp quota sinh viên.</p>
            ) : (
              <>
                <p className="sr-only" role="img" aria-label={`Mức sử dụng quota sinh viên: ${consumptionData.map((item) => `${item.tenant} ${item.used} trên ${item.quota}`).join(", ")}`}>
                  So sánh sinh viên đang hoạt động với quota theo đơn vị.
                </p>
                <div className="h-56 w-full" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consumptionData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="tenant" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={48} />
                      <Tooltip formatter={(value, name) => [formatNumber(Number(value)), name === "used" ? "Đang sử dụng (SV)" : "Quota (SV)"]} />
                      <Legend formatter={(value) => value === "used" ? "Đang sử dụng (SV)" : "Quota (SV)"} />
                      <Bar dataKey="used" name="used" fill="#026aa7" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="quota" name="quota" fill="#7bc043" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <caption className="sr-only">Dữ liệu sử dụng quota theo đơn vị</caption>
                    <thead><tr className="border-b border-slate-100 text-slate-500"><th className="py-1.5">Mã đơn vị</th><th className="py-1.5 text-right">Đang dùng (SV)</th><th className="py-1.5 text-right">Quota (SV)</th></tr></thead>
                    <tbody>{consumptionData.map((item) => <tr key={item.tenant} className="border-b border-slate-50"><th className="py-1.5 font-mono font-medium text-[#026aa7]">{item.tenant}</th><td className="py-1.5 text-right tabular-nums">{formatNumber(item.used)}</td><td className="py-1.5 text-right tabular-nums">{formatNumber(item.quota)}</td></tr>)}</tbody>
                  </table>
                </div>
              </>
            )}
          </Panel>
        </section>

        <section className="grid gap-3 xl:grid-cols-2">
          <Panel
            title="Bản quyền sắp hết hạn trong 30 ngày"
            action={<Link to="/admin/licenses" className="text-[10px] font-semibold text-[#026aa7] hover:underline">Mở License Studio</Link>}
          >
            {tenantsQuery.isLoading ? (
              <p role="status" className="py-5 text-center text-xs text-slate-500">Đang kiểm tra kỳ hạn…</p>
            ) : tenantsQuery.isError ? (
              <p className="py-5 text-center text-xs text-slate-500">Không tải được dữ liệu bản quyền.</p>
            ) : expiringTenants.length === 0 ? (
              <p className="py-5 text-center text-xs text-slate-500">Không có kỳ hạn bản quyền đã biết trong 30 ngày tới.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-xs">
                  <thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-500"><th className="py-2">Đơn vị</th><th className="py-2">Gói</th><th className="py-2">Hết hạn</th><th className="py-2">Trạng thái</th></tr></thead>
                  <tbody>{expiringTenants.slice(0, 8).map((tenant) => (
                    <tr key={tenant.id} className="border-b border-slate-50">
                      <td className="py-2"><span className="block font-semibold text-slate-800">{tenant.name}</span><span className="font-mono text-[10px] text-[#026aa7]">{tenant.tenantCode}</span></td>
                      <td className="py-2 text-slate-600">{licenseTierLabel(tenant.licenseTier)}</td>
                      <td className="whitespace-nowrap py-2 tabular-nums text-slate-700">{formatDate(tenant.licenseValidTo)}</td>
                      <td className="py-2 text-slate-600">{tenantStatusLabel(tenant.status)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel
            title="Vận hành gần đây"
            action={<Link to="/admin/observability" className="text-[10px] font-semibold text-[#026aa7] hover:underline">Mở giám sát</Link>}
          >
            {jobsQuery.isLoading ? (
              <p role="status" className="py-5 text-center text-xs text-slate-500">Đang tải lịch sử jobs…</p>
            ) : jobsQuery.isError ? (
              <p className="py-5 text-center text-xs text-slate-500">Không tải được lịch sử jobs.</p>
            ) : recentExecutions.length === 0 ? (
              <p className="py-5 text-center text-xs text-slate-500">Chưa có lần chạy job nào được ghi nhận.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentExecutions.map((execution) => (
                  <li key={execution.id} className="flex items-start justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-slate-800">{execution.jobCode}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                        <Clock3 aria-hidden="true" className="h-3 w-3" />
                        {new Date(execution.startedAt).toLocaleString("vi-VN")}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold ${
                      execution.status === "Succeeded"
                        ? "border-[#7bc043]/40 bg-[#7bc043]/10 text-[#385d1b]"
                        : execution.status === "Failed"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}>
                      {execution.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex items-start gap-2 rounded-[4px] border border-amber-100 bg-amber-50 p-2 text-[10px] leading-4 text-amber-900">
              <Webhook aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Dead-letter queue được tra cứu theo tenant trong API Gateway; dashboard không gộp số liệu khi chưa có endpoint tổng hợp.
            </div>
          </Panel>
        </section>
      </main>
    </div>
  );
}
