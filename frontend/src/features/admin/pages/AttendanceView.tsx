import React, { useState, useMemo } from "react";
import {
  CalendarCheck,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  X,
  RefreshCw,
  Video,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { useSemester } from "../../../contexts/SemesterContext";
import type { ToastType } from "../../../contexts/ToastContext";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { KpiCard, KpiGrid } from "../../../components/common/KpiCard";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { EmptyState } from "../../../components/common/EmptyState";
import { TableSkeleton } from "../../../components/common/SkeletonLoader";
import { RequestErrorState } from "../../../components/common/RequestErrorState";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { parseBackendDate, formatDateTimeVi } from "../../../lib/formatDateTimeVi";
import {
  MAX_PREP_WEEKS,
  getWeekWindow,
  isMeetingDateInWeek,
  relativeWeekFromMeetingDate,
  semesterWeekLabel,
  shiftDateIntoWeek,
  toSemesterWeek,
} from "../../../lib/internshipWeeks";
import { useAdminAttendanceQuery } from "../../../hooks/useAdminAttendanceQuery";
import type {
  AttendanceSessionDto,
  AttendanceSessionDetailDto,
  AttendanceStatus,
  CreateAttendanceSessionDto,
  UpdateAttendanceSessionDto,
} from "../../../types/api";

function toDateTimeLocalValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export const AttendanceView: React.FC<{
  onShowToast?: (msg: string, type?: ToastType) => void;
}> = ({ onShowToast }) => {
  const { activeSemesterId, selectedSemester, selectedDepartmentId, semesters } =
    useSemester();

  const attendanceSemesterId =
    selectedSemester?.id && selectedSemester.id !== "all"
      ? selectedSemester.id
      : activeSemesterId;

  const currentSemester =
    semesters.find((s) => s.id === attendanceSemesterId) ?? selectedSemester;

  const internshipStartWeek = currentSemester?.internshipStartWeek || 1;
  const semesterStartRaw = currentSemester?.startDate || null;

  const weekLabel = (week: number) =>
    semesterWeekLabel(week, internshipStartWeek);

  const weekOptionLabel = (week: number) => {
    const internshipLabel = week > 0 ? `Tuần thực tập ${week}` : `Tuần chuẩn bị ${week}`;
    return `${internshipLabel} — Tuần ${toSemesterWeek(week, internshipStartWeek)} học kỳ`;
  };

  // Quy đổi phút → tiết (1 tiết = 45 phút) để hiển thị ở bảng.
  // Dữ liệu cũ nhập theo phút (VD 60 phút → 1.3 tiết).
  const formatPeriods = (minutes?: number | null) => {
    if (!minutes) return "—";
    const periods = Math.round((minutes / 45) * 10) / 10;
    return `${Number.isInteger(periods) ? periods : periods.toFixed(1)} tiết`;
  };

  const {
    sessions,
    stats,
    lecturers,
    students,
    searchTerm,
    setSearchTerm,
    weekFilter,
    setWeekFilter,
    lecturerFilter,
    setLecturerFilter,
    statusFilter,
    setStatusFilter,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    createSession,
    isCreating,
    updateSession,
    isUpdating,
    deleteSession,
    isDeleting,
    markAttendance,
    isMarking,
    getSessionDetail,
  } = useAdminAttendanceQuery({
    semesterId: attendanceSemesterId,
    departmentId: selectedDepartmentId,
  });

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceSessionDto | null>(null);

  // Active Mark state
  const [activeMarkSession, setActiveMarkSession] =
    useState<AttendanceSessionDetailDto | null>(null);
  const [isLoadingMarkDetail, setIsLoadingMarkDetail] = useState(false);
  const [markSearch, setMarkSearch] = useState("");
  const [markRecords, setMarkRecords] = useState<
    { studentId: string; status: AttendanceStatus; notes?: string }[]
  >([]);

  // Create form state
  const totalWeeks = currentSemester?.totalWeeks || 6;
  const PREP_WEEKS = Array.from(
    { length: MAX_PREP_WEEKS + 1 },
    (_, i) => i - MAX_PREP_WEEKS
  );

  const [createLecturerId, setCreateLecturerId] = useState("");
  const [createWeek, setCreateWeek] = useState(1);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createDate, setCreateDate] = useState("");
  // Thời lượng nhập theo SỐ TIẾT (1 tiết = 45 phút); lưu DB vẫn là phút.
  const [createPeriods, setCreatePeriods] = useState(2);
  const [createLocation, setCreateLocation] = useState("");
  // Buổi hướng dẫn chung (sinh hoạt lớp/khoa) — điểm danh phụ, không bắt buộc,
  // vắng không tính vào điều kiện dự thi (mặc định BẬT vì trang này mặc định tạo buổi sinh hoạt khoa).
  const [createIsGeneral, setCreateIsGeneral] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set()
  );
  const [studentSearch, setStudentSearch] = useState("");

  // Edit form state
  const [editingSession, setEditingSession] =
    useState<AttendanceSessionDto | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editWeek, setEditWeek] = useState(1);
  const [editDate, setEditDate] = useState("");
  const [editPeriods, setEditPeriods] = useState(2);
  const [editLocation, setEditLocation] = useState("");
  const [editStatus, setEditStatus] = useState<
    "Scheduled" | "Completed" | "Cancelled"
  >("Scheduled");
  const [editIsGeneral, setEditIsGeneral] = useState(false);

  // Handler for open create modal
  const openCreateModal = () => {
    setCreateLecturerId(lecturers[0]?.id || "");
    setCreateWeek(1);
    setCreateTitle("Sinh hoạt khoa & Trao đổi kế hoạch thực tập");
    setCreateDescription(
      "Phổ biến quy định, lịch trình thực tập và giải đáp thắc mắc cho sinh viên toàn khoa."
    );
    setCreatePeriods(2);
    setCreateLocation("Hội trường A / Trực tuyến");

    // Initialize meeting date within week 1
    const window = getWeekWindow(1, semesterStartRaw, internshipStartWeek);
    const initialDate = window?.from ?? new Date();
    initialDate.setHours(8, 0, 0, 0);
    setCreateDate(toDateTimeLocalValue(initialDate));

    // Default select all students
    setSelectedStudentIds(new Set(students.map((s) => s.id)));
    setStudentSearch("");
    setIsCreateModalOpen(true);
  };

  // Change meeting date in create form -> derive week from date (nếu kỳ đã cấu hình ngày bắt đầu)
  // để tuần luôn khớp ngày theo lịch học kỳ, tránh backend chặn 400 lệch tuần.
  const handleCreateDateChange = (value: string) => {
    setCreateDate(value);
    if (value && semesterStartRaw) {
      const derived = relativeWeekFromMeetingDate(
        new Date(value),
        semesterStartRaw,
        totalWeeks,
        internshipStartWeek
      );
      if (derived !== null) setCreateWeek(derived);
    }
  };

  // Change week in create form -> adjust date into that week
  const handleCreateWeekChange = (newWeek: number) => {
    setCreateWeek(newWeek);
    const current = createDate ? new Date(createDate) : new Date();
    const shiftedIso = shiftDateIntoWeek(
      current,
      newWeek,
      semesterStartRaw,
      internshipStartWeek
    );
    if (shiftedIso) {
      setCreateDate(toDateTimeLocalValue(new Date(shiftedIso)));
    }
  };

  // Toggle select all students
  const toggleSelectAllStudents = () => {
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map((s) => s.id)));
    }
  };

  // Toggle individual student
  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter students in create modal
  const filteredStudentsInModal = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        (s.class && s.class.toLowerCase().includes(q))
    );
  }, [students, studentSearch]);

  // Submit create session
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceSemesterId) {
      onShowToast?.("Chưa xác định được học kỳ.", "error");
      return;
    }
    if (!createLecturerId) {
      onShowToast?.("Vui lòng chọn giảng viên chủ trì buổi gặp.", "error");
      return;
    }
    if (!createTitle.trim()) {
      onShowToast?.("Vui lòng nhập tiêu đề buổi sinh hoạt.", "error");
      return;
    }
    if (!createDate) {
      onShowToast?.("Vui lòng chọn thời gian buổi sinh hoạt.", "error");
      return;
    }
    if (selectedStudentIds.size === 0) {
      onShowToast?.("Vui lòng chọn ít nhất một sinh viên tham gia.", "error");
      return;
    }

    // Validate meeting date in week
    const dateObj = new Date(createDate);
    if (
      semesterStartRaw &&
      !isMeetingDateInWeek(dateObj, createWeek, semesterStartRaw, internshipStartWeek)
    ) {
      const window = getWeekWindow(createWeek, semesterStartRaw, internshipStartWeek);
      const bounds = window
        ? ` (từ ${window.from.toLocaleDateString("vi-VN")} đến ${new Date(window.to.getTime() - 1).toLocaleDateString("vi-VN")})`
        : "";
      onShowToast?.(
        `Ngày đã chọn không rơi vào ${weekLabel(createWeek)}${bounds}. Vui lòng chọn ngày hợp lệ.`,
        "error"
      );
      return;
    }

    const payload: CreateAttendanceSessionDto = {
      semesterId: attendanceSemesterId,
      lecturerId: createLecturerId,
      weekNumber: createWeek,
      title: createTitle.trim(),
      description: createDescription.trim() || undefined,
      meetingDate: dateObj.toISOString(),
      durationMinutes: (Number(createPeriods) || 1) * 45,
      location: createLocation.trim() || undefined,
      studentIds: Array.from(selectedStudentIds),
      isLecturerOnly: false,
      isGeneralSession: createIsGeneral,
    };

    try {
      await createSession(payload);
      onShowToast?.("Tạo buổi sinh hoạt khoa thành công!", "success");
      setIsCreateModalOpen(false);
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    }
  };

  // Open mark attendance modal
  const openMarkModal = async (session: AttendanceSessionDto) => {
    setIsLoadingMarkDetail(true);
    setIsMarkModalOpen(true);
    setMarkSearch("");
    try {
      const detail = await getSessionDetail(session.id);
      setActiveMarkSession(detail);
      setMarkRecords(
        detail.records.map((r) => ({
          studentId: r.studentId,
          status: r.status,
          notes: r.notes || "",
        }))
      );
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
      setIsMarkModalOpen(false);
    } finally {
      setIsLoadingMarkDetail(false);
    }
  };

  // Quick mark all in modal
  const markAll = (status: AttendanceStatus) => {
    setMarkRecords((prev) =>
      prev.map((r) => ({
        ...r,
        status,
      }))
    );
  };

  // Toggle single attendance in mark modal
  const toggleAttendance = (studentId: string) => {
    setMarkRecords((prev) =>
      prev.map((r) =>
        r.studentId === studentId
          ? { ...r, status: r.status === "Present" ? "Absent" : "Present" }
          : r
      )
    );
  };

  // Update note in mark modal
  const updateNote = (studentId: string, notes: string) => {
    setMarkRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, notes } : r))
    );
  };

  // Save mark attendance
  const handleSaveAttendance = async () => {
    if (!activeMarkSession) return;
    try {
      await markAttendance({
        id: activeMarkSession.id,
        dto: {
          records: markRecords.map((r) => ({
            studentId: r.studentId,
            status: r.status,
            notes: r.notes || undefined,
          })),
        },
      });
      onShowToast?.("Cập nhật điểm danh thành công!", "success");
      setIsMarkModalOpen(false);
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    }
  };

  // Open edit modal
  const openEditModal = (session: AttendanceSessionDto) => {
    setEditingSession(session);
    setEditTitle(session.title);
    setEditDescription(session.description || "");
    setEditWeek(session.weekNumber);
    const dateObj = parseBackendDate(session.meetingDate) ?? new Date();
    setEditDate(toDateTimeLocalValue(dateObj));
    setEditPeriods(Math.max(1, Math.round((session.durationMinutes ?? 90) / 45)));
    setEditLocation(session.location || "");
    setEditStatus(session.status);
    setEditIsGeneral(session.isGeneralSession ?? false);
    setIsEditModalOpen(true);
  };

  // Submit edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    if (!editTitle.trim()) {
      onShowToast?.("Vui lòng nhập tiêu đề.", "error");
      return;
    }
    const dateObj = new Date(editDate);
    if (
      semesterStartRaw &&
      !isMeetingDateInWeek(dateObj, editWeek, semesterStartRaw, internshipStartWeek)
    ) {
      const window = getWeekWindow(editWeek, semesterStartRaw, internshipStartWeek);
      const bounds = window
        ? ` (từ ${window.from.toLocaleDateString("vi-VN")} đến ${new Date(window.to.getTime() - 1).toLocaleDateString("vi-VN")})`
        : "";
      onShowToast?.(`Ngày đã chọn không rơi vào ${weekLabel(editWeek)}${bounds}. Vui lòng chọn ngày hợp lệ.`, "error");
      return;
    }

    const payload: UpdateAttendanceSessionDto = {
      weekNumber: editWeek,
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      meetingDate: dateObj.toISOString(),
      durationMinutes: (Number(editPeriods) || 1) * 45,
      location: editLocation.trim() || undefined,
      status: editStatus,
      isGeneralSession: editIsGeneral,
    };

    try {
      await updateSession({ id: editingSession.id, dto: payload });
      onShowToast?.("Cập nhật buổi sinh hoạt thành công!", "success");
      setIsEditModalOpen(false);
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSession(deleteTarget.id);
      onShowToast?.(`Đã xóa buổi sinh hoạt "${deleteTarget.title}"`, "success");
      setDeleteTarget(null);
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    }
  };

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto pb-10">
      <PageHeader
        icon={CalendarCheck}
        title="Điểm danh & Buổi sinh hoạt khoa"
        subtitle="Lập lịch buổi gặp và theo dõi chuyên cần sinh viên theo học kỳ."
        actions={[
          {
            label: "Tạo lịch điểm danh",
            icon: Plus,
            onClick: openCreateModal,
            variant: "primary",
          },
        ]}
      />

      {/* KPI GRID */}
      <KpiGrid>
        <KpiCard
          title="Tổng buổi gặp"
          value={stats.total}
          icon={CalendarCheck}
          tone="blue"
          footer={`Kỳ: ${currentSemester?.name || "Hiện tại"}`}
        />
        <KpiCard
          title="Đã hoàn thành"
          value={stats.completed}
          icon={CheckCircle2}
          tone="emerald"
          footer="Đã ghi nhận điểm danh"
        />
        <KpiCard
          title="Sắp diễn ra"
          value={stats.scheduled}
          icon={Clock}
          tone="amber"
          footer="Chờ tổ chức / điểm danh"
        />
        <KpiCard
          title="Tỷ lệ chuyên cần TB"
          value={`${stats.avgRate}%`}
          icon={UserCheck}
          tone="sky"
          footer="Tính trên các buổi đã hoàn thành"
        />
      </KpiGrid>

      {/* SESSIONS PANEL */}
      <Panel className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Lịch buổi gặp
              </h2>
              {currentSemester?.name && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-md border border-blue-200/60">
                  {currentSemester.name}
                </span>
              )}
            </div>
          </div>

          {/* FILTERS */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tiêu đề, GV chủ trì, địa điểm…"
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:border-blue-500 outline-none w-52"
              />
            </div>

            {/* Week filter */}
            <select
              value={weekFilter}
              onChange={(e) => setWeekFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 font-medium outline-none cursor-pointer"
            >
              <option value="all">Tất cả tuần</option>
              {PREP_WEEKS.map((w) => (
                <option key={w} value={String(w)}>
                  {weekOptionLabel(w)}
                </option>
              ))}
              {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => (
                <option key={w} value={String(w)}>
                  {weekOptionLabel(w)}
                </option>
              ))}
            </select>

            {/* Lecturer filter */}
            <select
              value={lecturerFilter}
              onChange={(e) => setLecturerFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 font-medium outline-none cursor-pointer max-w-[180px] truncate"
            >
              <option value="all">Tất cả giảng viên</option>
              {lecturers.map((lec) => (
                <option key={lec.id} value={lec.id}>
                  {lec.fullName}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 font-medium outline-none cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Scheduled">Sắp diễn ra</option>
              <option value="Completed">Đã hoàn thành</option>
              <option value="Cancelled">Đã hủy</option>
            </select>

            <button
              type="button"
              onClick={() => void refetch()}
              className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer"
              title="Làm mới dữ liệu (AJAX)"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-blue-600" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* TABLE CONTENT */}
        {isLoading && sessions.length === 0 ? (
          <div className="p-4">
            <TableSkeleton rows={5} columns={6} />
          </div>
        ) : isError && sessions.length === 0 ? (
          <div className="p-4">
            <RequestErrorState
              title="Không thể tải danh sách buổi sinh hoạt"
              message={
                error instanceof Error ? error.message : "Lỗi kết nối tới máy chủ"
              }
              onRetry={() => void refetch()}
              retrying={isFetching}
            />
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            title="Chưa có buổi sinh hoạt nào"
            description="Hãy nhấn 'Tạo buổi sinh hoạt' để lên lịch gặp mặt, phân công giảng viên và điểm danh toàn khoa."
            action={{
              label: "Tạo buổi sinh hoạt ngay",
              onClick: openCreateModal,
            }}
          />
        ) : (
          <div
            className={`overflow-x-auto transition-opacity duration-150 ${
              isFetching ? "opacity-60" : ""
            }`}
          >
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="py-2.5 pr-3">Tuần & Thời gian</th>
                  <th className="py-2.5 pr-3">Tiêu đề & Địa điểm</th>
                  <th className="py-2.5 pr-3">Giảng viên chủ trì</th>
                  <th className="py-2.5 pr-3">Sinh viên tham gia</th>
                  <th className="py-2.5 pr-3">Chuyên cần</th>
                  <th className="py-2.5 pr-3">Trạng thái</th>
                  <th className="py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sessions.map((s) => {
                  const dateObj = parseBackendDate(s.meetingDate);
                  const formattedDate = dateObj
                    ? formatDateTimeVi(dateObj)
                    : "—";
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 pr-3">
                        <span className="font-bold text-blue-700 block">
                          {weekLabel(s.weekNumber)}
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formattedDate} ({formatPeriods(s.durationMinutes)})
                        </span>
                      </td>

                      <td className="py-3 pr-3 max-w-[280px]">
                        <span className="font-bold text-slate-900 block truncate">
                          {s.title}
                        </span>
                        {s.isGeneralSession && (
                          <span className="inline-flex mt-0.5 px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-bold">
                            Hướng dẫn chung — không bắt buộc
                          </span>
                        )}
                        {s.location && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                            {s.location.toLowerCase().includes("http") ||
                            s.location.toLowerCase().includes("meet") ? (
                              <Video className="w-3 h-3 text-blue-500 shrink-0" />
                            ) : (
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            )}
                            {s.location}
                          </span>
                        )}
                      </td>

                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <InitialsAvatar
                            name={s.lecturerName || "GV"}
                            size={28}
                          />
                          <div>
                            <span className="font-bold text-slate-800 block">
                              {s.lecturerName || "Chưa phân công"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Lịch công tác GV
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 pr-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {s.totalStudents} SV
                        </span>
                      </td>

                      <td className="py-3 pr-3">
                        {s.status === "Completed" ? (
                          <div>
                            <span className="font-bold text-emerald-700 text-xs">
                              {s.presentCount}/{s.totalStudents} có mặt
                            </span>
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${s.attendanceRate}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            Chưa điểm danh
                          </span>
                        )}
                      </td>

                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            s.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : s.status === "Cancelled"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {s.status === "Completed"
                            ? "Đã hoàn thành"
                            : s.status === "Cancelled"
                            ? "Đã hủy"
                            : "Sắp diễn ra"}
                        </span>
                      </td>

                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void openMarkModal(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold transition cursor-pointer"
                            title="Điểm danh sinh viên"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Điểm danh
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(s)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                            title="Chỉnh sửa buổi sinh hoạt"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(s)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                            title="Xóa buổi sinh hoạt"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* MODAL 1: TẠO BUỔI SINH HOẠT KHOA */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-blue-600" />
                Tạo buổi sinh hoạt khoa & Lịch điểm danh
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => void handleCreateSubmit(e)}
              className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Giảng viên chủ trì <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={createLecturerId}
                    onChange={(e) => setCreateLecturerId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  >
                    <option value="">-- Chọn giảng viên chủ trì --</option>
                    {lecturers.map((lec) => (
                      <option key={lec.id} value={lec.id}>
                        {lec.fullName} ({lec.staffCode})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Buổi sinh hoạt sẽ được ghi nhận vào lịch công tác của GV này.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tuần sinh hoạt <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={createWeek}
                    onChange={(e) => handleCreateWeekChange(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  >
                    {PREP_WEEKS.map((w) => (
                      <option key={w} value={w}>
                        {weekOptionLabel(w)}
                      </option>
                    ))}
                    {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => (
                      <option key={w} value={w}>
                        {weekOptionLabel(w)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tiêu đề buổi sinh hoạt <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Sinh hoạt đầu kỳ, Trao đổi tiến độ chung toàn khoa..."
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Thời gian bắt đầu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={createDate}
                    onChange={(e) => handleCreateDateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Thời lượng (số tiết)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={createPeriods}
                    onChange={(e) =>
                      setCreatePeriods(Number(e.target.value) || 1)
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    1 tiết = 45 phút → {((Number(createPeriods) || 1) * 45)} phút
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Địa điểm / Link phòng họp
                </label>
                <input
                  type="text"
                  placeholder="VD: Hội trường A, Phòng C102 hoặc Link Google Meet / Zoom"
                  value={createLocation}
                  onChange={(e) => setCreateLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mô tả / Nội dung chi tiết
                </label>
                <textarea
                  rows={2}
                  placeholder="Nội dung trao đổi, chuẩn bị tài liệu hoặc yêu cầu sinh viên..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Buổi hướng dẫn chung — điểm danh PHỤ, không tính điều kiện dự thi */}
              <label className="flex items-start gap-2.5 p-3 rounded-md border border-amber-200 bg-amber-50/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createIsGeneral}
                  onChange={(e) => setCreateIsGeneral(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-xs leading-5">
                  <strong className="text-amber-800">Buổi hướng dẫn chung (sinh hoạt lớp)</strong>
                  <span className="block text-slate-600 mt-0.5">
                    Điểm danh PHỤ — không bắt buộc: vắng buổi này KHÔNG tính vào số buổi vắng ảnh hưởng điều kiện dự thi (khác với buổi gặp tuần bắt buộc). Vẫn hiển thị ở cột "HD chung" khi xuất Excel.
                  </span>
                </span>
              </label>

              {/* STUDENT SELECTION */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      Danh sách sinh viên tham gia
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Đã chọn:{" "}
                      <strong className="text-blue-700 font-bold">
                        {selectedStudentIds.size}
                      </strong>{" "}
                      / {students.length} sinh viên
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleSelectAllStudents}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                    >
                      {selectedStudentIds.size === students.length
                        ? "Bỏ chọn tất cả"
                        : "Chọn tất cả sinh viên"}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Lọc sinh viên theo tên hoặc MSSV..."
                    className="w-full pl-7 pr-3 py-1 text-xs border border-slate-200 rounded bg-white outline-none"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded bg-white divide-y divide-slate-100">
                  {filteredStudentsInModal.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 text-xs">
                      Không tìm thấy sinh viên phù hợp
                    </div>
                  ) : (
                    filteredStudentsInModal.map((st) => {
                      const isSelected = selectedStudentIds.has(st.id);
                      return (
                        <label
                          key={st.id}
                          className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleStudent(st.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <div>
                              <span className="font-semibold text-slate-800">
                                {st.fullName}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-2 font-mono">
                                {st.studentCode}
                              </span>
                            </div>
                          </div>
                          {st.class && (
                            <span className="text-[10px] text-slate-500">
                              Lớp: {st.class}
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-1.5 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {isCreating ? "Đang tạo lịch…" : "Tạo buổi sinh hoạt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ĐIỂM DANH SINH VIÊN */}
      {isMarkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Điểm danh: {activeMarkSession?.title || "Buổi sinh hoạt"}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {activeMarkSession && `${weekLabel(activeMarkSession.weekNumber)} · `}
                  GV chủ trì: {activeMarkSession?.lecturerName || "—"} ·{" "}
                  {activeMarkSession?.records.length || 0} sinh viên
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMarkModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingMarkDetail ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Đang tải danh sách điểm danh…
              </div>
            ) : (
              <div className="p-5 space-y-3.5 text-xs">
                {/* TOOLBAR */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={markSearch}
                      onChange={(e) => setMarkSearch(e.target.value)}
                      placeholder="Tìm sinh viên trong buổi..."
                      className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 focus:bg-white outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => markAll("Present")}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                    >
                      Tất cả có mặt
                    </button>
                    <button
                      type="button"
                      onClick={() => markAll("Absent")}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                    >
                      Tất cả vắng
                    </button>
                  </div>
                </div>

                {/* STUDENTS ATTENDANCE TABLE */}
                <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="p-2.5">Sinh viên</th>
                        <th className="p-2.5 w-36 text-center">Trạng thái</th>
                        <th className="p-2.5">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeMarkSession?.records
                        .filter(
                          (r) =>
                            !markSearch ||
                            r.studentName.toLowerCase().includes(markSearch.toLowerCase()) ||
                            r.studentCode.toLowerCase().includes(markSearch.toLowerCase())
                        )
                        .map((rec) => {
                          const currentMark =
                            markRecords.find((m) => m.studentId === rec.studentId) || {
                              status: rec.status,
                              notes: rec.notes,
                            };
                          const isPresent = currentMark.status === "Present";
                          return (
                            <tr key={rec.studentId} className="hover:bg-slate-50/50">
                              <td className="p-2.5">
                                <span className="font-bold text-slate-900 block">
                                  {rec.studentName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {rec.studentCode}
                                </span>
                              </td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleAttendance(rec.studentId)}
                                  className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                                    isPresent
                                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                      : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                                  }`}
                                >
                                  {isPresent ? "Có mặt" : "Vắng"}
                                </button>
                              </td>
                              <td className="p-2.5">
                                <input
                                  type="text"
                                  placeholder="Ghi chú (phép, muộn...)"
                                  value={currentMark.notes || ""}
                                  onChange={(e) =>
                                    updateNote(rec.studentId, e.target.value)
                                  }
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:bg-white outline-none"
                                />
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="text-xs text-slate-500 font-medium">
                    Có mặt:{" "}
                    <strong className="text-emerald-700">
                      {markRecords.filter((r) => r.status === "Present").length}
                    </strong>{" "}
                    · Vắng:{" "}
                    <strong className="text-rose-700">
                      {markRecords.filter((r) => r.status === "Absent").length}
                    </strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMarkModalOpen(false)}
                      className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveAttendance()}
                      disabled={isMarking}
                      className="px-4 py-1.5 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
                    >
                      {isMarking ? "Đang lưu…" : "Lưu điểm danh"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: SỬA BUỔI SINH HOẠT */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                Chỉnh sửa buổi sinh hoạt
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => void handleEditSubmit(e)}
              className="p-5 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tiêu đề buổi sinh hoạt <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tuần sinh hoạt
                  </label>
                  <select
                    value={editWeek}
                    onChange={(e) => {
                      const week = Number(e.target.value);
                      setEditWeek(week);
                      if (editDate) {
                        const shifted = shiftDateIntoWeek(editDate, week, semesterStartRaw, internshipStartWeek);
                        if (shifted) setEditDate(toDateTimeLocalValue(new Date(shifted)));
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white outline-none cursor-pointer font-medium"
                  >
                    {PREP_WEEKS.map((week) => (
                      <option key={week} value={week}>{weekOptionLabel(week)}</option>
                    ))}
                    {Array.from({ length: totalWeeks }, (_, index) => index + 1).map((week) => (
                      <option key={week} value={week}>{weekOptionLabel(week)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Thời gian bắt đầu
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editDate}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEditDate(value);
                      if (value && semesterStartRaw) {
                        const derived = relativeWeekFromMeetingDate(
                          new Date(value), semesterStartRaw, totalWeeks, internshipStartWeek,
                        );
                        if (derived !== null) setEditWeek(derived);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Thời lượng (số tiết)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={editPeriods}
                    onChange={(e) =>
                      setEditPeriods(Number(e.target.value) || 1)
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    1 tiết = 45 phút → {((Number(editPeriods) || 1) * 45)} phút
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Địa điểm / Link phòng họp
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Trạng thái
                </label>
                <select
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(
                      e.target.value as "Scheduled" | "Completed" | "Cancelled"
                    )
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white outline-none cursor-pointer font-medium"
                >
                  <option value="Scheduled">Sắp diễn ra (Scheduled)</option>
                  <option value="Completed">Đã hoàn thành (Completed)</option>
                  <option value="Cancelled">Đã hủy (Cancelled)</option>
                </select>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-md border border-amber-200 bg-amber-50/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsGeneral}
                  onChange={(e) => setEditIsGeneral(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-xs leading-5">
                  <strong className="text-amber-800">Buổi hướng dẫn chung (sinh hoạt lớp)</strong>
                  <span className="block text-slate-600 mt-0.5">
                    Điểm danh PHỤ — không bắt buộc: vắng buổi này KHÔNG tính vào số buổi vắng ảnh hưởng điều kiện dự thi.
                  </span>
                </span>
              </label>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mô tả / Nội dung chi tiết
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-1.5 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {isUpdating ? "Đang lưu…" : "Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xác nhận xóa buổi sinh hoạt"
        description={`Bạn có chắc muốn xóa buổi sinh hoạt "${deleteTarget?.title}" không? Dữ liệu điểm danh của buổi này sẽ bị xóa khỏi hệ thống.`}
        confirmLabel={isDeleting ? "Đang xóa…" : "Xóa buổi sinh hoạt"}
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
