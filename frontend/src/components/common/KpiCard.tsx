import { LucideIcon } from "lucide-react";

import { ReactNode } from "react";



export type KpiTone = "blue" | "emerald" | "amber" | "sky" | "rose";



const KPI_ACCENT: Record<KpiTone, string> = {

  blue: "il-kpi-cell-accent-blue",

  emerald: "il-kpi-cell-accent-emerald",

  amber: "il-kpi-cell-accent-amber",

  sky: "il-kpi-cell-accent-sky",

  rose: "il-kpi-cell-accent-rose",

};



const KPI_LABEL: Record<KpiTone, string> = {

  blue: "text-slate-500",

  emerald: "text-slate-500",

  amber: "text-slate-500",

  sky: "text-slate-500",

  rose: "text-slate-500",

};



const KPI_VALUE: Record<KpiTone, string> = {

  blue: "text-slate-900",

  emerald: "text-slate-900",

  amber: "text-slate-900",

  sky: "text-slate-900",

  rose: "text-slate-900",

};



const KPI_FOOTER: Record<KpiTone, string> = {

  blue: "text-[#1d4ed8]",

  emerald: "text-emerald-700",

  amber: "text-amber-700",

  sky: "text-sky-700",

  rose: "text-rose-700",

};



/** @deprecated use KPI_ACCENT — kept for scripts that import KPI_TONE */

export const KPI_TONE = KPI_ACCENT;



export interface KpiCardProps {

  title: string;

  value: string | number;

  unit?: string;

  footer?: ReactNode;

  icon: LucideIcon;

  tone?: KpiTone;

  onClick?: () => void;

  className?: string;

}



/** KPI cell — renders inside unified `KpiGrid` stat strip. */

export function KpiCard({

  title,

  value,

  unit,

  footer,

  icon: Icon,

  tone = "blue",

  onClick,

  className = "",

}: KpiCardProps) {

  const classNames = [

    "il-kpi-cell",

    KPI_ACCENT[tone],

    onClick ? "is-clickable" : "",

    className,

  ]

    .filter(Boolean)

    .join(" ");



  const body = (

    <>

      <div className="flex items-center justify-between gap-2 mb-2">

        <span

          className={`text-[10px] font-bold uppercase tracking-wider ${KPI_LABEL[tone]}`}

        >

          {title}

        </span>

        <Icon className={`w-4 h-4 shrink-0 ${KPI_FOOTER[tone]}`} />

      </div>

      <div className="flex items-baseline gap-1.5">

        <span className={`text-3xl font-bold il-kpi-val ${KPI_VALUE[tone]}`}>

          {value}

        </span>

        {unit && (

          <span className={`text-xs font-semibold ${KPI_FOOTER[tone]}`}>

            {unit}

          </span>

        )}

      </div>

      {footer != null && (

        <div className={`text-[11px] font-medium mt-2 ${KPI_FOOTER[tone]}`}>

          {footer}

        </div>

      )}

    </>

  );



  if (onClick) {

    return (

      <button type="button" onClick={onClick} className={classNames}>

        {body}

      </button>

    );

  }



  return <div className={classNames}>{body}</div>;

}



/** One panel, four metrics — editorial stat strip (not four floating cards). */

export function KpiGrid({

  children,

  className = "",

}: {

  children: ReactNode;

  className?: string;

}) {

  return (

    <section className={`il-kpi-strip ${className}`.trim()}>{children}</section>

  );

}


