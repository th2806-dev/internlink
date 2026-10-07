import type { InternshipStatsDto } from "../../types/api";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TONE_FILL: Record<string, string> = {
  blue: "#4d74c9",
  emerald: "#7bc043",
  amber: "#f59e0b",
  rose: "#f59e0b",
  sky: "#38bdf8",
  slate: "#64748b",
};

export type ChartSlice = {
  name: string;
  value: number;
  tone?: keyof typeof TONE_FILL;
};

export type TrendPoint = {
  label: string;
  value: number;
  target?: number;
  late?: number;
  missing?: number;
};

export type SemesterComparisonPoint = {
  label: string;
  students: number;
  placed: number;
  companies: number;
};

export function DashboardSemesterComparisonChart({
  data,
}: {
  data: SemesterComparisonPoint[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">So sánh giữa các kỳ</h3>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Quy mô sinh viên, số đã có doanh nghiệp và đối tác
        </p>
      </div>
      {data.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-xs text-slate-400">
          Chưa có dữ liệu học kỳ để so sánh
        </div>
      ) : (
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#dbeafe" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="students" name="Sinh viên" stroke="#4d74c9" strokeWidth={3} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="placed" name="Đã có doanh nghiệp" stroke="#7bc043" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="companies" name="Doanh nghiệp" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function DashboardTrendChart({
  title,
  subtitle,
  data,
  valueLabel = "Thực tế",
  targetLabel = "Kế hoạch",
  variant = "area",
  stacked = false,
}: {
  title: string;
  subtitle?: string;
  data: TrendPoint[];
  valueLabel?: string;
  targetLabel?: string;
  variant?: "area" | "bar" | "horizontalBar";
  stacked?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle && (
          <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          {variant === "horizontalBar" ? (
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 12, left: 12, bottom: 0 }}
            >
              <CartesianGrid
                stroke="#dbeafe"
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={92}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#475569", fontSize: 10 }}
              />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="value"
                name={valueLabel}
                fill="#4d74c9"
                radius={[0, 4, 4, 0]}
                barSize={18}
              />
            </BarChart>
          ) : variant === "bar" ? (
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#dbeafe" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="value" name={valueLabel} fill="#4d74c9" radius={[2, 2, 0, 0]} stackId={stacked ? "reports" : undefined} />
              {stacked && <Bar dataKey="late" name="Trễ / cần sửa" fill="#fbbf24" stackId="reports" />}
              {stacked && <Bar dataKey="missing" name="Chưa nộp" fill="#94a3b8" stackId="reports" radius={[2, 2, 0, 0]} />}
              {!stacked && data.some((d) => d.late != null) && (
                <Bar dataKey="late" name="Nộp trễ" fill="#fbbf24" radius={[2, 2, 0, 0]} />
              )}
              {!stacked && data.some((d) => d.missing != null) && (
                <Bar dataKey="missing" name="Chưa nộp" fill="#94a3b8" radius={[2, 2, 0, 0]} />
              )}
              {data.some((d) => d.target != null) && (
                <Line
                  dataKey="target"
                  name={targetLabel}
                  type="monotone"
                  stroke="#7bc043"
                  strokeWidth={2}
                  dot={{ r: 3.5, fill: "#ffffff", stroke: "#7bc043", strokeWidth: 2 }}
                />
              )}
            </ComposedChart>
          ) : (
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="dashTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4d74c9" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#4d74c9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dashTargetFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7bc043" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#7bc043" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#dbeafe" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 11 }}
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
                dataKey="value"
                name={valueLabel}
                stroke="#4d74c9"
                strokeWidth={2}
                fill="url(#dashTrendFill)"
              />
              {data.some((d) => d.target != null) && (
                <Area
                  type="monotone"
                  dataKey="target"
                  name={targetLabel}
                  stroke="#7bc043"
                  strokeWidth={2}
                  fill="url(#dashTargetFill)"
                />
              )}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DashboardDonutChart({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle?: string;
  data: ChartSlice[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle && (
          <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="h-[200px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={3}
              startAngle={90}
              endAngle={-270}
              label={({ name }) => name}
              labelLine={{ stroke: "#7bc043", strokeWidth: 1 }}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={TONE_FILL[entry.tone ?? "slate"]}
                  stroke="#ffffff"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-slate-900">{total}</span>
          <span className="text-[10px] text-slate-400 font-medium uppercase">
            Tổng
          </span>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-2 text-[11px]">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: TONE_FILL[d.tone ?? "slate"] }}
            />
            <span className="text-slate-600 truncate">{d.name}</span>
            <span className="font-bold text-slate-900 ml-auto">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Build admin internship status bar chart from API stats */
export function buildInternshipStatusTrend(
  stats: InternshipStatsDto,
): TrendPoint[] {
  const statusPoints = [
    { label: "Chưa bắt đầu", value: stats.notStarted },
    { label: "Đang TT", value: stats.inProgress },
    { label: "Chậm tiến độ", value: stats.behindSchedule },
    { label: "Chờ duyệt", value: stats.awaitingFeedback },
    { label: "Cần sửa", value: stats.requiresRevision },
    { label: "Hoàn thành", value: stats.completed },
    { label: "Đã chấm", value: stats.graded },
  ].filter((p) => p.value > 0);

  return statusPoints.length > 0 || stats.total <= 0
    ? statusPoints
    : [{ label: "Tổng thực tập", value: stats.total }];
}

export function buildAssignmentStatusSlices(
  assigned: number,
  unassigned: number,
): ChartSlice[] {
  return [
    { name: "Đã phân công GV", value: assigned, tone: "blue" },
    { name: "Chưa phân công", value: unassigned, tone: "amber" },
  ].filter((s) => s.value > 0);
}

export function buildLecturerStatusSlices(stats: {
  total: number;
  interning: number;
  pending: number;
  overdue: number;
  completed: number;
  statusDistribution?: Record<string, number>;
}): ChartSlice[] {
  const distribution = stats.statusDistribution;
  if (distribution && Object.keys(distribution).length > 0) {
    const labels: Record<string, { name: string; tone: ChartSlice["tone"] }> = {
      NotStarted: { name: "Chưa bắt đầu", tone: "slate" },
      InProgress: { name: "Đúng tiến độ", tone: "blue" },
      BehindSchedule: { name: "Quá hạn", tone: "amber" },
      AwaitingFeedback: { name: "Chờ phản hồi", tone: "sky" },
      RequiresRevision: { name: "Cần chỉnh sửa", tone: "amber" },
      Completed: { name: "Hoàn thành", tone: "emerald" },
      Graded: { name: "Đã chấm", tone: "blue" },
    };
    return Object.entries(distribution)
      .map(([key, value]) => ({
        ...(labels[key] ?? { name: key, tone: "slate" as const }),
        value,
      }))
      .filter((slice) => slice.value > 0);
  }

  const onTrack = Math.max(
    0,
    stats.total - stats.pending - stats.overdue - stats.completed,
  );
  return [
    { name: "Đúng tiến độ", value: onTrack, tone: "blue" },
    { name: "Chờ duyệt", value: stats.pending, tone: "sky" },
    { name: "Quá hạn / rủi ro", value: stats.overdue, tone: "amber" },
    { name: "Hoàn thành", value: stats.completed, tone: "emerald" },
  ].filter((s) => s.value > 0);
}
