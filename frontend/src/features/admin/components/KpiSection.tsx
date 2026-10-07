import {
  Building2,
  CalendarDays,
  Users,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type { AdminDashboardStats } from "../../../hooks/useAdminDashboardStats";

interface AdminKpiSectionProps {
  onCardClick?: (id: string) => void;
  stats?: AdminDashboardStats | null;
  isLoading?: boolean;
}

interface AdminKpiCardProps {
  title: string;
  value: string;
  unit: string;
  footer: ReactNode;
  icon: LucideIcon;
  iconClassName: string;
  valueClassName: string;
  onClick?: () => void;
}

function AdminKpiCard({
  title,
  value,
  unit,
  footer,
  icon: Icon,
  iconClassName,
  valueClassName,
  onClick,
}: AdminKpiCardProps) {
  const content = (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-extrabold ${valueClassName}`}>{value}</span>
          <span className="text-xs font-medium text-slate-600">{unit}</span>
        </div>
        <div className="mt-2 text-[11px] font-medium text-slate-400">{footer}</div>
      </div>
    </>
  );

  const className =
    "flex min-h-[158px] flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 text-left shadow-2xs transition-colors";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${className} cursor-pointer hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]`}
      >
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

function formatCount(value: number | undefined, isLoading: boolean): string {
  if (isLoading) return "…";
  return value == null ? "—" : value.toLocaleString("vi-VN");
}

export const AdminKpiSection = ({
  onCardClick,
  stats,
  isLoading = false,
}: AdminKpiSectionProps) => (
  <section
    aria-label="Tổng quan chỉ số"
    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
  >
    <AdminKpiCard
      title="Giảng viên"
      value={formatCount(stats?.lecturerCount, isLoading)}
      unit="giảng viên"
      footer={
        stats?.lecturersWithStudents == null
          ? isLoading ? "Đang tải…" : "—"
          : `${stats.lecturersWithStudents} đang hướng dẫn SV`
      }
      icon={UserCheck}
      iconClassName="bg-sky-50 text-[#026aa7]"
      valueClassName="text-[#026aa7]"
      onClick={onCardClick ? () => onCardClick("lecturers") : undefined}
    />
    <AdminKpiCard
      title="Sinh viên"
      value={formatCount(stats?.studentCount, isLoading)}
      unit="sinh viên"
      footer={stats ? `${stats.activeStudents} đã cấp tài khoản` : "Đang tải…"}
      icon={Users}
      iconClassName="bg-lime-50 text-[#4f7f25]"
      valueClassName="text-[#4f7f25]"
      onClick={onCardClick ? () => onCardClick("students") : undefined}
    />
    <AdminKpiCard
      title="Thực tập"
      value={formatCount(stats?.internshipInProgress, isLoading)}
      unit="đang thực hiện"
      footer={stats ? `${stats.internshipTotal} tổng đợt` : "Đang tải…"}
      icon={CalendarDays}
      iconClassName="bg-amber-50 text-amber-700"
      valueClassName="text-slate-900"
      onClick={onCardClick ? () => onCardClick("semesters") : undefined}
    />
    <AdminKpiCard
      title="Doanh nghiệp"
      value={formatCount(stats?.companyCount, isLoading)}
      unit="doanh nghiệp"
      footer={stats ? `${stats.activeCompanies} đang hợp tác` : "Đang tải…"}
      icon={Building2}
      iconClassName="bg-violet-50 text-violet-700"
      valueClassName="text-violet-700"
      onClick={onCardClick ? () => onCardClick("companies") : undefined}
    />
  </section>
);
