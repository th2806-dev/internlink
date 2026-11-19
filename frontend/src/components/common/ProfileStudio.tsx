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

const tabs: { id: ProfileStudioTab; label: string; icon: typeof UserRound }[] = [
  { id: "overview", label: "Tổng quan hồ sơ", icon: UserRound },
  { id: "login-history", label: "Nhật ký đăng nhập", icon: Clock3 },
  { id: "activity", label: "Lịch sử thao tác & quyền truy cập", icon: Activity },
];

export function ProfileStudioHeader({
  name,
  identifier,
  role,
  department,
  email,
  activeTab,
  onTabChange,
  avatarAction,
}: {
  name: string;
  identifier?: string | null;
  role: string;
  department?: string | null;
  email?: string | null;
  activeTab: ProfileStudioTab;
  onTabChange: (tab: ProfileStudioTab) => void;
  avatarAction?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-[#025a8e] to-[#026aa7] px-5 py-6 text-white sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative w-fit shrink-0">
            <InitialsAvatar
              name={name}
              seed={identifier || email || name}
              size={80}
              className="border-4 border-white shadow-md"
            />
            {avatarAction}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                {name || "Tài khoản"}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#7bc043] px-2.5 py-1 text-xs font-bold text-slate-950">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {role}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/90">
              {identifier && <span>Mã tài khoản: {identifier}</span>}
              {department && <span>{department}</span>}
              {email && <span>{email}</span>}
            </div>
          </div>
        </div>
      </div>
      <div
        role="tablist"
        aria-label="Điều hướng hồ sơ"
        className="flex gap-1 overflow-x-auto border-t border-white/10 px-2 pt-2"
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`profile-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={`profile-panel-${id}`}
            onClick={() => onTabChange(id)}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#026aa7] ${
              activeTab === id
                ? "border-[#026aa7] text-[#025a8e]"
                : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
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
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {items.filter((item) => item.complete).length}/{items.length} mốc hoàn thành
          </p>
        </div>
        <span className="rounded-full bg-[#7bc043]/15 px-3 py-1 text-sm font-bold text-[#385d1b]">
          {completion}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={completion}
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-[#7bc043] transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${completion}%` }}
        />
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm text-slate-700">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                item.complete ? "bg-[#7bc043]/20 text-[#385d1b]" : "bg-slate-100 text-slate-400"
              }`}
              aria-hidden="true"
            >
              {item.complete ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
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
}: {
  loading: boolean;
  error: boolean;
  empty: boolean;
}) {
  if (loading) {
    return <p className="p-5 text-sm text-slate-600">Đang tải dữ liệu...</p>;
  }
  if (error) {
    return (
      <p role="alert" className="p-5 text-sm text-rose-700">
        Không thể tải dữ liệu. Vui lòng thử lại sau.
      </p>
    );
  }
  if (empty) {
    return <p className="p-5 text-sm text-slate-600">Chưa có dữ liệu được ghi nhận.</p>;
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
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    queryFn: () => systemService.getMyMenu(),
  });

  if (tab === "login-history") {
    const logs = activityQuery.data ?? [];
    const sessions = sessionsQuery.data ?? [];
    const pending = activityQuery.isPending || sessionsQuery.isPending;
    const failed = Boolean(activityQuery.error || sessionsQuery.error);
    const notice = (
      <QueryNotice loading={pending} error={failed} empty={!logs.length && !sessions.length} />
    );

    return (
      <section
        id="profile-panel-login-history"
        role="tabpanel"
        aria-labelledby="profile-tab-login-history"
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div>
          <h2 className="text-lg font-bold text-slate-900">Nhật ký đăng nhập</h2>
          <p className="mt-1 text-sm text-slate-600">
            Nhật ký đăng nhập/đăng xuất có thời gian và IP. Thiết bị, trình duyệt chỉ có ở các phiên đang hoạt động.
          </p>
        </div>
        {notice}
        {!pending && !failed && sessions.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Phiên đang hoạt động</h3>
            <ul className="space-y-2">
              {sessions.map((session) => (
                <li key={session.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {session.device} · {session.browser}
                    {session.isCurrent && (
                      <span className="ml-2 rounded-full bg-[#7bc043]/20 px-2 py-0.5 text-xs text-[#385d1b]">
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
          </div>
        )}
        {!pending && !failed && logs.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Hoạt động tài khoản gần đây</h3>
            <ul className="space-y-2">
              {logs.map((log) => (
                <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3">
                  <span className="text-sm font-medium text-slate-800">
                    {log.module}: {log.action}
                  </span>
                  <span className="text-xs text-slate-600">
                    {formatDateTimeVi(log.time)} · IP {log.ip || "Không xác định"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
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
      className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-bold text-slate-900">Chức năng được cấp quyền</h2>
        <p className="mt-1 text-sm text-slate-600">
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
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-bold text-slate-900">
        <UserRound className="h-4 w-4 text-[#026aa7]" aria-hidden="true" />
        Thông tin chi tiết
      </h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-slate-50 p-3">
            <dt className="text-xs font-semibold text-slate-500">{label}</dt>
            <dd className="mt-1 break-words text-sm font-medium text-slate-800">
              {value || "Chưa có dữ liệu"}
            </dd>
          </div>
        ))}
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-xs font-semibold text-slate-500">Trạng thái</dt>
          <dd className={`mt-1 inline-flex items-center gap-1.5 text-sm font-semibold ${accountStatusClass}`}>
            <span className={`h-2 w-2 rounded-full ${accountStatusDotClass}`} aria-hidden="true" />
            {accountStatus}
          </dd>
        </div>
      </dl>
    </section>
  );
}
