import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface PageHeaderAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost";
  ariaLabel?: string;
  disabled?: boolean;
  loading?: boolean;
}

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  actions?: PageHeaderAction[];
  children?: ReactNode;
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  badgeColor = "bg-slate-100 text-slate-700 border-slate-200",
  actions = [],
  children,
}: PageHeaderProps) {
  const getButtonClasses = (variant: string = "secondary") => {
    switch (variant) {
      case "primary":
        return "il-btn il-btn-primary";
      case "ghost":
        return "il-btn il-btn-ghost";
      case "secondary":
      default:
        return "il-btn il-btn-secondary";
    }
  };

  return (
    <div className="il-toolbar il-animate-in !mb-4 !px-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 border border-blue-100 shrink-0">
            <Icon className="w-4 h-4 text-[#1d4ed8]" />
          </span>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
          {badge && (
            <span
              className={`px-2 py-0.5 font-semibold text-[10px] rounded-md border ${badgeColor}`}
            >
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 font-medium mt-1 pl-7 line-clamp-2">
            {subtitle}
          </p>
        )}
      </div>

      {(actions.length > 0 || children) && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {actions.map((action, idx) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                aria-label={action.ariaLabel || action.label}
                className={`il-btn-press ${getButtonClasses(action.variant)} disabled:opacity-50 disabled:pointer-events-none`}
              >
                {ActionIcon && (
                  <ActionIcon
                    className={`w-3.5 h-3.5 ${action.loading ? "animate-spin" : ""}`}
                  />
                )}
                <span>{action.label}</span>
              </button>
            );
          })}
          {children}
        </div>
      )}
    </div>
  );
}
