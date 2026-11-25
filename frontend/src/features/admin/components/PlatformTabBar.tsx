import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface PlatformTab {
  id: string;
  label: ReactNode;
  onSelect: () => void;
  icon?: LucideIcon;
  tabId?: string;
  ariaControls?: string;
}

export function PlatformTabBar({
  ariaLabel,
  selectedId,
  tabs,
  className = "",
}: {
  ariaLabel: string;
  selectedId: string;
  tabs: PlatformTab[];
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex min-w-0 items-end gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 ${className}`}
    >
      {tabs.map(({ id, label, onSelect, icon: Icon, tabId, ariaControls }) => {
        const isSelected = selectedId === id;
        return (
          <button
            key={id}
            id={tabId}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={ariaControls}
            onClick={onSelect}
            className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#026aa7] ${
              isSelected
                ? "border-[#026aa7] text-[#026aa7]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {Icon && <Icon aria-hidden="true" className="h-4 w-4" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
