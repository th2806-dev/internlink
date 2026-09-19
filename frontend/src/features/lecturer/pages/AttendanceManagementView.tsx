import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  Save,
  AlertCircle,
  CalendarCheck,
  Search,
  Check,
  X,
  RefreshCw,
  Video,
} from "lucide-react";
import { useSemester } from "../../../contexts/SemesterContext";
import { attendanceService } from "../../../services/attendance.service";
import { lecturerInternshipsService } from "../../../services/lecturerInternships.service";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { KpiCard, KpiGrid } from "../../../components/common/KpiCard";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { parseBackendDate } from "../../../lib/formatDateTimeVi";
import type {
  AttendanceSessionDto,
  AttendanceSessionDetailDto,
  AttendanceStatus,
  CreateAttendanceSessionDto,
  UpdateAttendanceSessionDto,
  LecturerStudentListItemDto,
} from "../../../types/api";

function toDateTimeLocalValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export const AttendanceManagementView: React.FC<{
  onShowToast?: (msg: string, type?: string) => void;
}> = ({ onShowToast }) => {
  const { activeSemesterId, selectedSemester } = useSemester();
  const attendanceSemesterId = selectedSemester?.id && selectedSemester.id !== "all"
    ? selectedSemester.id
    : activeSemesterId;
  const [sessions, setSessions] = useState<AttendanceSessionDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Assigned students for creating sessions
  const [assignedStudents, setAssignedStudents] = useState<LecturerStudentListItemDto[]>([]);
  const [isLoadingAssignedStudents, setIsLoadingAssignedStudents] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeMarkSession, setActiveMarkSession] = useState<AttendanceSessionDetailDto | null>(null);
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<AttendanceSessionDto | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form states for creating session
  const totalWeeks = selectedSemester?.totalWeeks || 6;
  const [createWeek, setCreateWeek] = useState(1);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createDate, setCreateDate] = useState("");
  const [createSoTiet, setCreateSoTiet] = useState(1);
  const [createLocation, setCreateLocation] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [createIsLecturerOnly, setCreateIsLecturerOnly] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Form states for editing session
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editSoTiet, setEditSoTiet] = useState(1);
  const [editLocation, setEditLocation] = useState("");
  const [editStatus, setEditStatus] = useState<"Scheduled" | "Completed" | "Cancelled">("Scheduled");
  const [editIsLecturerOnly, setEditIsLecturerOnly] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // In-memory mark states
  const [markRecords, setMarkRecords] = useState<
    Record<string, { status: AttendanceStatus; notes: string }>
  >({});
  const [isSavingMark, setIsSavingMark] = useState(false);
  const [markSearchQuery, setMarkSearchQuery] = useState("");

  const loadSessions = useCallback(async () => {
    if (!attendanceSemesterId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await attendanceService.getLecturerSessions(attendanceSemesterId);
      setSessions(data);
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setError(msg);
      onShowToast?.(msg, "error");
    } finally {
      setIsLoading(false);
    }
  }, [attendanceSemesterId, onShowToast]);

  const loadAssignedStudents = useCallback(async (): Promise<LecturerStudentListItemDto[]> => {
    if (!attendanceSemesterId) return [];
    setIsLoadingAssignedStudents(true);
    try {
      const students = await lecturerInternshipsService.getStudents(attendanceSemesterId);
      const loadedStudents = students || [];
      setAssignedStudents(loadedStudents);
      return loadedStudents;
    } catch {
      setAssignedStudents([]);
      return [];
    } finally {
      setIsLoadingAssignedStudents(false);
    }
  }, [attendanceSemesterId]);

  useEffect(() => {
    loadSessions();
    loadAssignedStudents();
  }, [loadSessions, loadAssignedStudents]);

  // Handle open create modal
  const handleOpenCreateModal = async () => {
    const students = await loadAssignedStudents();
    const nextWeek = Array.from({ length: totalWeeks }, (_, index) => index + 1)
      .find((week) => !sessions.some((session) => session.weekNumber === week));
    if (!nextWeek) {
      onShowToast?.("Mỗi tuần chỉ được lên lịch một buổi gặp trong kỳ này.", "error");
      return;
    }
    setCreateWeek(nextWeek);
    setCreateTitle(`Buổi gặp hướng dẫn tuần ${nextWeek}`);
    setCreateDescription("");
    // Default to tomorrow at 09:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    setCreateDate(toDateTimeLocalValue(tomorrow));
    setCreateSoTiet(1);
    setCreateLocation("Phòng làm việc bộ môn");
    setCreateIsLecturerOnly(false);
    setSelectedStudentIds(students.map((s) => s.studentId));
    setIsCreateModalOpen(true);
  };

  // Submit create session
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceSemesterId) return;
    if (!createTitle.trim()) {
      onShowToast?.("Vui lòng nhập tiêu đề buổi gặp", "error");
      return;
    }
    if (!createDate) {
      onShowToast?.("Vui lòng chọn thời gian buổi gặp", "error");
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const dto: CreateAttendanceSessionDto = {
        semesterId: attendanceSemesterId,
        weekNumber: createWeek,
        title: createTitle.trim(),
        description: createDescription.trim() || undefined,
        meetingDate: new Date(createDate).toISOString(),
        durationMinutes: Math.round(createSoTiet * 45),
        location: createLocation.trim() || undefined,
        isLecturerOnly: createIsLecturerOnly,
        studentIds: createIsLecturerOnly ? [] : (selectedStudentIds.length === assignedStudents.length ? undefined : selectedStudentIds),
      };

      await attendanceService.createSession(dto);
      onShowToast?.("Đã tạo buổi gặp mới thành công!", "success");
      setIsCreateModalOpen(false);
      await loadSessions();
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Handle open mark modal
  const handleOpenMarkModal = async (session: AttendanceSessionDto) => {
    try {
      const detail = await attendanceService.getSessionDetail(session.id);
      setActiveMarkSession(detail);
      const initialRecordMap: Record<string, { status: AttendanceStatus; notes: string }> = {};
      detail.records.forEach((r) => {
        initialRecordMap[r.studentId] = {
          status: r.status,
          notes: r.notes || "",
        };
      });
      setMarkRecords(initialRecordMap);
      setMarkSearchQuery("");
      setIsMarkModalOpen(true);
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    }
  };

  // Save attendance
  const handleSaveAttendance = async () => {
    if (!activeMarkSession) return;
    setIsSavingMark(true);
    try {
      const recordsToSave = Object.entries(markRecords).map(([studentId, item]) => ({
        studentId,
        status: item.status,
        notes: item.notes.trim() || undefined,
      }));

      await attendanceService.markAttendance(activeMarkSession.id, { records: recordsToSave });
      onShowToast?.("Đã lưu kết quả điểm danh thành công!", "success");
      setIsMarkModalOpen(false);
      await loadSessions();
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    } finally {
      setIsSavingMark(false);
    }
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    setMarkRecords((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        next[k] = { ...next[k], status: "Present" };
      });
      return next;
    });
  };

  // Handle open edit modal
  const handleOpenEditModal = (session: AttendanceSessionDto) => {
    setEditingSession(session);
    setEditTitle(session.title);
    setEditDescription(session.description || "");
    setEditDate(toDateTimeLocalValue(parseBackendDate(session.meetingDate)));
    setEditSoTiet((session.durationMinutes || 45) / 45);
    setEditLocation(session.location || "");
    setEditStatus(session.status);
    setEditIsLecturerOnly(session.isLecturerOnly);
    setIsEditModalOpen(true);
  };

  // Submit edit session
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;

    setIsSubmittingEdit(true);
    try {
      const dto: UpdateAttendanceSessionDto = {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        meetingDate: editDate ? new Date(editDate).toISOString() : undefined,
        durationMinutes: Math.round(editSoTiet * 45),
        location: editLocation.trim() || undefined,
        status: editStatus,
        isLecturerOnly: editIsLecturerOnly,
      };

      await attendanceService.updateSession(editingSession.id, dto);
      onShowToast?.("Cập nhật thông tin buổi gặp thành công!", "success");
      setIsEditModalOpen(false);
      await loadSessions();
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete session
  const handleDeleteSession = async (session: AttendanceSessionDto) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa buổi gặp "${session.title}"? Dữ liệu điểm danh của buổi này sẽ bị xóa.`)) {
      return;
    }

    try {
      await attendanceService.deleteSession(session.id);
      onShowToast?.("Đã xóa buổi gặp thành công.", "success");
      await loadSessions();
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    }
  };

  // KPI Calculations — exclude lecturer-only sessions from attendance stats
  const attendanceSessions = sessions.filter((s) => !s.isLecturerOnly);
  const totalSessionsCount = sessions.length;
  const completedSessionsCount = attendanceSessions.filter((s) => s.status === "Completed").length;
  const totalRecordsCount = attendanceSessions.reduce((acc, s) => acc + s.totalStudents, 0);
  const totalPresentCount = attendanceSessions.reduce((acc, s) => acc + s.presentCount, 0);
  const totalAbsentCount = attendanceSessions.reduce((acc, s) => acc + s.absentCount, 0);
  const overallRate = totalRecordsCount > 0 ? Math.round((totalPresentCount / totalRecordsCount) * 100) : 100;
  const lecturerOnlyCount = sessions.filter((s) => s.isLecturerOnly).length;

  // Filtered records for mark modal
  const filteredMarkRecords = useMemo(() => {
    if (!activeMarkSession) return [];
    if (!markSearchQuery.trim()) return activeMarkSession.records;
    const q = markSearchQuery.toLowerCase();
    return activeMarkSession.records.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.studentCode.toLowerCase().includes(q) ||
        (r.companyName && r.companyName.toLowerCase().includes(q))
    );
  }, [activeMarkSession, markSearchQuery]);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={CalendarCheck}
        title="Điểm danh & Buổi gặp hướng dẫn"
        subtitle={`Quản lý lịch họp định kỳ và theo dõi chuyên cần của sinh viên trong ${selectedSemester?.name || "học kỳ hiện tại"}.`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={loadSessions}
            disabled={isLoading}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
          <button
            onClick={handleOpenCreateModal}
            disabled={isLoadingAssignedStudents || !attendanceSemesterId}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {isLoadingAssignedStudents ? "Đang tải sinh viên..." : "Tạo buổi gặp mới"}
          </button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <KpiGrid>
        <KpiCard
          tone="blue"
          title="Tổng số buổi gặp"
          value={totalSessionsCount}
          unit="buổi"
          icon={CalendarCheck}
          footer={`${completedSessionsCount} buổi đã hoàn thành điểm danh${lecturerOnlyCount > 0 ? ` · ${lecturerOnlyCount} buổi công tác riêng` : ''}`}
        />
        <KpiCard
          tone="emerald"
          title="Tỷ lệ chuyên cần trung bình"
          value={`${overallRate}%`}
          icon={CheckCircle2}
          footer={`${totalPresentCount} / ${totalRecordsCount} lượt có mặt (chỉ buổi có SV)`}
        />
        <KpiCard
          tone="amber"
          title="Số SV đang phụ trách"
          value={assignedStudents.length}
          unit="sinh viên"
          icon={Users}
          footer={`${totalWeeks} tuần thực tập trong kỳ`}
        />
        <KpiCard
          tone={totalAbsentCount > 0 ? "rose" : "sky"}
          title="Tổng lượt vắng"
          value={totalAbsentCount}
          unit="lượt"
          icon={XCircle}
          footer={totalAbsentCount > 0 ? `Cần theo dõi (${totalAbsentCount} lượt)` : "Chưa ghi nhận lượt vắng"}
        />
      </KpiGrid>

      {/* Main Sessions List */}
      <Panel className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Danh sách các buổi gặp hướng dẫn</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {sessions.length} buổi đã lên lịch
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <p className="text-xs">Đang tải danh sách buổi gặp...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Chưa có buổi gặp nào trong học kỳ này</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Hãy tạo buổi gặp đầu tiên để lên lịch trao đổi đề cương và hướng dẫn thực tập cho sinh viên.
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Tạo buổi gặp ngay
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session) => {
              const meetingDateObj = parseBackendDate(session.meetingDate);
              const isPast = meetingDateObj < new Date();
              const isMeetLink =
                session.location &&
                (session.location.includes("http") || session.location.includes("meet.google.com") || session.location.includes("teams.microsoft.com"));

              return (
                <div
                  key={session.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    session.status === "Completed"
                      ? "bg-slate-50/50 border-slate-200"
                      : session.status === "Cancelled"
                      ? "bg-rose-50/30 border-rose-200 opacity-70"
                      : "bg-white border-blue-200 shadow-sm hover:border-blue-300"
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header: Week badge + Type badge + Status badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Tuần {session.weekNumber}
                        </span>
                        {session.isLecturerOnly && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Công tác riêng
                          </span>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          session.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : session.status === "Cancelled"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : isPast
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {session.status === "Completed"
                          ? "Đã điểm danh"
                          : session.status === "Cancelled"
                          ? "Đã hủy"
                          : isPast
                          ? "Chờ điểm danh"
                          : "Sắp diễn ra"}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {session.title}
                    </h4>

                    {/* Description */}
                    {session.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {session.description}
                      </p>
                    )}

                    {/* Meeting info details */}
                    <div className="space-y-1.5 pt-1 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {meetingDateObj.toLocaleDateString("vi-VN", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}{" "}
                          • {meetingDateObj.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                          {session.durationMinutes ? ` (${(session.durationMinutes / 45).toFixed(1).replace(/\.0$/, "")} tiết)` : ""}
                        </span>
                      </div>

                      {session.location && (
                        <div className="flex items-center gap-2 truncate">
                          {isMeetLink ? (
                            <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          ) : (
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          {isMeetLink ? (
                            <a
                              href={session.location}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1 font-medium truncate"
                            >
                              <span>{session.location}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="truncate">{session.location}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {/* Attendance stats badge */}
                    <div className="text-[11px] font-medium">
                      {session.isLecturerOnly ? (
                        <span className="text-amber-600 italic">
                          Công tác riêng — không có điểm danh
                        </span>
                      ) : session.status === "Completed" ? (
                        <span className="text-emerald-700 font-bold">
                          {session.presentCount}/{session.totalStudents} có mặt ({session.attendanceRate}%)
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          {session.totalStudents} sinh viên tham gia
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    {!session.isLecturerOnly && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenMarkModal(session)}
                        title="Điểm danh"
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md flex items-center gap-1 transition-colors shadow-sm"
                      >
                        <CalendarCheck className="w-3.5 h-3.5" />
                        <span>Điểm danh</span>
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(session)}
                        title="Sửa thông tin"
                        className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-md transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session)}
                        title="Xóa buổi gặp"
                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* ========================================================================= */}
      {/* MODAL: TẠO BUỔI GẶP MỚI */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Lên lịch buổi gặp hướng dẫn mới</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tuần thực tập <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={createWeek}
                    onChange={(e) => {
                      const w = Number(e.target.value);
                      setCreateWeek(w);
                      setCreateTitle(`Buổi gặp hướng dẫn tuần ${w}`);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:border-blue-500 font-medium outline-none"
                  >
                    {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => (
                      <option key={w} value={w}>
                        Tuần {w}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số tiết</label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={createSoTiet}
                    onChange={(e) => setCreateSoTiet(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:border-blue-500 font-medium outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tiêu đề buổi gặp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Ví dụ: Trao đổi đề cương thực tập & định hướng đề tài"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:border-blue-500 font-medium outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Thời gian bắt đầu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={createDate}
                    onChange={(e) => setCreateDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:border-blue-500 font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Địa điểm / Link họp</label>
                  <input
                    type="text"
                    value={createLocation}
                    onChange={(e) => setCreateLocation(e.target.value)}
                    placeholder="Phòng học hoặc link Google Meet"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:border-blue-500 font-medium outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nội dung trao đổi / Ghi chú</label>
                <textarea
                  rows={2}
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Nội dung sinh viên cần chuẩn bị trước buổi gặp..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:border-blue-500 font-medium outline-none"
                />
              </div>

              {/* Công tác riêng của giảng viên */}
              <div className="rounded-md border border-amber-100 bg-amber-50/50 p-3">
                <label className="flex items-center gap-2 font-semibold text-xs text-amber-900">
                  <input
                    type="checkbox"
                    checked={createIsLecturerOnly}
                    onChange={(e) => setCreateIsLecturerOnly(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  Công tác riêng của giảng viên
                </label>
                <p className="mt-1 ml-6 text-[11px] text-amber-800">
                  Dùng cho chuẩn bị hồ sơ, tổng hợp, đánh giá sau thực tập và các nhiệm vụ nội bộ; không tạo dòng điểm danh sinh viên.
                </p>
              </div>

              {/* Sinh viên tham gia */}
              {!createIsLecturerOnly && <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700">
                    Sinh viên tham dự ({selectedStudentIds.length}/{assignedStudents.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedStudentIds.length === assignedStudents.length) {
                        setSelectedStudentIds([]);
                      } else {
                        setSelectedStudentIds(assignedStudents.map((s) => s.studentId));
                      }
                    }}
                    className="text-[11px] text-blue-600 hover:underline font-medium"
                  >
                    {selectedStudentIds.length === assignedStudents.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </button>
                </div>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50">
                  {isLoadingAssignedStudents ? (
                    <p className="py-3 text-center text-slate-500">Đang tải danh sách sinh viên...</p>
                  ) : assignedStudents.length === 0 ? (
                    <p className="py-3 text-center text-slate-500">Chưa có sinh viên được phân công trong kỳ này.</p>
                  ) : assignedStudents.map((st) => {
                    const isChecked = selectedStudentIds.includes(st.studentId);
                    return (
                      <label
                        key={st.studentId}
                        className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentIds((prev) => [...prev, st.studentId]);
                            } else {
                              setSelectedStudentIds((prev) => prev.filter((id) => id !== st.studentId));
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium text-slate-800">{st.fullName}</span>
                        <span className="font-mono text-slate-400 text-[10px]">({st.studentCode})</span>
                      </label>
                    );
                  })}
                </div>
              </div>}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate || (!createIsLecturerOnly && selectedStudentIds.length === 0)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors shadow-sm"
                >
                  {isSubmittingCreate ? "Đang lưu..." : "Lên lịch buổi gặp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ĐIỂM DANH BUỔI GẶP (CHỈ CÓ MẶT VÀ VẮNG) */}
      {/* ========================================================================= */}
      {isMarkModalOpen && activeMarkSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Điểm danh: {activeMarkSession.title}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                    Tuần {activeMarkSession.weekNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {parseBackendDate(activeMarkSession.meetingDate).toLocaleString("vi-VN")} •{" "}
                  {activeMarkSession.location || "Chưa có địa điểm"}
                </p>
              </div>
              <button
                onClick={() => setIsMarkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions & Search */}
            <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={markSearchQuery}
                  onChange={(e) => setMarkSearchQuery(e.target.value)}
                  placeholder="Tìm sinh viên theo tên, MSSV, doanh nghiệp..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:border-blue-500 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-200 flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Đánh dấu tất cả có mặt
              </button>
            </div>

            {/* Student Attendance List */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {filteredMarkRecords.map((r) => {
                const currentStatus = markRecords[r.studentId]?.status ?? r.status;
                const currentNotes = markRecords[r.studentId]?.notes ?? (r.notes || "");
                const isPresent = currentStatus === "Present";

                return (
                  <div
                    key={r.studentId}
                    className={`p-3 rounded-lg border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                      isPresent
                        ? "bg-emerald-50/30 border-emerald-200"
                        : "bg-rose-50/40 border-rose-200"
                    }`}
                  >
                    {/* Student Info */}
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <InitialsAvatar name={r.studentName} size="sm" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900">{r.studentName}</span>
                          <span className="font-mono text-[10px] text-blue-600 font-bold">
                            {r.studentCode}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {r.companyName || "Chưa phân bổ DN"} • {r.class || "Chưa có lớp"}
                        </p>
                      </div>
                    </div>

                    {/* Quick 2-Status Buttons (Only "Có mặt" and "Vắng") */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setMarkRecords((prev) => ({
                            ...prev,
                            [r.studentId]: {
                              status: "Present",
                              notes: prev[r.studentId]?.notes ?? (r.notes || ""),
                            },
                          }))
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                          isPresent
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Có mặt
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setMarkRecords((prev) => ({
                            ...prev,
                            [r.studentId]: {
                              status: "Absent",
                              notes: prev[r.studentId]?.notes ?? (r.notes || ""),
                            },
                          }))
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                          !isPresent
                            ? "bg-rose-600 text-white shadow-sm"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-rose-50 hover:text-rose-700"
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        Vắng
                      </button>
                    </div>

                    {/* Notes Input */}
                    <div className="w-full md:w-64">
                      <input
                        type="text"
                        placeholder="Ghi chú trao đổi..."
                        value={currentNotes}
                        onChange={(e) =>
                          setMarkRecords((prev) => ({
                            ...prev,
                            [r.studentId]: {
                              status: prev[r.studentId]?.status ?? r.status,
                              notes: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-2.5 py-1 text-xs rounded border border-slate-200 bg-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="text-xs text-slate-600">
                <span>
                  Có mặt:{" "}
                  <strong className="text-emerald-600">
                    {Object.values(markRecords).filter((i) => i.status === "Present").length}
                  </strong>
                </span>
                <span className="mx-2">•</span>
                <span>
                  Vắng:{" "}
                  <strong className="text-rose-600">
                    {Object.values(markRecords).filter((i) => i.status === "Absent").length}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMarkModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={isSavingMark}
                  onClick={handleSaveAttendance}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSavingMark ? "Đang lưu..." : "Lưu điểm danh"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SỬA BUỔI GẶP */}
      {/* ========================================================================= */}
      {isEditModalOpen && editingSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Sửa thông tin buổi gặp</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tiêu đề buổi gặp</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:border-blue-500 font-medium outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thời gian bắt đầu</label>
                  <input
                    type="datetime-local"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:border-blue-500 font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số tiết</label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={editSoTiet}
                    onChange={(e) => setEditSoTiet(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:border-blue-500 font-medium outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Địa điểm / Link họp</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:border-blue-500 font-medium outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Trạng thái buổi gặp</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:border-blue-500 font-medium outline-none"
                >
                  <option value="Scheduled">Sắp diễn ra (Scheduled)</option>
                  <option value="Completed">Đã hoàn thành (Completed)</option>
                  <option value="Cancelled">Đã hủy (Cancelled)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nội dung trao đổi</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:border-blue-500 font-medium outline-none"
                />
              </div>

              <div className="rounded-md border border-amber-100 bg-amber-50/50 p-3">
                <label className="flex items-center gap-2 font-semibold text-xs text-amber-900">
                  <input
                    type="checkbox"
                    checked={editIsLecturerOnly}
                    onChange={(e) => setEditIsLecturerOnly(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  Công tác riêng của giảng viên
                </label>
                <p className="mt-1 ml-6 text-[11px] text-amber-800">
                  {editIsLecturerOnly
                    ? "Buổi này ẩn khỏi trang Sinh viên — không có dòng điểm danh."
                    : "Bật lên để ẩn buổi gặp khỏi trang Sinh viên."}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors shadow-sm"
                >
                  {isSubmittingEdit ? "Đang lưu..." : "Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
