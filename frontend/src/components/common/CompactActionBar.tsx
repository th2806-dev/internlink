import type { KeyboardEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";

export interface CompactAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost";
  ariaLabel?: string;
  disabled?: boolean;
  loading?: boolean;
}

export interface CompactActionBarProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  total?: ReactNode;
  search?: {
    value: string;
    onChange: (value: string) => void;
    onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
    placeholder: string;
    ariaLabel: string;
  };
  filters?: ReactNode;
  actions?: CompactAction[];
  children?: ReactNode;
  className?: string;
  hideTitle?: boolean;
}

export function CompactActionBar({
  icon: Icon,
  title,
  subtitle,
  badge,
  badgeColor = "border-slate-200 bg-slate-50 text-slate-600",
  total,
  search,
  filters,
  actions = [],
  children,
  className = "",
  hideTitle = false,
}: CompactActionBarProps) {
  return (
    <div
      className={`flex min-h-10 w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-200 bg-white px-2 py-1 ${className}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {Icon && <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#026aa7]" />}
        {!hideTitle && <h1 className="shrink-0 text-sm font-bold text-slate-800">{title}</h1>}
        {total != null && (
          <span className="shrink-0 text-xs font-medium tabular-nums text-slate-500">
            {total}
          </span>
        )}
        {subtitle && (
          <span
            className="hidden min-w-0 truncate text-xs text-slate-500 xl:block"
            title={subtitle}
          >
            {subtitle}
          </span>
        )}
        {badge && badge.trim().toLocaleLowerCase() !== title.trim().toLocaleLowerCase() && (
          <span
            className={`shrink-0 rounded-[3px] border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${badgeColor}`}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
        {search && (
          <label className="relative block w-44 sm:w-52">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              onKeyDown={search.onKeyDown}
              placeholder={search.placeholder}
              aria-label={search.ariaLabel}
              className="h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 pl-8 pr-2 text-xs text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#026aa7] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#026aa7]/20"
            />
          </label>
        )}
        {filters}
        {actions.map((action) => {
          const ActionIcon = action.icon;
          const variant = action.variant ?? "secondary";
          return (
            <button
              key={`${action.ariaLabel ?? action.label}`}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              aria-label={action.ariaLabel ?? action.label}
              className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[4px] border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]/30 disabled:cursor-not-allowed disabled:opacity-50 ${
                variant === "primary"
                  ? "border-[#026aa7] bg-[#026aa7] text-white hover:bg-[#025a8e]"
                  : variant === "ghost"
                    ? "border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {ActionIcon && (
                <ActionIcon
                  aria-hidden="true"
                  className={`h-3.5 w-3.5 ${action.loading ? "animate-spin" : ""}`}
                />
              )}
              {action.label}
            </button>
          );
        })}
        {children}
      </div>
    </div>
  );
}
