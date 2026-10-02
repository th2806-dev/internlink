import {
  History,
  UserPlus,
  FileUp,
  CalendarPlus,
  FileCheck2,
  UserCheck,
  Clock,
  ChevronRight,
  Bell,
} from "lucide-react";
import type { AdminDashboardActivity } from "../../../hooks/useAdminDashboardStats";

const ICON_BY_KEYWORD: Array<{ match: RegExp; icon: typeof History }> = [
  { match: /phân công|giao hướng dẫn/i, icon: UserPlus },
  { match: /import|đồng bộ/i, icon: FileUp },
  { match: /kỳ|học kỳ|deadline/i, icon: CalendarPlus },
  { match: /báo cáo|nộp|submission/i, icon: FileCheck2 },
  { match: /tài khoản|kích hoạt|mật khẩu/i, icon: UserCheck },
];

function pickIcon(title: string) {
  return ICON_BY_KEYWORD.find((x) => x.match.test(title))?.icon ?? Bell;
}

export const AdminActivityTimeline = ({
  activities = [],
  isLoading,
  onViewAllHistory,
}: {
  activities?: AdminDashboardActivity[];
  isLoading?: boolean;
  onViewAllHistory?: () => void;
}) => {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Thông báo gần đây
            </h2>
          </div>
        </div>

        {onViewAllHistory && (
          <button
            type="button"
            onClick={onViewAllHistory}
            className="text-[11px] font-semibold text-[#1d4ed8] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-slate-500 py-6 text-center">Đang tải…</p>
      ) : activities.length === 0 ? (
        <p className="text-xs text-slate-500 py-6 text-center">
          Chưa có hoạt động gần đây
        </p>
      ) : (
        <ul className="space-y-3">
          {activities.map((act) => {
            const Icon = pickIcon(act.title);
            return (
              <li
                key={act.id}
                className="flex gap-3 pb-3 border-b border-slate-50 last:border-0 last:pb-0"
              >
                <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-slate-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 leading-snug">
                    {act.title}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                    {act.desc}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{act.time}</span>
                    <span>·</span>
                    <span>{act.user}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
