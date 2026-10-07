import type { ReactNode } from "react";
import { RefreshCw, type LucideIcon } from "lucide-react";

export function StudentSubPageHeader({
  icon: Icon,
  title,
  subtitle,
  semesterName,
  onRefresh,
  isRefreshing = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  semesterName?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#026aa7] px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-5 w-5 shrink-0 text-white/90" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-wide">{title}</h1>
            <p className="mt-0.5 text-xs text-white/80">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {semesterName && (
            <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-medium text-white">
              {semesterName}
            </span>
          )}
          {onRefresh && (
            <button
              type="button"
              disabled={isRefreshing}
              onClick={onRefresh}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              {isRefreshing ? "Đang tải…" : "Làm mới"}
            </button>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
