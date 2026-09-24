import { Users, Building2, FileText, TrendingUp } from "lucide-react";
import { KpiCard, KpiGrid } from "../../../components/common/KpiCard";

export const StatsCards = ({
  totalStudents,
  interningCount,
  pendingResponseCount,
  overdueCount,
  avgProgress,
  interningPercent,
  interningPercentLabel,
  semesterName,
  onCardClick,
}: {
  totalStudents: number;
  interningCount: number;
  pendingResponseCount: number;
  overdueCount: number;
  completedCount?: number;
  avgProgress: number;
  /** Percent of students who already have a company (0-100). */
  interningPercent?: number;
  /** Custom note for the "has company" card when there is nothing to intern yet. */
  interningPercentLabel?: string;
  semesterName?: string;
  onCardClick?: (type: string) => void;
}) => {
  const pct =
    interningPercent ??
    (totalStudents > 0 ? Math.round((interningCount / totalStudents) * 100) : 0);

  return (
    <KpiGrid>
      <KpiCard
        tone="blue"
        title="Sinh viên hướng dẫn"
        value={totalStudents}
        unit="sinh viên"
        icon={Users}
        footer={`Phân công đợt ${semesterName ?? "học kỳ hiện tại"}`}
        onClick={() => onCardClick?.("all")}
      />
      <KpiCard
        tone="emerald"
        title="Đã có doanh nghiệp"
        value={interningCount}
        unit="sinh viên"
        icon={Building2}
        footer={
          totalStudents > 0
            ? `${pct}% sinh viên đã có nơi thực tập`
            : interningPercentLabel ?? "Chưa có sinh viên được phân công"
        }
        onClick={() => onCardClick?.("interning")}
      />
      <KpiCard
        tone="amber"
        title="Cần phản hồi"
        value={pendingResponseCount}
        unit="báo cáo"
        icon={FileText}
        footer={
          overdueCount > 0
            ? `${overdueCount} quá hạn`
            : "Không có nội dung đang chờ xử lý"
        }
        onClick={() => onCardClick?.("pending")}
      />
      <KpiCard
        tone="sky"
        title="Tiến độ thực tập"
        value={`${avgProgress}%`}
        unit="trung bình nhóm"
        icon={TrendingUp}
        footer={
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
            <div
              className="bg-sky-500 h-full rounded-full"
              style={{ width: `${avgProgress}%` }}
            />
          </div>
        }
        onClick={() => onCardClick?.("progress")}
      />
    </KpiGrid>
  );
};
