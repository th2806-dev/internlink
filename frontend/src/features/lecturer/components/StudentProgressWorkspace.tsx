import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Send,
  FileText,
  ChevronRight,
  ArrowLeft,
  X,
  AlertCircle,
} from "lucide-react";
import type { Student } from "../../../types/student";
import type { WeeklyReportDto } from "../../../types/api";
import { weeklyReportService } from "../../../services/weeklyReport.service";
import { useSemester } from "../../../contexts/SemesterContext";

interface StudentProgressWorkspaceProps {
  student: Student;
  onBack: () => void;
  onSendReminder: (student: Student) => void;
}

export const StudentProgressWorkspace = ({
  student,
  onBack,
  onSendReminder,
}: StudentProgressWorkspaceProps) => {
  const { selectedSemester } = useSemester();
  const totalWeeks = selectedSemester?.totalWeeks || 6;
  const [activeTab, setActiveTab] = useState<
    "timeline" | "logbook" | "history"
  >("timeline");
  const [reports, setReports] = useState<WeeklyReportDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    weeklyReportService
      .getByInternship(student.id)
      .then((data) => {
        if (!cancelled) setReports(data || []);
      })
      .catch(() => {
        if (!cancelled) setReports([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [student.id]);

  // Derive timeline from real reports and the selected semester's configured duration.
  const weeksTimeline = Array.from({ length: totalWeeks }, (_, i) => {
    const weekNum = i + 1;
    const rep = reports.find((r) => r.weekNumber === weekNum);
    const isSubmitted = rep && (rep.status === "SUBMITTED" || rep.status === "REVIEWED" || rep.status === "APPROVED");
    const isReviewed = rep && (rep.status === "REVIEWED" || rep.status === "APPROVED");
    const isOverdue = !rep && weekNum < 4 && student.riskFlag;

    return {
      week: weekNum,
      name: `Tuần ${weekNum}: ${rep?.title || `Báo cáo thực tập Tuần ${weekNum}`}`,
      date: rep?.submittedAt ? new Date(rep.submittedAt).toLocaleDateString("vi-VN") : `Mốc tuần ${weekNum}`,
      status: isReviewed ? "completed" : isSubmitted ? "in_progress" : isOverdue ? "overdue" : "upcoming",
      score: undefined,
      note: rep?.lecturerComment || (isOverdue ? "Chưa nộp báo cáo tuần" : rep?.content || ""),
    };
  });

  // Daily task logbook from reports
  const taskLogs = reports.flatMap((r) => {
    return [
      {
        date: r.submittedAt ? new Date(r.submittedAt).toLocaleDateString("vi-VN") : `Tuần ${r.weekNumber}`,
        task: r.title || `Nội dung công việc Tuần ${r.weekNumber}`,
        hours: 40,
        status: r.status === "APPROVED" || r.status === "REVIEWED" ? "Completed" : r.status === "SUBMITTED" ? "Submitted" : "Draft",
        difficulty: r.content ? "Chi tiết" : "Bình thường",
      },
    ];
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-md text-slate-600 transition-colors cursor-pointer"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 text-lg">
                {student.name}
              </h2>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-mono font-bold rounded-md">
                {student.mssv}
              </span>
              {student.riskFlag && (
                <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Cảnh báo trễ hạn
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Lớp {student.class} • Ngành {student.major} • Doanh nghiệp:{" "}
              <strong>{student.company}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {student.riskFlag && (
            <button
              onClick={() => onSendReminder(student)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Gửi đôn đốc ngay</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Overview Summary Box */}
      <div className="bg-white rounded-lg p-5 border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-3.5 bg-blue-50/70 rounded-md border border-blue-100">
          <span className="text-[11px] font-bold text-blue-700 uppercase block mb-1">
            Tiến độ đợt thực tập
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-900">
              {student.progress}%
            </span>
              <span className="text-xs font-bold text-blue-600">Tối đa {totalWeeks} tuần</span>
          </div>
          <div className="w-full bg-blue-200 h-2 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full"
              style={{ width: `${student.progress}%` }}
            />
          </div>
        </div>

        <div className="p-3.5 bg-emerald-50/70 rounded-md border border-emerald-100">
          <span className="text-[11px] font-bold text-emerald-700 uppercase block mb-1">
            Điểm quá trình trung bình
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-900">
              {student.gpa}
            </span>
            <span className="text-xs font-bold text-emerald-600">
              / 4.0 GPA
            </span>
          </div>
          <p className="text-[10px] text-emerald-600 font-medium mt-2">
            Xếp loại: Xuất sắc
          </p>
        </div>

        <div className="p-3.5 bg-amber-50/70 rounded-md border border-amber-100">
          <span className="text-[11px] font-bold text-amber-800 uppercase block mb-1">
            Báo cáo gần nhất
          </span>
          <p className="text-xs font-bold text-slate-800 truncate">
            {student.lastReportName}
          </p>
          <span className="text-[10px] text-amber-700 font-medium mt-1 block">
            Ngày nộp: {student.lastReportDate}
          </span>
        </div>

        <div className="p-3.5 bg-sky-50/80 rounded-md border border-sky-100">
          <span className="text-[11px] font-bold text-sky-800 uppercase block mb-1">
            Người hướng dẫn Doanh nghiệp
          </span>
          <p className="text-xs font-bold text-slate-800 truncate">
            {student.supervisor}
          </p>
          <span className="text-[10px] text-sky-700 font-medium mt-1 block">
            Liên hệ: 0912 345 678
          </span>
        </div>
      </div>

      {/* Tabs Selection */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab("timeline")}
          className={`px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${activeTab === "timeline" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"}`}
        >
          Lộ trình Mốc thời gian ({totalWeeks} Tuần)
        </button>
        <button
          onClick={() => setActiveTab("logbook")}
          className={`px-4 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${activeTab === "logbook" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"}`}
        >
          Nhật ký Công việc Hàng ngày (Daily Log)
        </button>
      </div>

      {/* Tab 1: Timeline */}
      {activeTab === "timeline" && (
        <div className="bg-white rounded-lg p-5 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            Chi tiết tiến độ theo tuần đợt Thực tập HK1 2026
          </h3>

          <div className="space-y-3">
            {weeksTimeline.map((item) => (
              <div
                key={item.week}
                className={`p-4 rounded-md border transition-colors flex items-center justify-between gap-4 ${
 item.status === "completed"
 ? "bg-emerald-50/50 border-emerald-200"
 : item.status === "overdue"
 ? "bg-red-50/60 border-red-200"
 : item.status === "in_progress"
 ? "bg-blue-50/60 border-blue-200 ring-1 ring-blue-300"
 : "bg-slate-50/60 border-slate-200/80 opacity-75"
 }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="shrink-0">
                    {item.status === "completed" && (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    )}
                    {item.status === "overdue" && (
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    )}
                    {item.status === "in_progress" && (
                      <Clock className="w-6 h-6 text-blue-600" />
                    )}
                    {item.status === "upcoming" && (
                      <Calendar className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-slate-900">
                        {item.name}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-medium">
                        ({item.date})
                      </span>
                    </div>
                    {item.note && (
                      <p
                        className={`text-[11px] font-medium mt-0.5 ${item.status === "overdue" ? "text-red-700 font-bold" : "text-slate-600"}`}
                      >
                        Ghi chú: {item.note}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.score !== undefined && (
                    <span className="px-2.5 py-1 bg-white text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 shadow-2xs">
                      Điểm: {item.score}
                    </span>
                  )}

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
 item.status === "completed"
 ? "bg-emerald-100 text-emerald-800"
 : item.status === "overdue"
 ? "bg-red-100 text-red-800"
 : item.status === "in_progress"
 ? "bg-blue-100 text-blue-800"
 : "bg-slate-200 text-slate-600"
 }`}
                  >
                    {item.status === "completed" && "Đã duyệt"}
                    {item.status === "overdue" && "Quá hạn"}
                    {item.status === "in_progress" && "Đang làm"}
                    {item.status === "upcoming" && "Chưa tới"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Daily Logbook */}
      {activeTab === "logbook" && (
        <div className="bg-white rounded-lg p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Nhật ký công việc hàng ngày (Daily Task Log)
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Tổng cộng 27 nhật ký đã ghi nhận
            </span>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                  <th className="py-2.5 px-3.5">NGÀY THỰC HIỆN</th>
                  <th className="py-2.5 px-3.5">NỘI DUNG CÔNG VIỆC</th>
                  <th className="py-2.5 px-3.5">SỐ GIỜ</th>
                  <th className="py-2.5 px-3.5">VẤN ĐỀ / KHÓ KHĂN</th>
                  <th className="py-2.5 px-3.5 text-right">TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {taskLogs.map((log, i) => (
                  <tr
                    key={i}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-3.5 text-slate-700 font-mono font-bold">
                      {log.date}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-slate-900">
                      {log.task}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600">{log.hours}h</td>
                    <td className="py-3 px-3.5 text-slate-500 italic">
                      {log.difficulty}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-md">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
