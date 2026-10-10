import { useState, useEffect, useCallback, useMemo } from "react";
import { Toast } from "../../../components/common/Toast";
import {
  BarChart2,
  BarChart3,
  Building2,
  PieChart,
  Star,
} from "lucide-react";
import { Panel } from "../../../components/common/Panel";
import { LecturerSubPageHeader } from "./LecturerSubPageHeader";
import { lecturerAnalyticsService } from "../../../services/lecturerAnalytics.service";
import { lecturerInternshipsService, type LecturerSemesterOptionDto } from "../../../services/lecturerInternships.service";
import { useSemester, toApiSemesterId } from "../../../contexts/SemesterContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import type {
  LecturerActivityStatsDto,
  LecturerDashboardStatsDto,
  LecturerWeeklyTrendDto,
  LecturerGradeDistributionDto,
  LecturerCompanyStatDto,
} from "../../../types/api";

interface LecturerSemesterComparisonRow {
  semester: LecturerSemesterOptionDto;
  stats: LecturerDashboardStatsDto;
  activity: LecturerActivityStatsDto;
}

export const LecturerAnalytics = () => {
  const { selectedSemester } = useSemester();
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState("Tất cả doanh nghiệp");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<LecturerDashboardStatsDto | null>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<LecturerWeeklyTrendDto[]>([]);
  const [gradeDist, setGradeDist] = useState<LecturerGradeDistributionDto | null>(null);
  const [companyStats, setCompanyStats] = useState<LecturerCompanyStatDto[]>([]);
  const [semesterComparison, setSemesterComparison] = useState<LecturerSemesterComparisonRow[]>([]);
  const [isComparisonLoading, setIsComparisonLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  const semesterId = toApiSemesterId(selectedSemester?.id);
  const hasStatsData = statsData !== null;

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3e3);
  }, []);

  const filteredCompanyStats =
    selectedCompanyFilter === "Tất cả doanh nghiệp"
      ? companyStats
      : companyStats.filter((c) => c.companyName === selectedCompanyFilter);

  const fetchData = useCallback(async () => {
    setIsStatsLoading(true);
    setStatsError(null);
    setStatsData(null);
    setWeeklyTrend([]);
    setGradeDist(null);
    setCompanyStats([]);
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
      const message = getApiErrorMessage(err);
      setStatsError(message);
      showToast(message);
    } finally {
      setIsStatsLoading(false);
    }
  }, [semesterId, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let cancelled = false;
    setIsComparisonLoading(true);
    setComparisonError(null);
    setSemesterComparison([]);
    lecturerInternshipsService.getAssignedSemesters()
      .then((assignedSemesters) => Promise.all(
        assignedSemesters.map(async (semester) => ({
          semester,
          stats: await lecturerAnalyticsService.getStats(semester.id),
          activity: await lecturerAnalyticsService.getActivityStats(semester.id),
        })),
      ))
      .then((rows) => {
        if (!cancelled) setSemesterComparison(rows);
      })
      .catch((error) => {
        if (!cancelled) {
          const message = getApiErrorMessage(error);
          setComparisonError(message);
          showToast(message);
        }
      })
      .finally(() => {
        if (!cancelled) setIsComparisonLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  // Đổi kỳ → reset lọc doanh nghiệp (DN của kỳ cũ không còn trong danh sách → bảng rỗng ảo).
  useEffect(() => {
    setSelectedCompanyFilter("Tất cả doanh nghiệp");
  }, [semesterId]);

  const totalStudents = statsData?.totalStudents ?? 0;
  const interningStudents = statsData?.interningCount ?? 0;
  const overdueCount = statsData?.overdueReportsCount ?? 0;
  const avgGrade = statsData?.averageGrade ?? 0;
  const latestWeeklyTrend = weeklyTrend.reduce<LecturerWeeklyTrendDto | null>(
    (latest, item) => !latest || item.weekNumber > latest.weekNumber ? item : latest,
    null,
  );
  const weeklyTrendSummary = useMemo(() => {
    const totals = weeklyTrend.reduce(
      (summary, item) => ({
        onTime: summary.onTime + item.onTimeCount,
        late: summary.late + item.lateCount,
        missing: summary.missing + item.missingCount,
        pending: summary.pending + item.pendingCount,
        opportunities: summary.opportunities + item.totalStudents,
      }),
      { onTime: 0, late: 0, missing: 0, pending: 0, opportunities: 0 },
    );
    const percent = (count: number) =>
      totals.opportunities > 0 ? (count / totals.opportunities) * 100 : 0;

    return {
      ...totals,
      percent,
      onTimeRate: totals.opportunities > 0 ? `${percent(totals.onTime).toFixed(1)}%` : "—",
    };
  }, [weeklyTrend]);
  const complianceRate = latestWeeklyTrend
    ? `${Math.round(latestWeeklyTrend.complianceRate)}%`
    : "—";
  const hasGrades = hasStatsData && (statsData?.evaluatedCount ?? 0) > 0;
  const avgGradeLabel = hasGrades ? avgGrade.toFixed(1) : "—";

  return (
    <div className="mx-auto max-w-[1300px] animate-in fade-in duration-200 space-y-4 pb-12 font-sans">
      {/* Toast Notification */}
      <Toast message={toastMsg} onClose={() => setToastMsg(null)} />

      <LecturerSubPageHeader
        icon={BarChart2}
        title="Thống kê & Phân tích Chuyên sâu"
        subtitle={`Số liệu nhóm hướng dẫn · ${selectedSemester?.name ?? "Tất cả học kỳ"}`}
      />

      {statsError && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
          Không thể tải số liệu học kỳ: {statsError}
        </p>
      )}

      <Panel className="rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <span className="text-slate-500">Sinh viên hướng dẫn: <strong className="text-slate-800">{hasStatsData ? totalStudents : "—"}</strong></span>
          <span className="text-slate-500">Đang thực tập tại DN: <strong className="text-slate-800">{hasStatsData ? interningStudents : "—"}</strong></span>
          <span className="text-slate-500">Tuân thủ tuần gần nhất: <strong className="text-slate-800">{hasStatsData ? complianceRate : "—"}</strong></span>
          <span className="text-slate-500">Báo cáo quá hạn: <strong className="text-slate-800">{hasStatsData ? overdueCount : "—"}</strong></span>
          <span className="text-slate-500">Điểm trung bình: <strong className="text-slate-800">{avgGradeLabel}{hasGrades ? " / 10" : ""}</strong></span>
        </div>
      </Panel>

      <Panel className="space-y-3 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Lịch sử hướng dẫn theo học kỳ</h2>
            <p className="mt-1 text-xs text-slate-500">Kết quả và hoạt động tại các kỳ GV được phân công</p>
          </div>
          <BarChart3 className="h-4 w-4 text-[#026aa7]" />
        </div>
        {isComparisonLoading ? (
          <p className="py-4 text-center text-xs text-slate-500">Đang tổng hợp các kỳ đã tham gia…</p>
        ) : comparisonError ? (
          <p role="alert" className="py-4 text-center text-xs text-rose-700">Không thể tải dữ liệu so sánh: {comparisonError}</p>
        ) : semesterComparison.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">Chưa có dữ liệu kỳ thực tập để so sánh.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                  <th className="px-3 py-2">Học kỳ</th>
                  <th className="px-3 py-2 text-right">Sinh viên</th>
                  <th className="px-3 py-2 text-right">Doanh nghiệp</th>
                  <th className="px-3 py-2 text-right">Hoàn thành</th>
                  <th className="px-3 py-2 text-right">Điểm TB</th>
                  <th className="px-3 py-2 text-right">Bài đã nhận xét</th>
                  <th className="px-3 py-2 text-right">Phản hồi TB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {semesterComparison.map(({ semester, stats, activity }) => (
                  <tr key={semester.id} className={semester.id === semesterId ? "bg-[#026aa7]/5" : "hover:bg-slate-50"}>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-900">{semester.name}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">{semester.term} · {semester.academicYear}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-700">{stats.totalStudents}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-700">{stats.assignedCompanyCount}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-700">{stats.completedCount}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-[#026aa7]">
                      {stats.evaluatedCount > 0 ? stats.averageGrade.toFixed(2) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-700">{activity.reviewedReportsCount}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                      {activity.reviewedReportsCount > 0 ? `${activity.averageResponseDays.toFixed(1)} ngày` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="flex justify-end">
        <select
          value={selectedCompanyFilter}
          onChange={(e) => setSelectedCompanyFilter(e.target.value)}
          className="min-h-10 w-full rounded-full border border-slate-300 bg-white px-4 py-2 text-[11px] font-semibold text-slate-800 outline-none transition-colors focus:border-[#026aa7] focus:ring-2 focus:ring-[#026aa7]/20 sm:w-72"
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
        <div className="space-y-4 rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#026aa7]" />
                {weeklyTrend.length > 0
                  ? (() => {
                    const firstLabel = weeklyTrend[0]?.label ?? "Tuần 1";
                    const lastLabel = weeklyTrend[weeklyTrend.length - 1]?.label ?? "Tuần mới nhất";
                    return `Xu hướng nộp Báo cáo tuần (${firstLabel} - ${lastLabel})`;
                  })()
                  : "Xu hướng nộp Báo cáo tuần"}
              </h3>
              <p className="text-xs text-slate-500">
                {weeklyTrend.length > 0
                  ? "Số sinh viên theo trạng thái trên từng tuần đang bật nhận bài; tỷ lệ tính trên tổng lượt tuần-sinh viên"
                  : "Chưa có dữ liệu báo cáo tuần trong học kỳ đang chọn"}
              </p>
            </div>
            {weeklyTrendSummary.opportunities > 0 ? (
              <span
                title="Tỷ lệ nộp đúng hạn trên tổng số lượt tuần-sinh viên trong biểu đồ"
                className="shrink-0 rounded-full border border-[#7bc043]/30 bg-[#7bc043]/10 px-2.5 py-1 text-xs font-bold text-[#446d20]"
              >
                {weeklyTrendSummary.onTimeRate} đúng hạn
              </span>
            ) : null}
          </div>

          {/* Visual Bar Chart from API */}
          <div className="space-y-3 pt-2">
            {isStatsLoading ? (
              <p role="status" className="py-4 text-center text-xs text-slate-500">Đang tải dữ liệu báo cáo tuần…</p>
            ) : weeklyTrend.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-500">{statsError ? "Không thể hiển thị dữ liệu báo cáo tuần." : "Chưa có dữ liệu báo cáo tuần."}</p>
            ) : (
              weeklyTrend.map((item) => (
                <div key={item.weekNumber} className="space-y-1.5">
                  <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs font-bold text-slate-800">
                    <span>{item.label}</span>
                    <span className="text-slate-500 text-[11px]">
                      <strong className="text-[#446d20]">{item.onTimeCount}</strong>{" "}
                      đúng hạn •{" "}
                      <strong className="text-amber-600">{item.lateCount}</strong> trễ
                      • <strong className="text-rose-600">{item.missingCount}</strong>{" "}
                      thiếu • <strong className="text-slate-500">{item.pendingCount}</strong> chưa đến hạn
                    </span>
                  </div>
                  <div
                    className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner"
                    role="img"
                    aria-label={`${item.label}: ${item.onTimeCount} đúng hạn, ${item.lateCount} trễ hạn, ${item.missingCount} thiếu nộp, ${item.pendingCount} chưa đến hạn, trên ${item.totalStudents} sinh viên`}
                  >
                    <div
                      style={{ width: `${item.totalStudents > 0 ? (item.onTimeCount / item.totalStudents) * 100 : 0}%` }}
                      className="h-full bg-[#7bc043] transition-all duration-500"
                      title={`Đúng hạn: ${item.onTimeCount} / ${item.totalStudents} SV`}
                    />
                    <div
                      style={{ width: `${item.totalStudents > 0 ? (item.lateCount / item.totalStudents) * 100 : 0}%` }}
                      className="bg-amber-400 h-full transition-all duration-500"
                      title={`Trễ hạn: ${item.lateCount} / ${item.totalStudents} SV`}
                    />
                    <div
                      style={{ width: `${item.totalStudents > 0 ? (item.missingCount / item.totalStudents) * 100 : 0}%` }}
                      className="bg-rose-500 h-full transition-all duration-500"
                      title={`Thiếu: ${item.missingCount} / ${item.totalStudents} SV`}
                    />
                    <div
                      style={{ width: `${item.totalStudents > 0 ? (item.pendingCount / item.totalStudents) * 100 : 0}%` }}
                      className="h-full bg-slate-300 transition-all duration-500"
                      title={`Chưa đến hạn: ${item.pendingCount} / ${item.totalStudents} SV`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 text-slate-600">
            {weeklyTrend.length > 0 ? (() => {
              const percent = (count: number) => weeklyTrendSummary.percent(count).toFixed(1);
              return (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="inline-block h-3 w-3 rounded-sm bg-[#7bc043]" />
                    Đúng hạn {weeklyTrendSummary.onTime} ({percent(weeklyTrendSummary.onTime)}%)
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />
                    Trễ {weeklyTrendSummary.late} ({percent(weeklyTrendSummary.late)}%)
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" />
                    Thiếu {weeklyTrendSummary.missing} ({percent(weeklyTrendSummary.missing)}%)
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="inline-block h-3 w-3 rounded-sm bg-slate-300" />
                    Chưa đến hạn {weeklyTrendSummary.pending} ({percent(weeklyTrendSummary.pending)}%)
                  </span>
                </div>
              );
            })() : (
              <span className="text-slate-400">Chưa có dữ liệu phân tích tuần</span>
            )}
            {weeklyTrend.length > 0 ? (
              <span className="font-bold text-[#026aa7]">
                {weeklyTrend.length} tuần đang bật nhận bài
              </span>
            ) : null}
          </div>
        </div>

        {/* Grade Distribution Breakdown */}
        <div className="flex flex-col justify-between space-y-4 rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#026aa7]" />
                Phân bố Phổ điểm Đánh giá
              </h3>
              <span className="rounded-full border border-[#026aa7]/20 bg-[#026aa7]/5 px-3 py-1 text-xs font-bold text-[#025a8e]">
                {gradeDist?.totalStudents ?? (hasStatsData ? totalStudents : "—")} Sinh viên
              </span>
            </div>

            <div className="space-y-3 pt-3 text-xs">
              {isStatsLoading ? (
                <p role="status" className="py-4 text-center text-xs text-slate-500">Đang tải phân bố điểm…</p>
              ) : gradeDist ? (
                [
                  { label: "Xuất sắc (8.5 - 10.0)", count: gradeDist.excellentCount, color: "bg-[#7bc043]", textColor: "text-[#446d20]" },
                  { label: "Giỏi (8.0 - 8.4)", count: gradeDist.goodCount, color: "bg-[#4d74c9]", textColor: "text-[#3e5e9f]" },
                  { label: "Khá (7.0 - 7.9)", count: gradeDist.fairCount, color: "bg-amber-500", textColor: "text-amber-700" },
                  { label: "Trung bình khá (6.5 - 6.9)", count: gradeDist.averageGoodCount, color: "bg-cyan-600", textColor: "text-cyan-800" },
                  { label: "Trung bình (5.0 - 6.4)", count: gradeDist.averageCount, color: "bg-slate-400", textColor: "text-slate-600" },
                  { label: "Yếu (4.0 - 4.9)", count: gradeDist.weakCount, color: "bg-orange-500", textColor: "text-orange-700" },
                  { label: "Không thực tập (0.0 - 3.9)", count: gradeDist.failCount, color: "bg-rose-500", textColor: "text-rose-600" },
                  { label: "Chưa chốt điểm", count: gradeDist.notYetGradedCount, color: "bg-slate-300", textColor: "text-slate-600" },
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
            <span>Tỷ lệ xếp loại Khá - Giỏi - Xuất sắc (từ 7.0):</span>
            <strong className="font-bold text-[#446d20]">
              {gradeDist && gradeDist.totalStudents > 0
                ? ((((gradeDist.excellentCount + gradeDist.goodCount + gradeDist.fairCount) / gradeDist.totalStudents) * 100).toFixed(1)) + "%"
                : "—"}
            </strong>
          </div>
        </div>
      </div>

      {/* COMPANY STATISTICS */}
      <div className="space-y-4 rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#026aa7]" />
              Thống kê Doanh nghiệp Hợp tác &amp; Vị trí Thực tập
            </h3>
            <p className="text-xs text-slate-500">
              Danh sách các đơn vị tiếp nhận sinh viên hướng dẫn của giảng viên
            </p>
          </div>
          <span className="rounded-full border border-[#026aa7]/20 bg-[#026aa7]/5 px-3 py-1 text-xs font-bold text-[#025a8e]">
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
              {isStatsLoading ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500 text-xs">Đang tải dữ liệu doanh nghiệp…</td></tr>
              ) : filteredCompanyStats.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500 text-xs">{statsError ? "Không thể tải dữ liệu doanh nghiệp." : "Chưa có dữ liệu doanh nghiệp."}</td></tr>
              ) : (
                filteredCompanyStats.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span>{item.companyName}</span>
                    </td>
                    <td className="p-3">
                      <span className="rounded-md bg-[#026aa7]/5 px-2 py-0.5 font-bold text-[#026aa7]">
                        {item.studentCount} sinh viên
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 font-normal">
                      {item.positions}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 font-bold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{item.evaluatedStudentCount > 0 ? `${item.averageGrade} / 10` : "Chưa có đánh giá"}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${item.partnershipLevel.includes("Xuất") ? "border-[#7bc043]/30 bg-[#7bc043]/10 text-[#446d20]" : "border-[#026aa7]/20 bg-[#026aa7]/5 text-[#025a8e]"}`}>
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
