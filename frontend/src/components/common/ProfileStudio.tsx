import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Check,
  Clock3,
  KeyRound,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { queryKeys } from "../../lib/queryKeys";
import { formatDateTimeVi } from "../../lib/formatDateTimeVi";
import { authService } from "../../services/auth.service";
import { systemService } from "../../services/system.service";
import type { SystemMenuItem } from "../../types/system";
import { InitialsAvatar } from "./InitialsAvatar";

export type ProfileStudioTab = "overview" | "login-history" | "activity";

export interface ProfileTabItem<T extends string = ProfileStudioTab> {
  id: T;
  label: string;
  icon: typeof UserRound;
}

const DEFAULT_TABS: ProfileTabItem[] = [
  { id: "overview", label: "Tổng quan hồ sơ", icon: UserRound },
  { id: "login-history", label: "Nhật ký đăng nhập", icon: Clock3 },
  { id: "activity", label: "Lịch sử thao tác & quyền truy cập", icon: Activity },
];

export interface ProfileStudioHeaderProps<T extends ProfileStudioTab = ProfileStudioTab> {
  name: string;
  identifier?: string | null;
  role: string;
  department?: string | null;
  email?: string | null;
  bannerUrl?: string | null;
  fullBleed?: boolean;
  activeTab: T;
  onTabChange: (tab: T) => void;
  avatarAction?: ReactNode;
  bannerAction?: ReactNode;
  tabs?: readonly ProfileTabItem<T>[];
}

