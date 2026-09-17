import { useState, useEffect, useCallback } from "react";
import { Toast } from "../../../components/common/Toast";
import {
  BarChart2,
  BarChart3,
  Users,
  CheckCircle2,
  Building2,
  Award,
  TrendingUp,
  PieChart,
  Star,
} from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { KpiCard, KpiGrid } from "../../../components/common/KpiCard";
import { Panel } from "../../../components/common/Panel";
import { lecturerAnalyticsService } from "../../../services/lecturerAnalytics.service";
import { useSemester, toApiSemesterId } from "../../../contexts/SemesterContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import type {
  LecturerWeeklyTrendDto,
  LecturerGradeDistributionDto,
  LecturerCompanyStatDto,
} from "../../../types/api";

interface DashboardStatsDto {
  totalStudents: number;
  interningCount: number;
  pendingReviewsCount: number;
  completedCount: number;
  overdueReportsCount: number;
  averageGrade: number;
  evaluatedCount: number;
  statusDistribution: Record<string, number>;
}

export const LecturerAnalytics = () => {
  const { selectedSemester } = useSemester();
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState("Tất cả doanh nghiệp");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<DashboardStatsDto | null>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<LecturerWeeklyTrendDto[]>([]);
  const [gradeDist, setGradeDist] = useState<LecturerGradeDistributionDto | null>(null);
  const [companyStats, setCompanyStats] = useState<LecturerCompanyStatDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const semesterId = toApiSemesterId(selectedSemester?.id);

  const filteredCompanyStats =
    selectedCompanyFilter === "Tất cả doanh nghiệp"
      ? companyStats
      : companyStats.filter((c) => c.companyName === selectedCompanyFilter);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [stats, trend, grade, company] = await Promise.all([
        lecturerAnalyticsService.getStats(semesterId),
        lecturerAnalyticsService.getWeeklyTrend(semesterId),
        lecturerAnalyticsService.getGradeDistribution(semesterId),
        lecturerAnalyticsService.getCompanyStats(semesterId),
      ]);
      setStatsData(stats);
      setWeeklyTrend(trend);
      setGradeDist(grade);
      setCompanyStats(company);
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [semesterId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3e3);
  };

  const totalStudents = statsData?.totalStudents ?? 0;
  const interningStudents = statsData?.interningCount ?? 0;
  const overdueCount = statsData?.overdueReportsCount ?? 0;
  const avgGrade = statsData?.averageGrade ?? 0;
  const complianceRate = totalStudents > 0
    ? `${Math.round(((totalStudents - overdueCount) / totalStudents) * 100)}%`
    : "100%";

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto animate-in fade-in duration-200 pb-12 font-sans">
      {/* Toast Notification */}
      <Toast message={toastMsg} onClose={() => setToastMsg(null)} />

      <PageHeader
        icon={BarChart2}
        title="Thống kê & Phân tích Chuyên sâu"
        subtitle={`Số liệu nhóm hướng dẫn · ${selectedSemester?.name ?? "Tất cả học kỳ"}`}
      />

      <KpiGrid>
        <KpiCard
          tone="blue"
          title="Sinh viên hướng dẫn"
          value={totalStudents}
          unit="sinh viên"
          icon={Users}
          footer={`${totalStudents > 0 ? 100 : 0}% Đã phân công giảng viên`}
        />
        <KpiCard
          tone="emerald"
          title="Đang thực tập tại DN"
          value={interningStudents}
          unit="sinh viên"
          icon={CheckCircle2}
          footer={`${totalStudents > 0 ? Math.round((interningStudents / totalStudents) * 100) : 0}% Đã có vị trí tại DN`}
        />
        <KpiCard
          tone="sky"
          title="Tuân thủ Tiến độ Nộp"
          value={complianceRate}
          unit="đúng hạn"
          icon={TrendingUp}
          footer={`${overdueCount} sinh viên trễ báo cáo tuần`}
        />
        <KpiCard
          tone="amber"
          title="Điểm Trung Bình Đợt"
          value={avgGrade}
          unit="/ 10"
          icon={Award}
          footer="Xếp loại Khá - Giỏi - Xuất sắc"
        />
      </KpiGrid>

      <div className="flex justify-end">
        <select
          value={selectedCompanyFilter}
          onChange={(e) => setSelectedCompanyFilter(e.target.value)}
          className="w-full sm:w-72 p-2 bg-white border border-slate-200 rounded-md outline-none font-semibold text-slate-800 text-[11px]"
          aria-label="Lọc thống kê theo doanh nghiệp"
        >
          <option value="Tất cả doanh nghiệp">Tất cả doanh nghiệp</option>
          {companyStats.map((c) => (
            <option key={c.companyName} value={c.companyName}>{c.companyName} ({c.studentCount} SV)</option>
          ))}
        </select>
      </div>

      {/* 2. CHARTS & VISUAL ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly Submission Trend */}
        <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Xu hướng nộp Báo cáo tuần (Tuần 1 - Tuần 12)
              </h3>
              <p className="text-xs text-slate-500">
                Tỷ lệ sinh viên nộp báo cáo đúng hạn, trễ hạn và quá hạn theo
                từng tuần
              </p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-200 shrink-0">
              {complianceRate} Tuân thủ
            </span>
          </div>

          {/* Visual Bar Chart from API */}
          <div className="space-y-3 pt-2">
            {weeklyTrend.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Chưa có dữ liệu báo cáo tuần</p>
            ) : (
              weeklyTrend.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-800">
                    <span>{item.label}</span>
                    <span className="text-slate-500 text-[11px]">
                      <strong className="text-emerald-600">{item.onTimeCount}</strong>{" "}
                      đúng hạn •{" "}
                      <strong className="text-amber-600">{item.lateCount}</strong> trễ
                      • <strong className="text-rose-600">{item.missingCount}</strong>{" "}
                      thiếu
                    </span>
                  </div>
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{ width: `${item.totalStudents > 0 ? (item.onTimeCount / item.totalStudents) * 100 : 0}%` }}
                      className="bg-emerald-500 h-full transition-all duration-500"
                      title={`Đúng hạn: ${item.onTimeCount} SV`}
                    />
                    <div
                      style={{ width: `${item.totalStudents > 0 ? (item.lateCount / item.totalStudents) * 100 : 0}%` }}
                      className="bg-amber-400 h-full transition-all duration-500"
                      title={`Trễ hạn: ${item.lateCount} SV`}
                    />
                    <div
                      style={{ width: `${item.totalStudents > 0 ? (item.missingCount / item.totalStudents) * 100 : 0}%` }}
                      className="bg-rose-500 h-full transition-all duration-500"
                      title={`Thiếu: ${item.missingCount} SV`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 text-slate-600">
            {(() => {
              const totOnTime = weeklyTrend.reduce((a, w) => a + w.onTimeCount, 0);
              const totLate = weeklyTrend.reduce((a, w) => a + w.lateCount, 0);
              const totMissing = weeklyTrend.reduce((a, w) => a + w.missingCount, 0);
              const totAll = totOnTime + totLate + totMissing || 1;
              return (
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                    Nộp đúng hạn ({((totOnTime / totAll) * 100).toFixed(1)}%)
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />
                    Trễ 1-3 ngày ({((totLate / totAll) * 100).toFixed(1)}%)
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" />
                    Quá hạn / Thiếu ({((totMissing / totAll) * 100).toFixed(1)}%)
                  </span>
                </div>
              );
            })()}
            <span className="font-bold text-blue-600">
              Tổng {weeklyTrend.length > 0 ? weeklyTrend.length : 12} báo cáo tuần / SV
            </span>
          </div>
        </div>

        {/* Grade Distribution Breakdown */}
        <div className="bg-white p-5 rounded-lg border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <PieChart className="w-4 h-4 text-blue-600" />
                Phân bố Phổ điểm Đánh giá
              </h3>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                {gradeDist?.totalStudents ?? totalStudents} Sinh viên
              </span>
            </div>

            <div className="space-y-3 pt-3 text-xs">
              {gradeDist ? (
                [
                  { label: "Xuất sắc (9.0 - 10.0)", count: gradeDist.excellentCount, color: "bg-emerald-500", textColor: "text-emerald-700" },
                  { label: "Giỏi (8.0 - 8.9)", count: gradeDist.goodCount, color: "bg-blue-500", textColor: "text-blue-700" },
                  { label: "Khá (7.0 - 7.9)", count: gradeDist.fairCount, color: "bg-amber-500", textColor: "text-amber-700" },
                  { label: "Trung bình (5.5 - 6.9)", count: gradeDist.averageCount, color: "bg-slate-400", textColor: "text-slate-600" },
                  { label: "Không đạt (< 5.5)", count: gradeDist.failCount, color: "bg-rose-500", textColor: "text-rose-600" },
                ].map((item, idx) => {
                  const pct = gradeDist.totalStudents > 0 ? ((item.count / gradeDist.totalStudents) * 100).toFixed(1) : "0";
                  return (
                    <div key={idx}>
                      <div className="flex justify-between font-bold mb-1">
                        <span className={`${item.textColor} flex items-center gap-1`}>
                          <span className={`w-2 h-2 rounded-full ${item.color}`} />
                          {item.label}
                        </span>
                        <span className="text-slate-900 font-bold">{item.count} SV ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div className={`${item.color} h-2.5 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-slate-400 text-center py-4">Chưa có dữ liệu đánh giá</p>
              )}
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-xs text-slate-600 font-medium flex items-center justify-between">
            <span>Tỷ lệ xếp loại Khá - Giỏi - Xuất sắc:</span>
            <strong className="text-emerald-700 font-bold">
              {gradeDist && gradeDist.totalStudents > 0
                ? ((((gradeDist.excellentCount + gradeDist.goodCount + gradeDist.fairCount) / gradeDist.totalStudents) * 100).toFixed(1)) + "%"
                : "—"}
            </strong>
          </div>
        </div>
      </div>

      {/* COMPANY STATISTICS */}
      <div className="bg-white p-5 rounded-lg border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Thống kê Doanh nghiệp Hợp tác &amp; Vị trí Thực tập
            </h3>
            <p className="text-xs text-slate-500">
              Danh sách các đơn vị tiếp nhận sinh viên hướng dẫn của giảng viên
            </p>
          </div>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg border border-blue-200">
            {companyStats.length} Doanh nghiệp · {filteredCompanyStats.length} đang lọc
          </span>
        </div>

        {/* Company Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="p-3">Doanh nghiệp</th>
                <th className="p-3">Số SV hướng dẫn</th>
                <th className="p-3">Vị trí thực tập chính</th>
                <th className="p-3">Đánh giá chất lượng</th>
                <th className="p-3 text-right">Xếp hạng Đối tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredCompanyStats.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-400 text-xs">Chưa có dữ liệu doanh nghiệp</td></tr>
              ) : (
                filteredCompanyStats.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span>{item.companyName}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-blue-600 px-2 py-0.5 bg-blue-50 rounded-md">
                        {item.studentCount} sinh viên
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 font-normal">
                      {item.positions}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 font-bold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{item.averageGrade} / 10</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${item.partnershipLevel.includes("Xuất") ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-blue-600 bg-blue-50 border-blue-200"}`}>
                        {item.partnershipLevel}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
