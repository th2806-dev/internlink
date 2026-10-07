import React from "react";
import { type LucideIcon, FolderSearch } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  badge?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    variant?: "primary" | "secondary" | "outline";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FolderSearch,
  title,
  description,
  badge,
  action,
  secondaryAction,
  className = "",
  children,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-400 mb-4 transition-transform hover:scale-105">
        <Icon className="w-7 h-7 text-[#026aa7]" />
      </div>

      {badge && (
        <span className="mb-2 px-2.5 py-0.5 text-[11px] font-semibold bg-[#026aa7]/5 text-[#026aa7] rounded-full border border-[#026aa7]/20">
          {badge}
        </span>
      )}

      <h3 className="text-base font-bold text-slate-900 mb-1 tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {children}

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-xs ${
                action.variant === "secondary"
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-800"
                  : action.variant === "outline"
                    ? "border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                    : "bg-[#026aa7] hover:bg-[#025a8e] active:bg-[#005082] text-white shadow-[#026aa7]/20"
              }`}
            >
              {action.icon && <action.icon className="w-3.5 h-3.5" />}
              <span>{action.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
