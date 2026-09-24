import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Panel } from "../../../components/common/Panel";
import {
  mapWeeklyReportStatusToUi,
  mapSubmissionStatusToUi,
  mapSubmissionTypeToUi,
} from "../../../lib/portalMappers";
import type { WeeklyReportDto, SubmissionDto } from "../../../types/api";

interface StudentReportsTabProps {
  internshipId: string;
  studentName: string;
  studentCode: string;
  weeklyReports: WeeklyReportDto[];
  submissions: SubmissionDto[];
  isLoading: boolean;
  onRefresh?: () => Promise<void>;
  onShowToast?: (msg: string) => void;
  errors?: { reports?: string | null; submissions?: string | null };
}

export function StudentReportsTab({
  internshipId,
  studentName,
  studentCode,
  weeklyReports,
  submissions,
  isLoading,
  onRefresh,
  onShowToast,
  errors,
}: StudentReportsTabProps) {
  const [view, setView] = useState<"weekly" | "submissions">("weekly");

  // Sort trên BẢN SAO — không mutate array props của parent (React strict-mode & memo-safe).
  const sortedWeeklyReports = useMemo(
    () => [...weeklyReports].sort((a, b) => a.weekNumber - b.weekNumber),
    [weeklyReports],
  );

  const weeklyStatusClass = (status: string) => {
    if (status === "Approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "RevisionRequested") return "bg-rose-50 text-rose-700 border-rose-200";
    if (status === "Submitted") return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const submissionStatusClass = (status: string) => {
    if (status === "Approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "RevisionRequested") return "bg-rose-50 text-rose-700 border-rose-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  if (isLoading) {
    return (
      <Panel className="flex flex-col items-center justify-center py-16 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <p className="text-xs text-slate-500">Đang tải báo cáo...</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toggle */}
      <Panel>
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setView("weekly")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                view === "weekly"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5 inline mr-1" />
              Báo cáo tuần ({weeklyReports.length})
            </button>
            <button
              onClick={() => setView("submissions")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                view === "submissions"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Download className="w-3.5 h-3.5 inline mr-1" />
              Sản phẩm ({submissions.length})
            </button>
          </div>
        </div>

        {view === "weekly" && (
          <div className="space-y-2">
            {errors?.reports && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">Không thể tải báo cáo: {errors.reports} <button type="button" onClick={() => void onRefresh?.()} className="ml-2 font-bold underline">Thử lại</button></p>}
            {sortedWeeklyReports.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs text-slate-500">Chưa có báo cáo tuần nào</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200/80 rounded-md">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Tuần</th>
                      <th className="py-2.5 px-3">Tiêu đề</th>
                      <th className="py-2.5 px-3">Ngày nộp</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái</th>
                      <th className="py-2.5 px-3">Nhận xét</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedWeeklyReports
                      .map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-bold text-blue-700">
                            Tuần {r.weekNumber}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900">
                            {r.title}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {r.submittedAt
                              ? new Date(r.submittedAt).toLocaleDateString("vi-VN")
                              : "—"}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md border inline-flex items-center ${weeklyStatusClass(r.status)}`}
                            >
                              {mapWeeklyReportStatusToUi(r.status)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-600 max-w-[200px] truncate">
                            {r.lecturerComment ?? "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {view === "submissions" && (
          <div className="space-y-2">
            {errors?.submissions && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">Không thể tải bài nộp: {errors.submissions} <button type="button" onClick={() => void onRefresh?.()} className="ml-2 font-bold underline">Thử lại</button></p>}
            {submissions.length === 0 ? (
              <div className="py-12 text-center">
                <Download className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs text-slate-500">Chưa có bài nộp sản phẩm</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200/80 rounded-md">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Loại</th>
                      <th className="py-2.5 px-3">Tiêu đề</th>
                      <th className="py-2.5 px-3">Ngày nộp</th>
                      <th className="py-2.5 px-3">Phiên bản</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-700">
                          {mapSubmissionTypeToUi(s.type)}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {s.title ?? "—"}
                          <span className="block text-[10px] font-medium text-slate-500">
                            {s.assets?.length ?? 0} tài nguyên đính kèm
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {s.submittedAt
                            ? new Date(s.submittedAt).toLocaleDateString("vi-VN")
                            : "—"}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono">
                          v{s.version}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md border inline-flex items-center ${submissionStatusClass(s.status)}`}
                          >
                            {mapSubmissionStatusToUi(s.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
