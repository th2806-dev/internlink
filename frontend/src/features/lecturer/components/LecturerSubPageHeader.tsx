import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function LecturerSubPageHeader({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#026aa7] px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-5 w-5 shrink-0 text-white/90" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-wide">{title}</h1>
            {subtitle && <p className="mt-0.5 text-xs text-white/80">{subtitle}</p>}
          </div>
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </section>
  );
}
