import { useState } from "react";
import {
  ExternalLink,
  Check,
  Clock,
  X,
  FileText,
  ChevronRight,
} from "lucide-react";
import type { Submission } from "../../../types/submission";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";

interface RecentSubmissionsProps {
  submissions: Submission[];
  onViewAll?: () => void;
  onReviewSubmission?: (submission: Submission) => void;
}

export const RecentSubmissions = ({
  submissions,
  onViewAll,
  onReviewSubmission,
}: RecentSubmissionsProps) => {
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);

  return (
    <div className="il-panel p-5 md:p-6 space-y-4">
      {/* Table Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-sm md:text-base font-display">
            Bài nộp mới nhất
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Danh sách sinh viên vừa gửi báo cáo
          </p>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>Tất cả</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto rounded-md border border-slate-200/80">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[10px] font-bold uppercase text-slate-500 tracking-wider font-display">
              <th className="py-3 px-4">SINH VIÊN</th>
              <th className="py-3 px-4">DOANH NGHIỆP</th>
              <th className="py-3 px-4">LOẠI BÀI</th>
              <th className="py-3 px-4">THỜI GIAN</th>
              <th className="py-3 px-4 text-right">TRẠNG THÁI</th>
              <th className="py-3 px-4 text-center">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium bg-white">
            {submissions.map((sub) => (
              <tr
                key={sub.id}
                onClick={() => setSelectedSubmission(sub)}
                className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
              >
                {/* Student Info */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <InitialsAvatar name={sub.studentName} seed={sub.mssv} size={32} />
                    <div>
                      <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {sub.studentName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {sub.mssv}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Company */}
                <td className="py-3 px-4 text-slate-700 font-bold">
                  {sub.company}
                </td>

                {/* Report Type */}
                <td className="py-3 px-4 text-slate-600">
                  <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px] font-medium text-slate-700">
                    {sub.reportType}
                  </span>
                </td>

                {/* Time */}
                <td className="py-3 px-4 text-slate-500 text-[11px]">
                  <div className="font-bold text-slate-700 font-display">
                    {sub.time}
                  </div>
                  <div className="text-[10px] text-slate-400">{sub.date}</div>
                </td>

                {/* Status Badge */}
                <td className="py-3 px-4 text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
 sub.status === "Đã duyệt"
 ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
 : sub.status === "Chờ duyệt"
 ? "bg-amber-50 text-amber-700 border border-amber-200/80"
 : "bg-rose-50 text-rose-700 border border-rose-200/80"
 }`}
                  >
                    {sub.status === "Đã duyệt" && (
                      <Check className="w-3 h-3 text-emerald-600" />
                    )}
                    {sub.status === "Chờ duyệt" && (
                      <Clock className="w-3 h-3 text-amber-600" />
                    )}
                    {sub.status}
                  </span>
                </td>

                {/* Action */}
                <td className="py-3 px-4 text-center">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onReviewSubmission?.(sub);
                    }}
                    className="px-2.5 py-1 rounded-md border border-blue-200 bg-blue-50 text-blue-700 text-[10px] font-bold hover:bg-blue-100 transition-colors"
                  >
                    Xem
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick Modal Preview */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full border border-slate-200 shadow-md space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm font-display">
                    Chi tiết bài nộp
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Xem và nhận xét báo cáo sinh viên
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-md border border-slate-200/80">
              <p>
                <strong>Sinh viên:</strong>{" "}
                <span className="font-bold text-slate-900">
                  {selectedSubmission.studentName}
                </span>{" "}
                ({selectedSubmission.mssv})
              </p>
              <p>
                <strong>Doanh nghiệp:</strong> {selectedSubmission.company}
              </p>
              <p>
                <strong>Loại báo cáo:</strong> {selectedSubmission.reportType}
              </p>
              <p className="pt-2 border-t border-slate-200/60 leading-relaxed text-slate-600">
                <strong>Tóm tắt nội dung:</strong> {selectedSubmission.summary}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md cursor-pointer transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  if (onReviewSubmission)
                    onReviewSubmission(selectedSubmission);
                  setSelectedSubmission(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <span>Mở trang Báo cáo để duyệt</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
