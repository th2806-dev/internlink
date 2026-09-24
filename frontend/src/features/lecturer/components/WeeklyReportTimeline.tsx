import { CheckCircle2, Clock, Circle, AlertTriangle, Edit3, RefreshCw } from "lucide-react";
import { INTERNSHIP_WEEKS } from "../../../config/internship";
import { Panel } from "../../../components/common/Panel";
import type { WeeklyReportDto } from "../../../types/api";
import type { EvaluationDetailDto } from "../../../types/api";

interface WeeklyReportTimelineProps {
  internshipId: string;
  weeklyReports: WeeklyReportDto[];
  isLoading: boolean;
  onRefresh?: () => Promise<void>;
  onShowToast?: (msg: string) => void;
  error?: string | null;
  evaluation?: EvaluationDetailDto | null;
  totalWeeks?: number;
  /**
   * Tuần TUYỆT ĐỐI của học kỳ nơi Tuần thực tập 1 bắt đầu
   * (vd 14 → thực tập tuần 1..6 = tuần 14..19 của học kỳ). Mặc định 1 = không lệch.
   */
  internshipStartWeek?: number;
}

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle2; color: string; bgColor: string; borderColor: string; label: string }
> = {
  Draft: { icon: Circle, color: "text-slate-400", bgColor: "bg-slate-50", borderColor: "border-slate-200", label: "Bản nháp" },
  Submitted: { icon: Clock, color: "text-blue-600", bgColor: "bg-blue-50/50", borderColor: "border-blue-200", label: "Đã nộp" },
  Reviewed: { icon: CheckCircle2, color: "text-emerald-600", bgColor: "bg-emerald-50/50", borderColor: "border-emerald-200", label: "Đã xem" },
  RevisionRequested: { icon: AlertTriangle, color: "text-rose-600", bgColor: "bg-rose-50/50", borderColor: "border-rose-200", label: "Cần chỉnh sửa" },
  Approved: { icon: CheckCircle2, color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200", label: "Đã duyệt" },
};

function getWeekConfig(status: string | undefined) {
  if (!status) return STATUS_CONFIG.Draft;
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.Draft;
}

export function WeeklyReportTimeline({
  internshipId,
  weeklyReports,
  isLoading,
  onRefresh,
  onShowToast,
  error,
  evaluation,
  totalWeeks: totalWeeksProp,
  internshipStartWeek = 1,
}: WeeklyReportTimelineProps) {
  void internshipId; // kept for API-parity with workspace hooks
  const totalWeeks = totalWeeksProp || INTERNSHIP_WEEKS;
  // Nhãn tuần học kỳ: hiển thị khi kỳ đã cấu hình lệch tuần (start > 1).
  const offset = (internshipStartWeek || 1) - 1;
  const showSemesterWeek = offset > 0;
  const semesterWeekLabel = (weekNum: number) => `HK tuần ${weekNum + offset}`;

  // Build weeks + defense milestone
  const weeks = Array.from({ length: totalWeeks }, (_, i) => {
    const weekNum = i + 1;
    const report = weeklyReports.find((r) => r.weekNumber === weekNum);
    const config = getWeekConfig(report?.status);
    return { weekNum, report, config };
  });

  const approvedCount = weeklyReports.filter((r) => r.status === "Approved").length;

  if (isLoading) {
    return (
      <Panel className="flex flex-col items-center justify-center py-16 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <p className="text-xs text-slate-500">Đang tải tiến độ...</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <Panel className="border-rose-200 bg-rose-50 text-sm text-rose-700">
          <div className="flex items-center justify-between gap-3">
            <span>Không thể tải báo cáo tuần: {error}</span>
            <button type="button" onClick={() => void onRefresh?.()} className="font-bold underline">Thử lại</button>
          </div>
        </Panel>
      )}
      {/* Summary bar */}
      <Panel className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Tiến độ báo cáo tuần</h3>
            <p className="text-xs text-slate-500">
              {approvedCount}/{totalWeeks} tuần đã duyệt
              {showSemesterWeek && ` · thực tập ${semesterWeekLabel(1)} → ${semesterWeekLabel(totalWeeks)}`}
            </p>
          </div>
        </div>
        <div className="w-48 bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${(approvedCount / totalWeeks) * 100}%` }}
          />
        </div>
      </Panel>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical connector */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

        <div className="space-y-3">
          {weeks.map(({ weekNum, report, config }) => {
            const Icon = config.icon;
            const isDone = report?.status === "Approved";
            const isActive = report?.status === "Submitted" || report?.status === "RevisionRequested";
            return (
              <div key={weekNum} className="relative flex items-start gap-4">
                {/* Timeline dot */}
                <div
                  className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 ${
                    isDone
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : isActive
                        ? "bg-white border-blue-500 text-blue-600"
                        : "bg-slate-100 border-slate-300 text-slate-400"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <span className="text-xs font-bold">T{weekNum}</span>
                  )}
                </div>

                {/* Content card */}
                <div
                  className={`flex-1 p-4 rounded-lg border transition-all ${
                    isDone
                      ? "bg-emerald-50/50 border-emerald-200"
                      : isActive
                        ? "bg-blue-50/50 border-blue-200"
                        : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900">
                          Tuần {weekNum}
                        </h4>
                        {showSemesterWeek && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-500 border border-slate-200">
                            {semesterWeekLabel(weekNum)}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full border inline-flex items-center gap-1 ${config.bgColor} ${config.color} ${config.borderColor}`}
                        >
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </div>
                      {report ? (
                        <div className="mt-1.5 space-y-1">
                          <p className="text-xs text-slate-600 font-medium">
                            {report.title}
                          </p>
                          {report.submittedAt && (
                            <p className="text-[10px] text-slate-400">
                              Nộp: {new Date(report.submittedAt).toLocaleDateString("vi-VN")}
                            </p>
                          )}
                          {report.lecturerComment && (
                            <p className="text-[11px] text-blue-700 bg-blue-50 p-2 rounded border border-blue-100 mt-1">
                              <span className="font-bold">Nhận xét: </span>
                              {report.lecturerComment}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 mt-1 italic">
                          Chưa có báo cáo
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Defense milestone */}
          <div className="relative flex items-start gap-4">
            <div className="relative z-10 w-12 h-12 rounded-full bg-indigo-100 border-2 border-indigo-300 flex items-center justify-center text-indigo-600 shrink-0">
              <span className="text-[10px] font-bold">QK</span>
            </div>
            <div className="flex-1 p-4 rounded-lg border border-indigo-200 bg-indigo-50/50">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">Bảo vệ thực tập tốt nghiệp</h4>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                  {evaluation?.initiativeScore != null ? `Điểm ${evaluation.initiativeScore}/10` : "Chưa cập nhật"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {evaluation?.defenseStatus === "Completed"
                  ? `Đã bảo vệ${evaluation.defenseDate ? ` ngày ${new Date(evaluation.defenseDate).toLocaleDateString("vi-VN")}` : ""}`
                  : evaluation?.defenseStatus === "Scheduled"
                    ? `Đã xếp lịch${evaluation.defenseDate ? ` ngày ${new Date(evaluation.defenseDate).toLocaleDateString("vi-VN")}` : ""}`
                    : "Chưa xếp lịch bảo vệ"}
              </p>
              {(evaluation?.defenseCouncilName || evaluation?.defenseExaminerName) && (
                <p className="mt-1 text-[11px] text-indigo-700">
                  {evaluation.defenseCouncilName ?? "Chưa có hội đồng"}
                  {evaluation.defenseExaminerName ? ` · Phản biện: ${evaluation.defenseExaminerName}` : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
