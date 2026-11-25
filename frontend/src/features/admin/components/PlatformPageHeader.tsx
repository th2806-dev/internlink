import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export const PLATFORM_PAGE_CONTENT_CLASS = "space-y-3 px-2 pt-3";

export interface PlatformBreadcrumb {
  label: string;
  href?: string;
}

export function PlatformPageHeader({
  title,
  description,
  breadcrumbs,
  statistic,
  activeTenant,
  onChangeTenant,
}: {
  title: string;
  description?: string;
  breadcrumbs: PlatformBreadcrumb[];
  statistic?: ReactNode;
  activeTenant?: { name: string; tenantCode: string } | null;
  onChangeTenant?: () => void;
}) {
  return (
    <header className="flex min-h-12 flex-wrap items-end justify-between gap-x-3 gap-y-1 px-2 pb-1.5">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="flex h-4 min-w-0 items-center gap-1 text-[10px] leading-4 text-slate-500">
          {breadcrumbs.map((breadcrumb, index) => (
            <span key={`${breadcrumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0 text-slate-400" />}
              {breadcrumb.href && index < breadcrumbs.length - 1 ? (
                <Link to={breadcrumb.href} className="truncate hover:text-[#026aa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]">
                  {breadcrumb.label}
                </Link>
              ) : (
                <span aria-current={index === breadcrumbs.length - 1 ? "page" : undefined} className="truncate">
                  {breadcrumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h1 className="text-[15px] font-bold leading-5 text-slate-900">{title}</h1>
          {description && <p className="text-[11px] leading-4 text-slate-500">{description}</p>}
        </div>
      </div>
      <div className="mb-0.5 flex flex-wrap items-center justify-end gap-2">
        {activeTenant && (
          <div className="inline-flex max-w-full items-center gap-1.5 rounded-[3px] border border-[#026aa7]/20 bg-[#026aa7]/5 px-2 py-1 text-[10px] text-slate-700">
            <span className="truncate">
              Đang cấu hình: <strong>{activeTenant.name} ({activeTenant.tenantCode})</strong>
            </span>
            {onChangeTenant && (
              <button
                type="button"
                onClick={onChangeTenant}
                className="shrink-0 rounded-[3px] px-1 py-0.5 font-semibold text-[#026aa7] hover:bg-[#026aa7]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
              >
                Đổi đơn vị
              </button>
            )}
          </div>
        )}
        {statistic != null && (
          <div className="text-[11px] font-semibold tabular-nums text-slate-600">{statistic}</div>
        )}
      </div>
    </header>
  );
}
