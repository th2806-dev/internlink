import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { INTERNSHIP_WEEKS } from "../../../config/internship";

export type ChartPoint = {
  period: string;
  completed: number;
  expected: number;
};

type Props = {
  data: ChartPoint[];
  totalWeeks?: number;
};

export const EducationDashboardChart = ({ data, totalWeeks = INTERNSHIP_WEEKS }: Props) => {
  return (
    <div className="space-y-4 h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Xu hướng tiến độ thực tập
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            So sánh tiến trình hiện tại với mục tiêu chương trình.
          </p>
        </div>
        <span className="text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
          {totalWeeks} tuần
        </span>
      </div>

      <div className="h-[280px]">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            Chưa có dữ liệu báo cáo tuần
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="#e2e8f0"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="period"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 11 }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="completed"
                name="Thực tế"
                stroke="#1d4ed8"
                fill="url(#colorCompleted)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="expected"
                name="Mục tiêu"
                stroke="#059669"
                fill="url(#colorExpected)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export function buildProgressChartData(
  reports: { weekNumber: number; status: string }[],
  totalWeeks = INTERNSHIP_WEEKS,
): ChartPoint[] {
  const sorted = [...reports].sort((a, b) => a.weekNumber - b.weekNumber);
  const maxWeek = Math.max(totalWeeks, ...sorted.map((r) => r.weekNumber), 1);

  return Array.from({ length: maxWeek }, (_, i) => {
    const week = i + 1;
    const approvedUpTo = sorted.filter(
      (r) => r.weekNumber <= week && r.status === "approved",
    ).length;
    return {
      period: `Tuần ${week}`,
      completed: Math.round((approvedUpTo / maxWeek) * 100),
      expected: Math.round((week / maxWeek) * 100),
    };
  });
}

function gradeLabel(grade: number): string {
  if (grade >= 8.5) return "Xuất sắc";
  if (grade >= 8) return "Giỏi";
  if (grade >= 6.5) return "Khá";
  if (grade >= 5) return "Trung bình";
  return "Chưa đạt";
}

export { gradeLabel };