export function ProfileStudioHeader({
  name,
  identifier,
  role,
  department,
  email,
  bannerUrl,
  fullBleed = false,
  activeTab,
  onTabChange,
  avatarAction,
  bannerAction,
  tabs,
}: ProfileStudioHeaderProps) {
  const visibleTabs = tabs ?? DEFAULT_TABS;
  const sectionClassName = fullBleed
    ? "relative -mx-3 -mt-3 pb-5 sm:-mx-5"
    : "relative rounded-md border border-slate-200 bg-white pb-5 shadow-sm";
  const bannerClassName = fullBleed
    ? "relative isolate min-h-[220px] overflow-hidden bg-gradient-to-r from-[#026aa7] via-[#0277b5] to-[#025a8e] text-white"
    : "relative isolate min-h-[220px] overflow-hidden rounded-t-md bg-gradient-to-r from-[#026aa7] via-[#0277b5] to-[#025a8e] text-white";

  return (
    <section className={sectionClassName}>
      <div className={bannerClassName}>
        {bannerUrl && (
          <img
            key={bannerUrl}
            src={bannerUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/65 via-slate-900/40 to-slate-900/20" />
        <div className="relative z-10 flex min-h-[220px] flex-col justify-between px-4 pb-9 pt-12 sm:px-5">
          {bannerAction && <div className="absolute right-4 top-3">{bannerAction}</div>}
          <div className="flex min-w-0 items-center gap-4 pb-5">
            <div className="relative shrink-0">
              <InitialsAvatar
                name={name}
                seed={identifier || email || name}
                size={76}
                className="border-4 border-white shadow-md"
              />
              {avatarAction}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {name || "Tài khoản"}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-[3px] bg-[#7bc043] px-2 py-1 text-xs font-bold text-slate-950">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {role}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/90">
                {identifier && <span>Mã tài khoản: {identifier}</span>}
                {department && <span>{department}</span>}
                {email && <span>{email}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={`relative z-20 -mt-7 px-3 sm:px-5 ${fullBleed ? "sm:px-8" : ""}`}>
        <div
          role="tablist"
          aria-label="Điều hướng hồ sơ"
          className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-t-md border border-b-0 border-slate-200 bg-white px-2 shadow-lg"
        >
            {visibleTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                id={`profile-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                aria-controls={`profile-panel-${id}`}
                onClick={() => onTabChange(id)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#026aa7] ${
                  activeTab === id
                    ? "border-[#026aa7] bg-[#026aa7]/5 text-[#025a8e]"
                    : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            ))}
        </div>
      </div>
      </section>
  );
}

export function ProfileCompletionCard({
  title,
  items,
  percent,
}: {
  title: string;
  items: { label: string; complete: boolean }[];
  percent?: number;
}) {
  const completion =
    percent === undefined
      ? items.length
        ? Math.round((items.filter((item) => item.complete).length / items.length) * 100)
        : 0
      : Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <section className="rounded-md border border-slate-200 bg-white p-3 shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-xs text-slate-600">
            {items.filter((item) => item.complete).length}/{items.length} mốc hoàn thành
          </p>
        </div>
        <span className="rounded-[3px] bg-[#7bc043]/15 px-2 py-0.5 text-xs font-bold text-[#385d1b]">
          {completion}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={completion}
        className="mt-3 h-1.5 overflow-hidden rounded-[2px] bg-slate-100"
      >
        <div
          className="h-full rounded-[2px] bg-[#7bc043] transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${completion}%` }}
        />
      </div>
      <ul className="mt-3 grid gap-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-xs text-slate-700">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] ${
                item.complete ? "bg-[#7bc043]/20 text-[#385d1b]" : "bg-slate-100 text-slate-400"
              }`}
              aria-hidden="true"
            >
              {item.complete ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-[2px] bg-current" />}
            </span>
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

function QueryNotice({
  loading,
  error,
  empty,
  emptyMessage = "Chưa có dữ liệu được ghi nhận.",
  onRetry,
}: {
  loading: boolean;
  error: boolean;
  empty: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
}) {
  if (loading) {
    return <p className="p-5 text-sm text-slate-600">Đang tải dữ liệu...</p>;
  }
  if (error) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs text-rose-700">
        <span>Không thể tải dữ liệu. Vui lòng thử lại.</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-[4px] border border-rose-200 px-2.5 py-1 font-semibold hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            Thử lại
          </button>
        )}
      </div>
    );
  }
  if (empty) {
    return <p className="p-3 text-xs text-slate-600">{emptyMessage}</p>;
  }
  return null;
}

function MenuItems({ items, depth = 0 }: { items: SystemMenuItem[]; depth?: number }) {
  return (
    <ul className={depth ? "ml-4 mt-2 space-y-2 border-l border-slate-200 pl-4" : "space-y-3"}>
      {items.map((item) => (
        <li key={item.code}>
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#026aa7]" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-slate-800">{item.name}</p>
              <p className="text-xs text-slate-500">{item.code}</p>
              {item.children.length > 0 && <MenuItems items={item.children} depth={depth + 1} />}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProfileAuditPanel({
  tab,
  userId,
}: {
  tab: Exclude<ProfileStudioTab, "overview">;
  userId?: string;
}) {
  const sessionsQuery = useQuery({
    queryKey: queryKeys.auth.sessions(userId),
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: () => authService.getSessions(),
  });
  const activityQuery = useQuery({
    queryKey: queryKeys.auth.activity(userId, 30),
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: () => authService.getActivity(30),
  });
  const menuQuery = useQuery({
    queryKey: ["system", "my-menu", userId],
    enabled: Boolean(userId) && tab === "activity",
    staleTime: 5 * 60_000,
    queryFn: () => systemService.getMyMenu(),
  });

  if (tab === "login-history") {
    const logs = activityQuery.data ?? [];
    const sessions = sessionsQuery.data ?? [];

    return (
      <section
        id="profile-panel-login-history"
        role="tabpanel"
        aria-labelledby="profile-tab-login-history"
        className="space-y-4 rounded-md border border-slate-200 bg-white p-3 shadow-md"
      >
        <div>
          <h2 className="text-sm font-bold text-slate-900">Nhật ký đăng nhập &amp; Thiết bị</h2>
          <p className="mt-1 text-[11px] text-slate-600">
            Nhật ký ghi nhận kết quả đăng nhập và IP. Thiết bị/trình duyệt được lưu từ các lần đăng nhập mới; phiên cũ có thể chưa có thông tin này.
          </p>
        </div>
        <div className="grid items-start gap-3 md:grid-cols-2">
          <section aria-labelledby="profile-active-sessions-heading" className="min-w-0 rounded-md border border-slate-200 bg-slate-50/60 p-2.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 id="profile-active-sessions-heading" className="text-xs font-semibold text-slate-800">
                Phiên đang hoạt động
              </h3>
              {sessionsQuery.data && (
                <span className="rounded-[3px] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                  {sessions.length}
                </span>
              )}
            </div>
            <QueryNotice
              loading={sessionsQuery.isPending}
              error={Boolean(sessionsQuery.error)}
              empty={!sessionsQuery.data?.length}
              emptyMessage="Không có phiên đăng nhập đang hoạt động."
              onRetry={() => void sessionsQuery.refetch()}
            />
            {!sessionsQuery.isPending && !sessionsQuery.error && sessions.length > 0 && (
              <ul className="space-y-2">
                {sessions.map((session) => (
                  <li key={session.id} className="rounded-md border border-slate-200 bg-white p-2.5">
                    <p className="text-xs font-semibold text-slate-900">
                      {session.device} · {session.browser}
                      {session.isCurrent && (
                        <span className="ml-2 rounded-[3px] bg-[#7bc043]/20 px-1.5 py-0.5 text-[10px] text-[#385d1b]">
                          Phiên hiện tại
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Đăng nhập {formatDateTimeVi(session.createdAt)} · IP {session.ip || "Không xác định"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Hoạt động gần nhất {formatDateTimeVi(session.lastActive)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="profile-login-history-heading" className="min-w-0 rounded-md border border-slate-200 bg-slate-50/60 p-2.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 id="profile-login-history-heading" className="text-xs font-semibold text-slate-800">
                Lịch sử đăng nhập gần đây
              </h3>
              {activityQuery.data && (
                <span className="rounded-[3px] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                  {logs.length}
                </span>
              )}
            </div>
            <QueryNotice
              loading={activityQuery.isPending}
              error={Boolean(activityQuery.error)}
              empty={!activityQuery.data?.length}
              emptyMessage="Chưa ghi nhận lịch sử đăng nhập."
              onRetry={() => void activityQuery.refetch()}
            />
            {!activityQuery.isPending && !activityQuery.error && logs.length > 0 && (
              <ul className="space-y-2">
                {logs.map((log) => (
                  <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-2.5">
                    <span className="text-xs font-medium text-slate-800">
                      {log.module}: {log.action}
                    </span>
                    <span className="text-xs text-slate-600">
                      {formatDateTimeVi(log.time)} · IP {log.ip || "Không xác định"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>
    );
  }

  const menu = menuQuery.data ?? [];
  const activity = activityQuery.data ?? [];
  const pending = menuQuery.isPending || activityQuery.isPending;
  const failed = Boolean(menuQuery.error || activityQuery.error);

  return (
    <section
      id="profile-panel-activity"
      role="tabpanel"
      aria-labelledby="profile-tab-activity"
      className="space-y-4 rounded-md border border-slate-200 bg-white p-3 shadow-md"
    >
      <div>
        <h2 className="text-sm font-bold text-slate-900">Chức năng được cấp quyền</h2>
        <p className="mt-1 text-xs text-slate-600">
          Danh sách chức năng được cung cấp cho tài khoản theo vai trò hiện tại.
        </p>
      </div>
      {pending ? (
        <QueryNotice loading error={false} empty={false} />
      ) : failed ? (
        <QueryNotice loading={false} error empty={false} />
      ) : menu.length === 0 ? (
        <QueryNotice loading={false} error={false} empty />
      ) : (
        <MenuItems items={menu} />
      )}
      <div className="border-t border-slate-200 pt-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <KeyRound className="h-4 w-4 text-[#026aa7]" aria-hidden="true" />
          Hoạt động tài khoản
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Nhật ký hiện có ghi nhận sự kiện đăng nhập/đăng xuất; hệ thống chưa cung cấp audit thao tác nghiệp vụ cho trang hồ sơ.
        </p>
        {activityQuery.isPending ? (
          <QueryNotice loading error={false} empty={false} />
        ) : activityQuery.error ? (
          <QueryNotice loading={false} error empty={false} />
        ) : activity.length === 0 ? (
          <QueryNotice loading={false} error={false} empty />
        ) : (
          <ul className="mt-3 space-y-2">
            {activity.slice(0, 5).map((log) => (
              <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3">
                <span className="text-sm text-slate-800">{log.module}: {log.action}</span>
                <span className="text-xs text-slate-600">{formatDateTimeVi(log.time)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function ProfileDetailsCard({
  email,
  phone,
  department,
  createdAt,
  userId,
}: {
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  createdAt?: string | null;
  userId?: string;
}) {
  const meQuery = useQuery({
    queryKey: ["auth", "current-user", userId],
    enabled: Boolean(userId && !createdAt),
    staleTime: 5 * 60_000,
    queryFn: () => authService.getMe(),
  });
  const fields = [
    ["Email", email],
    ["Số điện thoại", phone],
    ["Đơn vị / Khoa", department],
    [
      "Ngày tạo tài khoản",
      (createdAt || meQuery.data?.createdAt)
        ? formatDateTimeVi(createdAt || meQuery.data?.createdAt || "")
        : null,
    ],
  ];
  const accountStatus = meQuery.error
    ? "Không thể tải trạng thái"
    : userId && meQuery.isPending
      ? "Đang tải..."
      : meQuery.data
        ? meQuery.data.isActive
          ? "Hoạt động"
          : "Đã khóa"
        : "Chưa có dữ liệu";
  const accountStatusClass = meQuery.data?.isActive === true
    ? "text-[#385d1b]"
    : meQuery.data?.isActive === false
      ? "text-rose-700"
      : "text-slate-600";
  const accountStatusDotClass = meQuery.data?.isActive === true
    ? "bg-[#7bc043]"
    : meQuery.data?.isActive === false
      ? "bg-rose-600"
      : "bg-slate-400";

  return (
    <section className="rounded-md border border-slate-200 bg-white p-3">
      <h2 className="flex items-center gap-2 font-bold text-slate-900">
        <UserRound className="h-4 w-4 text-[#026aa7]" aria-hidden="true" />
        Thông tin chi tiết
      </h2>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-md bg-slate-50 p-2.5">
            <dt className="text-xs font-semibold text-slate-500">{label}</dt>
            <dd className="mt-1 break-words text-xs font-medium text-slate-800">
              {value || "Chưa có dữ liệu"}
            </dd>
          </div>
        ))}
        <div className="rounded-md bg-slate-50 p-2.5">
          <dt className="text-xs font-semibold text-slate-500">Trạng thái</dt>
          <dd className={`mt-1 inline-flex items-center gap-1.5 text-xs font-semibold ${accountStatusClass}`}>
            <span className={`h-2 w-2 rounded-[2px] ${accountStatusDotClass}`} aria-hidden="true" />
            {accountStatus}
          </dd>
        </div>
      </dl>
    </section>
  );
}
