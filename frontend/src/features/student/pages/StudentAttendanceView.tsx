import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarCheck,
  RefreshCw,
  Video,
  ExternalLink,
  MessageSquare,
  Award,
} from "lucide-react";
import { useSemester } from "../../../contexts/SemesterContext";
import { attendanceService } from "../../../services/attendance.service";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { KpiCard, KpiGrid } from "../../../components/common/KpiCard";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { parseBackendDate } from "../../../lib/formatDateTimeVi";
import type { StudentAttendanceOverviewDto, StudentAttendanceItemDto } from "../../../types/api";

export const StudentAttendanceView: React.FC<{
  onShowToast?: (msg: string, type?: string) => void;
}> = ({ onShowToast }) => {
  const { activeSemesterId, selectedSemester } = useSemester();
  const attendanceSemesterId = selectedSemester?.id && selectedSemester.id !== "all"
    ? selectedSemester.id
    : activeSemesterId;
  const [data, setData] = useState<StudentAttendanceOverviewDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!attendanceSemesterId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await attendanceService.getStudentAttendance(attendanceSemesterId);
      setData(res);
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setError(msg);
      onShowToast?.(msg, "error");
    } finally {
      setIsLoading(false);
    }
  }, [attendanceSemesterId, onShowToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalSessions = data?.totalSessions ?? 0;
  const presentCount = data?.presentCount ?? 0;
  const absentCount = data?.absentCount ?? 0;
  const rate = data?.attendanceRate ?? 100;

  // Next upcoming session
  const now = new Date();
  const upcomingSession = data?.sessions.find(
    (s) => parseBackendDate(s.meetingDate) >= now
  );

  return (
    <div className="space-y-5">
      <PageHeader
        icon={CalendarCheck}
        title="Lịch gặp & Chuyên cần hướng dẫn"
        subtitle={`Theo dõi các buổi gặp định kỳ với Giảng viên hướng dẫn trong ${selectedSemester?.name || "học kỳ hiện tại"}.`}
      >
        <button
          onClick={loadData}
          disabled={isLoading}
          className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </PageHeader>

      {/* KPI Overview */}
      <KpiGrid>
        <KpiCard
          tone="blue"
          title="Tỷ lệ chuyên cần"
          value={`${rate}%`}
          icon={CalendarCheck}
          footer={`${presentCount} / ${totalSessions} buổi đã tham dự`}
        />
        <KpiCard
          tone="emerald"
          title="Số buổi có mặt"
          value={presentCount}
          unit="buổi"
          icon={CheckCircle2}
          footer={rate >= 80 ? "Đạt chuẩn chuyên cần" : "Cần chú ý tham dự đầy đủ"}
        />
        <KpiCard
          tone={absentCount > 0 ? "rose" : "emerald"}
          title="Số buổi vắng"
          value={absentCount}
          unit="buổi"
          icon={XCircle}
          footer={absentCount === 0 ? "Không có buổi vắng" : "Vui lòng liên hệ giảng viên"}
        />
        <KpiCard
          tone="sky"
          title="Buổi gặp sắp tới"
          value={upcomingSession ? `Tuần ${upcomingSession.weekNumber}` : "—"}
          icon={Calendar}
          footer={
            upcomingSession
              ? parseBackendDate(upcomingSession.meetingDate).toLocaleDateString("vi-VN")
              : "Chưa có lịch sắp tới"
          }
        />
      </KpiGrid>

      {/* Upcoming Session Banner (if any) */}
      {upcomingSession && (
        <Panel className="border-blue-200 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider">
              Buổi gặp kế tiếp • Tuần {upcomingSession.weekNumber}
            </span>
            <span className="text-xs font-bold text-blue-700">
              {parseBackendDate(upcomingSession.meetingDate).toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">{upcomingSession.title}</h3>
            {upcomingSession.description && (
              <p className="text-xs text-slate-600 mt-1">{upcomingSession.description}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 pt-1 border-t border-blue-200/60">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>
                {parseBackendDate(upcomingSession.meetingDate).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {upcomingSession.durationMinutes ? ` (${upcomingSession.durationMinutes} phút)` : ""}
              </span>
            </div>

            {upcomingSession.location && (
              <div className="flex items-center gap-1.5">
                {upcomingSession.location.includes("http") ? (
                  <>
                    <Video className="w-4 h-4 text-blue-600" />
                    <a
                      href={upcomingSession.location}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <span>Vào phòng họp trực tuyến</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>{upcomingSession.location}</span>
                  </>
                )}
              </div>
            )}

            <div className="text-slate-500 ml-auto">
              GVHD: <strong>{upcomingSession.lecturerName}</strong>
            </div>
          </div>
        </Panel>
      )}

      {/* Main Sessions History List */}
      <Panel className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Lịch sử các buổi gặp & điểm danh</h3>
          </div>
          <span className="text-xs text-slate-500">
            Tổng cộng {data?.sessions.length ?? 0} buổi
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <p className="text-xs">Đang tải lịch gặp...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : !data || data.sessions.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">Chưa có buổi gặp nào được lên lịch</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Khi giảng viên hướng dẫn lên lịch các buổi gặp trao đổi, danh sách và thời gian sẽ hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.sessions.map((session) => {
              const meetingDateObj = parseBackendDate(session.meetingDate);
              const isPast = meetingDateObj < now;
              const isPresent = session.status === "Present";

              return (
                <div
                  key={session.sessionId}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isPast
                      ? isPresent
                        ? "bg-white border-slate-200 hover:border-emerald-300"
                        : "bg-rose-50/20 border-rose-200"
                      : "bg-blue-50/30 border-blue-200"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Tuần {session.weekNumber}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{session.title}</h4>
                      </div>

                      {session.description && (
                        <p className="text-xs text-slate-500 leading-relaxed">{session.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {meetingDateObj.toLocaleDateString("vi-VN", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}{" "}
                          • {meetingDateObj.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                          {session.durationMinutes ? ` (${session.durationMinutes}p)` : ""}
                        </span>

                        {session.location && (
                          <span className="flex items-center gap-1">
                            {session.location.includes("http") ? (
                              <Video className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            {session.location.includes("http") ? (
                              <a
                                href={session.location}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline font-medium"
                              >
                                Link phòng họp
                              </a>
                            ) : (
                              session.location
                            )}
                          </span>
                        )}

                        <span>
                          GV: <strong>{session.lecturerName}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Attendance Status Badge (Only Có mặt / Vắng) */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      {isPast ? (
                        <span
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${
                            isPresent
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {isPresent ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Có mặt
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-rose-600" />
                              Vắng
                            </>
                          )}
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                          <CalendarCheck className="w-4 h-4 text-blue-600" />
                          Sắp diễn ra
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lecturer Notes / Feedback for Student */}
                  {session.notes && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                        <span>Ghi chú từ giảng viên:</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed italic">"{session.notes}"</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
};
