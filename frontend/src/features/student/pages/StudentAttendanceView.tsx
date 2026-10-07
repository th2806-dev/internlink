import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  LayoutGrid,
  List,
  Copy,
  Check,
  Info,
} from "lucide-react";
import { useSemester } from "../../../contexts/SemesterContext";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";
import { StudentSubPageHeader } from "../components/StudentSubPageHeader";
import { attendanceService } from "../../../services/attendance.service";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { parseBackendDate } from "../../../lib/formatDateTimeVi";
import type { StudentAttendanceOverviewDto } from "../../../types/api";

type FilterStatus = "all" | "present" | "absent" | "upcoming";
type ViewMode = "grid" | "table";

export const StudentAttendanceView: React.FC<{
  onShowToast?: (msg: string, type?: "success" | "error" | "info" | string) => void;
}> = ({ onShowToast }) => {
  const { refresh: refreshProfile } = useStudentPortal();
  const { selectedSemester, activeSemesterId } = useSemester();

  const attendanceSemesterId =
    selectedSemester?.id && selectedSemester.id !== "all"
      ? selectedSemester.id
      : activeSemesterId;

  const [data, setData] = useState<StudentAttendanceOverviewDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);

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

  const handleRefresh = async () => {
    try {
      await refreshProfile();
      await loadData();
      onShowToast?.("Đã làm mới dữ liệu chuyên cần thành công", "success");
    } catch {
      // error handled inside loadData
    }
  };

  const totalSessions = data?.totalSessions ?? 0;
  const presentCount = data?.presentCount ?? 0;
  const absentCount = data?.absentCount ?? 0;
  const rate = data?.attendanceRate ?? null;

  const now = new Date();

  // Next upcoming session
  const upcomingSession = useMemo(() => {
    if (!data?.sessions) return null;
    return (
      data.sessions.find((s) => parseBackendDate(s.meetingDate) >= now) ?? null
    );
  }, [data?.sessions, now]);

  // Counts for filter pills
  const counts = useMemo(() => {
    if (!data?.sessions) return { all: 0, present: 0, absent: 0, upcoming: 0 };
    let present = 0;
    let absent = 0;
    let upcoming = 0;

    data.sessions.forEach((s) => {
      const isPast = parseBackendDate(s.meetingDate) < now;
      if (!isPast) {
        upcoming++;
      } else if (s.status === "Present") {
        present++;
      } else {
        absent++;
      }
    });

    return {
      all: data.sessions.length,
      present,
      absent,
      upcoming,
    };
  }, [data?.sessions, now]);

  // Filtered session list
  const filteredSessions = useMemo(() => {
    if (!data?.sessions) return [];
    return data.sessions.filter((s) => {
      const isPast = parseBackendDate(s.meetingDate) < now;
      if (filterStatus === "upcoming") return !isPast;
      if (filterStatus === "present") return isPast && s.status === "Present";
      if (filterStatus === "absent") return isPast && s.status !== "Present";
      return true;
    });
  }, [data?.sessions, filterStatus, now]);

  const copyMeetingLink = (sessionId: string, url: string) => {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSessionId(sessionId);
      onShowToast?.("Đã sao chép liên kết phòng họp", "success");
      setTimeout(() => setCopiedSessionId(null), 2500);
    });
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 animate-in fade-in duration-200 font-sans pb-12">
      {/* 1. TOP CARD BANNER (Chuẩn layout banner xanh #026aa7 + thông tin thực tế) */}
      <div className="space-y-3">
        <StudentSubPageHeader
          icon={CalendarCheck}
          title="Chuyên cần & lịch hẹn hướng dẫn"
          subtitle="Theo dõi tình hình điểm danh và lịch hướng dẫn thực tập."
          semesterName={selectedSemester?.name}
          onRefresh={() => void handleRefresh()}
          isRefreshing={isLoading}
        />


      </div>

      {/* 2. KPI OVERVIEW CARDS (Chuẩn design system thẻ bo tròn, sắc nét, đồng bộ) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tỷ lệ chuyên cần */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between transition-all hover:border-blue-300">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Tỷ lệ chuyên cần
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {rate == null ? "—" : `${rate}%`}
              </span>
              {rate != null && (
                <span
                  className={`text-xs font-semibold ${
                    rate >= 80 ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {rate >= 80 ? "Đạt chuẩn" : "Cần lưu ý"}
                </span>
              )}
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-500 pt-3 border-t border-slate-100 mt-3 flex items-center justify-between">
            <span>{presentCount} / {totalSessions} buổi đã tham dự</span>
            {totalSessions > 0 && (
              <span className="text-slate-400 text-[10px]">
                Tổng {totalSessions} buổi
              </span>
            )}
          </div>
        </div>

        {/* KPI 2: Số buổi có mặt */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between transition-all hover:border-emerald-300">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Số buổi có mặt
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
                {data ? presentCount : "—"}
              </span>
              <span className="text-xs font-bold text-slate-500">buổi</span>
            </div>
          </div>
          <div className="text-[11px] font-medium text-emerald-700 pt-3 border-t border-slate-100 mt-3 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>
              {!data
                ? "Chưa có dữ liệu"
                : rate == null
                ? "Chưa có tỷ lệ"
                : rate >= 80
                ? "Đủ điều kiện đánh giá"
                : "Cần tham dự đủ các buổi"}
            </span>
          </div>
        </div>

        {/* KPI 3: Số buổi vắng */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between transition-all hover:border-rose-300">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Số buổi vắng
              </span>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  absentCount > 0
                    ? "bg-rose-50 text-rose-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl sm:text-3xl font-extrabold ${
                  absentCount > 0 ? "text-rose-600" : "text-emerald-700"
                }`}
              >
                {data ? absentCount : "—"}
              </span>
              <span className="text-xs font-bold text-slate-500">buổi</span>
            </div>
          </div>
          <div
            className={`text-[11px] font-medium pt-3 border-t border-slate-100 mt-3 flex items-center gap-1 ${
              absentCount > 0 ? "text-rose-700" : "text-emerald-700"
            }`}
          >
            {absentCount > 0 ? (
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>
              {!data
                ? "Chưa có dữ liệu"
                : absentCount === 0
                ? "Không vắng buổi nào"
                : absentCount >= 2
                ? "Cảnh báo: vắng ≥ 2 buổi"
                : "Vắng 1 buổi có phép/không phép"}
            </span>
          </div>
        </div>

        {/* KPI 4: Buổi gặp sắp tới */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between transition-all hover:border-sky-300">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Buổi gặp sắp tới
              </span>
              <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {upcomingSession ? `Tuần ${upcomingSession.weekNumber}` : "—"}
              </span>
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-500 pt-3 border-t border-slate-100 mt-3 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="truncate">
              {upcomingSession
                ? parseBackendDate(upcomingSession.meetingDate).toLocaleDateString(
                    "vi-VN",
                    {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    },
                  )
                : "Không có lịch sắp tới"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. BUỔI GẶP SẮP TỚI BANNER (Nếu có) */}
      {upcomingSession && (
        <div className="overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-white to-sky-50/50 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="w-fit rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-bold text-blue-800 shadow-2xs flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              Buổi gặp kế tiếp • Tuần {upcomingSession.weekNumber}
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-100/60 px-2.5 py-1 rounded-md">
              {parseBackendDate(upcomingSession.meetingDate).toLocaleDateString(
                "vi-VN",
                {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                },
              )}
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">
              {upcomingSession.title}
            </h3>
            {upcomingSession.description && (
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {upcomingSession.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 pt-3 border-t border-blue-200/60">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>
                {parseBackendDate(upcomingSession.meetingDate).toLocaleTimeString(
                  "vi-VN",
                  { hour: "2-digit", minute: "2-digit" },
                )}
                {upcomingSession.durationMinutes
                  ? ` (${(upcomingSession.durationMinutes / 45)
                      .toFixed(1)
                      .replace(/\.0$/, "")} tiết)`
                  : ""}
              </span>
            </div>

            {upcomingSession.location && (
              <div className="flex items-center gap-2">
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
                    <button
                      type="button"
                      onClick={() =>
                        copyMeetingLink(
                          upcomingSession.sessionId,
                          upcomingSession.location!,
                        )
                      }
                      title="Sao chép liên kết phòng họp"
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white rounded transition-colors"
                    >
                      {copiedSessionId === upcomingSession.sessionId ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span className="font-medium text-slate-800">
                      {upcomingSession.location}
                    </span>
                  </>
                )}
              </div>
            )}

            <div className="text-slate-600 ml-auto flex items-center gap-1 text-xs">
              <span className="text-slate-500">GVHD:</span>
              <strong className="text-slate-800">{upcomingSession.lecturerName}</strong>
            </div>
          </div>
        </div>
      )}

      {/* 4. MAIN SESSIONS HISTORY LIST & TABLE */}
      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        {/* Header Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#026aa7]" />
            <h3 className="text-sm font-bold text-slate-800">
              Lịch sử các buổi gặp & điểm danh
            </h3>
            <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
              {data?.sessions.length ?? 0} buổi
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Pills */}
            <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  filterStatus === "all"
                    ? "bg-white text-slate-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tất cả ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("present")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  filterStatus === "present"
                    ? "bg-white text-emerald-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Có mặt ({counts.present})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("absent")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  filterStatus === "absent"
                    ? "bg-white text-rose-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Vắng ({counts.absent})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("upcoming")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  filterStatus === "upcoming"
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sắp tới ({counts.upcoming})
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 text-slate-600 bg-white">
              <button
                type="button"
                title="Dạng thẻ lưới"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-blue-50 text-blue-700"
                    : "hover:bg-slate-50 text-slate-500"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Dạng bảng chi tiết"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === "table"
                    ? "bg-blue-50 text-blue-700"
                    : "hover:bg-slate-50 text-slate-500"
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2.5 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-[#026aa7]" />
            <p className="text-xs font-medium">Đang tải lịch gặp và dữ liệu điểm danh...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <div className="max-w-md mx-auto p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        ) : !data || data.sessions.length === 0 ? (
          <div className="py-16 text-center space-y-2.5">
            <div className="w-12 h-12 bg-slate-50 border border-slate-200 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              Chưa có buổi gặp nào được lên lịch
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Khi giảng viên hướng dẫn lên lịch các buổi gặp định kỳ trong học kỳ này, danh sách và thời gian sẽ hiển thị tại đây.
            </p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Info className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">
              Không có buổi gặp nào phù hợp với bộ lọc hiện tại.
            </p>
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Xem tất cả ({counts.all})
            </button>
          </div>
        ) : viewMode === "grid" ? (
          /* GRID VIEW */
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map((session) => {
              const meetingDateObj = parseBackendDate(session.meetingDate);
              const isPast = meetingDateObj < now;
              const isPresent = session.status === "Present";

              return (
                <div
                  key={session.sessionId}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isPast
                      ? isPresent
                        ? "bg-white border-slate-200/90 hover:border-emerald-300 shadow-2xs"
                        : "bg-rose-50/20 border-rose-200/80 shadow-2xs"
                      : "bg-blue-50/25 border-blue-200/80 shadow-2xs"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Week + Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Tuần {session.weekNumber}
                      </span>

                      {isPast ? (
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 border ${
                            isPresent
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {isPresent ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Có mặt
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              Vắng
                            </>
                          )}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          Sắp diễn ra
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {session.title}
                      </h4>
                      {session.description && (
                        <p className="text-xs text-slate-500 leading-relaxed mt-1 line-clamp-2">
                          {session.description}
                        </p>
                      )}
                    </div>

                    {/* Details: Time, Location, Lecturer */}
                    <div className="space-y-1.5 pt-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {meetingDateObj.toLocaleDateString("vi-VN", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}{" "}
                          • {meetingDateObj.toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {session.durationMinutes
                            ? ` (${(session.durationMinutes / 45)
                                .toFixed(1)
                                .replace(/\.0$/, "")} tiết)`
                            : ""}
                        </span>
                      </div>

                      {session.location && (
                        <div className="flex items-center gap-1.5">
                          {session.location.includes("http") ? (
                            <>
                              <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <a
                                href={session.location}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline font-medium truncate"
                              >
                                Link phòng họp
                              </a>
                              <button
                                type="button"
                                onClick={() =>
                                  copyMeetingLink(session.sessionId, session.location!)
                                }
                                title="Sao chép liên kết"
                                className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
                              >
                                {copiedSessionId === session.sessionId ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{session.location}</span>
                            </>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-slate-500 pt-0.5">
                        <span>GV:</span>
                        <strong className="text-slate-700">{session.lecturerName}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Lecturer Notes / Feedback */}
                  {session.notes && (
                    <div className="mt-3 p-2.5 bg-slate-50/80 rounded-lg border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center gap-1 font-bold text-slate-700 text-[11px]">
                        <MessageSquare className="w-3 h-3 text-blue-600" />
                        <span>Nhận xét của GV:</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed italic text-[11.5px]">
                        "{session.notes}"
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Tuần</th>
                  <th className="py-3 px-4">Buổi gặp & Nội dung</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Địa điểm / Phòng họp</th>
                  <th className="py-3 px-4">Giảng viên</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.map((session) => {
                  const meetingDateObj = parseBackendDate(session.meetingDate);
                  const isPast = meetingDateObj < now;
                  const isPresent = session.status === "Present";

                  return (
                    <tr
                      key={session.sessionId}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                          Tuần {session.weekNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{session.title}</div>
                        {session.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 max-w-xs">
                            {session.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                        <div>
                          {meetingDateObj.toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {meetingDateObj.toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {session.durationMinutes
                            ? ` (${(session.durationMinutes / 45)
                                .toFixed(1)
                                .replace(/\.0$/, "")} tiết)`
                            : ""}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {session.location ? (
                          session.location.includes("http") ? (
                            <div className="flex items-center gap-1.5">
                              <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <a
                                href={session.location}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline font-semibold"
                              >
                                Phòng trực tuyến
                              </a>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-slate-700">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{session.location}</span>
                            </div>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {session.lecturerName}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isPast ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                              isPresent
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {isPresent ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Có mặt
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-rose-600" />
                                Vắng
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="w-3 h-3 text-blue-600" />
                            Sắp diễn ra
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">
                        {session.notes ? (
                          <span className="italic text-[11px] text-slate-600 line-clamp-2">
                            "{session.notes}"
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
