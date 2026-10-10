import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileCheck2,
  Upload,
  Download,
  Eye,
  FileText,
  Clock,
  MessageSquare,
  FileUp,
  Search,
  X,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";
import { useSemester } from "../../../contexts/SemesterContext";
import { SkeletonBox } from "../../../components/common/SkeletonLoader";
import { RequestErrorState } from "../../../components/common/RequestErrorState";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { weeklyReportService } from "../../../services/weeklyReport.service";
import {
  useStudentWeeklyReportsQuery,
  type WeeklyReportRow,
} from "../../../hooks/useStudentWeeklyReportsQuery";
import { INTERNSHIP_WEEKS } from "../../../config/internship";
import { StudentSubPageHeader } from "../components/StudentSubPageHeader";

export const WeeklyReportsView = ({
  onShowToast,
}: {
  onShowToast?: (msg: string, type?: "success" | "error" | "info" | string) => void;
}) => {
  const navigate = useNavigate();
  const { internshipId, profile, refresh: refreshProfile } = useStudentPortal();
  const { selectedSemester } = useSemester();

  const totalWeeks = selectedSemester.totalWeeks || INTERNSHIP_WEEKS;
  // Đồng bộ tuần theo lịch học kỳ trường: tuần HK = tuần thực tập + (InternshipStartWeek - 1).
  const internshipStartWeek = selectedSemester.internshipStartWeek || 1;
  const showSemesterWeek = internshipStartWeek > 1;
  const semWeek = (week: number) => week + internshipStartWeek - 1;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedPdfFile, setSelectedPdfFile] = useState<{
    name: string;
    size: string;
    time: string;
    file: File;
  } | null>(null);
  const [previewReport, setPreviewReport] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [showRequirementModal, setShowRequirementModal] = useState(false);

  const {
    reports,
    schedules,
    isLoading: isLoadingApi,
    isFetching,
    isError,
    error,
    refetch,
    submitReport,
    isSubmitting: isSubmittingQuery,
    cancelSubmission,
    isCancelling,
  } = useStudentWeeklyReportsQuery({
    semesterId: selectedSemester?.id,
  });

  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const isSubmitting = isSubmittingManual || isSubmittingQuery;
  const [isDragging, setIsDragging] = useState(false);

  const handleRefresh = async () => {
    try {
      await refreshProfile();
      await refetch();
      onShowToast?.("Đã làm mới danh sách báo cáo tuần thành công", "success");
    } catch {
      // Handled in query
    }
  };

  const requiredSchedules = useMemo(
    () =>
      schedules.filter(
        (schedule) =>
          schedule.weekNumber <= totalWeeks && schedule.isSubmissionOpen,
      ),
    [schedules, totalWeeks],
  );
  const requiredWeekCount = requiredSchedules.length || totalWeeks;

  const suggestedWeek = useMemo(() => {
    const openSchedules = [...requiredSchedules].sort(
      (a, b) => a.weekNumber - b.weekNumber,
    );
    if (openSchedules.length === 0) {
      return (
        reports.find((report) => report.status !== "Đã hoàn thành")?.weekNumber ??
        reports[0]?.weekNumber ??
        1
      );
    }

    const now = Date.now();
    const currentSchedule = openSchedules.find((schedule) => {
      const start = schedule.startDate ? new Date(schedule.startDate).getTime() : Number.NaN;
      const due = new Date(schedule.dueDate).getTime();
      return Number.isFinite(start) && Number.isFinite(due) && start <= now && now <= due;
    });
    if (currentSchedule) return currentSchedule.weekNumber;

    const upcomingSchedule = openSchedules
      .filter((schedule) => new Date(schedule.dueDate).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      )[0];
    if (upcomingSchedule) return upcomingSchedule.weekNumber;

    const firstIncompleteSchedule = openSchedules.find((schedule) => {
      const report = reports.find((item) => item.weekNumber === schedule.weekNumber);
      return !report || report.status !== "Đã hoàn thành";
    });
    if (firstIncompleteSchedule) return firstIncompleteSchedule.weekNumber;

    return openSchedules[openSchedules.length - 1]?.weekNumber ?? 1;
  }, [requiredSchedules, reports]);

  useEffect(() => {
    setSelectedWeek(suggestedWeek);
  }, [suggestedWeek]);

  const handleCancelSubmission = async () => {
    if (!currentReport.id || isCancelling) return;
    if (!window.confirm("Bạn có chắc muốn hủy nộp báo cáo tuần này? File đã tải lên sẽ bị xóa.")) {
      return;
    }
    try {
      await cancelSubmission(currentReport.id);
      setSelectedPdfFile(null);
      onShowToast?.("Đã hủy nộp báo cáo và xóa file tải lên.", "success");
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    }
  };

  const emptyWeek = (week: number): WeeklyReportRow => ({
    weekNumber: week,
    title: `Báo cáo tuần ${week}`,
    content: "",
    deadline: "—",
    submittedAt: null,
    version: "v0.0",
    status: "Chưa nộp",
    stepIndex: 0,
    versions: [],
    allowLateSubmission: true,
  });

  const allWeekRows = useMemo(
    () => {
      const weekNumbers = new Set(
        requiredSchedules.length > 0
          ? requiredSchedules.map((schedule) => schedule.weekNumber)
          : Array.from({ length: totalWeeks }, (_, i) => i + 1),
      );
      reports.forEach((report) => weekNumbers.add(report.weekNumber));

      return [...weekNumbers].sort((a, b) => a - b).map((week) => {
        const existing = reports.find((r) => r.weekNumber === week);
        const schedule = schedules.find((s) => s.weekNumber === week);
        const deadline = schedule?.dueDate
          ? new Date(schedule.dueDate).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—";

        if (existing) {
          return {
            ...existing,
            deadline: schedule?.dueDate ? deadline : existing.deadline,
            allowLateSubmission: schedule ? schedule.allowLateSubmission : true,
            scheduleDueDate: schedule?.dueDate,
            scheduleStartDate: schedule?.startDate,
          };
        }
        return {
          ...emptyWeek(week),
          deadline,
          allowLateSubmission: schedule ? schedule.allowLateSubmission : true,
          scheduleDueDate: schedule?.dueDate,
          scheduleStartDate: schedule?.startDate,
        };
      });
    },
    [reports, totalWeeks, schedules, requiredSchedules],
  );

  const currentReport =
    allWeekRows.find((r) => r.weekNumber === selectedWeek) ??
    emptyWeek(selectedWeek);

  const versionHistory = useMemo(() => {
    if (!currentReport.submittedAt && currentReport.status === "Chưa nộp") {
      return [];
    }
    const versions = currentReport.versions ?? [];
    return versions.length > 0
      ? versions.map((version) => ({
          id: version.id,
          version: `v${version.version}`,
          submittedAt: new Date(version.uploadedAt).toLocaleDateString("vi-VN"),
          fileName: version.fileName,
          fileSize: `${(version.fileSize / (1024 * 1024)).toFixed(1)} MB`,
          status:
            version.version === currentReport.versions?.[0]?.version
              ? currentReport.status
              : "Bản trước",
          feedback: currentReport.feedback,
        }))
      : [
          {
            id: undefined,
            version: currentReport.version,
            submittedAt: currentReport.submittedAt ?? "—",
            fileName: currentReport.fileName ?? currentReport.title,
            fileSize: currentReport.fileSize ?? "—",
            status: currentReport.status,
            feedback: currentReport.feedback,
          },
        ];
  }, [currentReport]);

  const nextPendingWeek = allWeekRows.find(
    (r) => r.status === "Chưa nộp" || r.status === "Cần chỉnh sửa",
  );

  const approvedCount = reports.filter((r) => r.status === "Đã hoàn thành").length;
  const needsRevisionCount = reports.filter((r) => r.status === "Cần chỉnh sửa").length;
  const submittedCount = reports.filter((r) => r.status === "Đang xem xét").length;
  const completionRate =
    requiredWeekCount > 0
      ? Math.round((approvedCount / requiredWeekCount) * 100)
      : 0;

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      onShowToast?.("Hệ thống chỉ chấp nhận định dạng file PDF (.pdf)!", "error");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      onShowToast?.("Dung lượng file vượt quá giới hạn 20MB!", "error");
      return;
    }
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setSelectedPdfFile({
      name: file.name,
      size: `${sizeMb} MB`,
      time: "Vừa chọn",
      file,
    });
    onShowToast?.(`Đã chọn file: ${file.name}`, "info");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      onShowToast?.("Hệ thống chỉ chấp nhận định dạng file PDF (.pdf)!", "error");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      onShowToast?.("Dung lượng file vượt quá giới hạn 20MB!", "error");
      return;
    }
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setSelectedPdfFile({
      name: file.name,
      size: `${sizeMb} MB`,
      time: "Vừa kéo thả",
      file,
    });
    onShowToast?.(`Đã nhận file: ${file.name}`, "info");
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSubmitPdf = async () => {
    if (!selectedPdfFile) {
      onShowToast?.("Vui lòng chọn file PDF trước khi nộp báo cáo.", "info");
      return;
    }

    if (!internshipId) {
      onShowToast?.("Chưa có kỳ thực tập — vui lòng liên hệ phòng đào tạo.", "error");
      return;
    }

    const editable =
      !currentReport.id ||
      currentReport.status === "Bản nháp" ||
      currentReport.status === "Cần chỉnh sửa" ||
      currentReport.status === "Chưa nộp";

    if (!editable) {
      onShowToast?.("Báo cáo tuần này không thể nộp lại ở trạng thái hiện tại.", "error");
      return;
    }

    setIsSubmittingManual(true);
    try {
      await submitReport({
        internshipId,
        weekNumber: selectedWeek,
        title: currentReport.title || `Báo cáo tuần ${selectedWeek}`,
        file: selectedPdfFile.file,
        reportId: currentReport.id,
      });
      setSelectedPdfFile(null);
      onShowToast?.(`Đã nộp báo cáo tuần ${selectedWeek} lên hệ thống thành công.`, "success");
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleDownloadReport = async (versionId?: string, fileName?: string) => {
    if (!currentReport.id || !currentReport.fileName) {
      onShowToast?.("Báo cáo này chưa có file để tải xuống.", "info");
      return;
    }
    try {
      const { blob, filename } = versionId
        ? await weeklyReportService.downloadVersion(
            versionId,
            fileName ?? currentReport.fileName,
          )
        : await weeklyReportService.download(
            currentReport.id,
            fileName ?? currentReport.fileName,
          );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    }
  };

  const handlePreviewReport = async (versionId?: string, fileName?: string) => {
    if (!currentReport.id || !currentReport.fileName) {
      onShowToast?.("Báo cáo này chưa có file để xem trước.", "info");
      return;
    }
    try {
      const { blob, filename } = versionId
        ? await weeklyReportService.downloadVersion(
            versionId,
            fileName ?? currentReport.fileName,
          )
        : await weeklyReportService.download(
            currentReport.id,
            fileName ?? currentReport.fileName,
          );
      if (blob.type !== "application/pdf") {
        onShowToast?.("Chỉ hỗ trợ xem trước file PDF.", "info");
        return;
      }
      if (previewReport) URL.revokeObjectURL(previewReport.url);
      setPreviewReport({ url: URL.createObjectURL(blob), name: filename });
    } catch (err) {
      onShowToast?.(getApiErrorMessage(err), "error");
    }
  };

  const filteredReports = allWeekRows.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.weekNumber.toString().includes(searchQuery);
    const matchesStatus =
      statusFilter === "Tất cả" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 animate-in fade-in duration-200 font-sans pb-12">
      {/* 1. TOP CARD BANNER (Chuẩn layout banner xanh #026aa7 + thông tin thực tế) */}
      <div className="space-y-3">
        <StudentSubPageHeader
          icon={FileCheck2}
          title="Báo cáo thực tập tuần"
          subtitle="Gửi và theo dõi các báo cáo thực tập theo tuần."
          semesterName={selectedSemester?.name}
          onRefresh={() => void handleRefresh()}
          isRefreshing={isFetching}
        >
          <button
            type="button"
            onClick={() => setShowRequirementModal(true)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>Quy định nộp</span>
          </button>
        </StudentSubPageHeader>


      </div>

      {/* 2. KPI OVERVIEW CARDS (Chuẩn design system thẻ bo tròn đồng bộ) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tiến độ hoàn thành */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between transition-all hover:border-blue-300">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Tiến độ nộp báo cáo
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <FileCheck2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {completionRate}%
              </span>
              <span className="text-xs font-semibold text-blue-700">
                {approvedCount}/{requiredWeekCount} tuần
              </span>
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-500 pt-3 border-t border-slate-100 mt-3 flex items-center justify-between">
            <span>{approvedCount} báo cáo đã duyệt</span>
            <span className="text-slate-400 text-[10px]">
              Yêu cầu {requiredWeekCount} tuần
            </span>
          </div>
        </div>

        {/* KPI 2: Đã hoàn thành */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between transition-all hover:border-emerald-300">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Đã hoàn thành
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
                {approvedCount}
              </span>
              <span className="text-xs font-bold text-slate-500">báo cáo</span>
            </div>
          </div>
          <div className="text-[11px] font-medium text-emerald-700 pt-3 border-t border-slate-100 mt-3 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>
              {completionRate >= 100
                ? "Đã hoàn thành toàn bộ tuần"
                : `Còn ${Math.max(0, requiredWeekCount - approvedCount)} tuần cần nộp`}
            </span>
          </div>
        </div>

        {/* KPI 3: Cần chỉnh sửa / Chờ duyệt */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between transition-all hover:border-rose-300">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Chờ duyệt / Cần sửa
              </span>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  needsRevisionCount > 0
                    ? "bg-rose-50 text-rose-700"
                    : submittedCount > 0
                    ? "bg-sky-50 text-sky-700"
                    : "bg-slate-50 text-slate-600"
                }`}
              >
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl sm:text-3xl font-extrabold ${
                  needsRevisionCount > 0
                    ? "text-rose-600"
                    : submittedCount > 0
                    ? "text-sky-700"
                    : "text-slate-800"
                }`}
              >
                {needsRevisionCount + submittedCount}
              </span>
              <span className="text-xs font-bold text-slate-500">báo cáo</span>
            </div>
          </div>
          <div
            className={`text-[11px] font-medium pt-3 border-t border-slate-100 mt-3 flex items-center gap-1 ${
              needsRevisionCount > 0
                ? "text-rose-700"
                : submittedCount > 0
                ? "text-sky-700"
                : "text-slate-500"
            }`}
          >
            {needsRevisionCount > 0 ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{needsRevisionCount} bài cần chỉnh sửa nộp lại</span>
              </>
            ) : submittedCount > 0 ? (
              <>
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{submittedCount} bài đang chờ GV phản hồi</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Không có bài nào bị yêu cầu sửa</span>
              </>
            )}
          </div>
        </div>

        {/* KPI 4: Tuần cần nộp tiếp theo */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between transition-all hover:border-amber-300">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Tuần cần nộp kế tiếp
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {nextPendingWeek ? `Tuần ${nextPendingWeek.weekNumber}` : "Đầy đủ"}
              </span>
              {nextPendingWeek && showSemesterWeek && (
                <span className="text-xs font-semibold text-slate-400">
                  (HK {semWeek(nextPendingWeek.weekNumber)})
                </span>
              )}
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-500 pt-3 border-t border-slate-100 mt-3 flex items-center gap-1 truncate">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">
              {nextPendingWeek
                ? nextPendingWeek.deadline !== "—"
                  ? `Hạn: ${nextPendingWeek.deadline}`
                  : "Theo tiến độ thực tập"
                : "Đã hoàn thành tất cả tuần"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: BẢNG BÁO CÁO & KHU VỰC NỘP BÀI */}
      {isLoadingApi && reports.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200/90 shadow-2xs">
          <Loader2 className="w-8 h-8 animate-spin text-[#026aa7] mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">
            Đang tải dữ liệu báo cáo tuần và lịch nộp...
          </p>
        </div>
      ) : isError && reports.length === 0 ? (
        <RequestErrorState
          title="Không thể tải báo cáo tuần"
          message={error instanceof Error ? error.message : "Lỗi kết nối máy chủ"}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* CỘT TRÁI (2/3): DANH SÁCH BÁO CÁO & KHU VỰC NỘP BÀI TUẦN ĐANG CHỌN */}
          <div className="lg:col-span-2 space-y-4">
            {/* CARD 1: DANH SÁCH BÁO CÁO CÁC TUẦN */}
            <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
              {/* Header card */}
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-[#026aa7]" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Danh sách báo cáo các tuần
                  </h3>
                  <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                    {requiredWeekCount} tuần
                  </span>
                </div>

                <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-44">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm tuần/tiêu đề..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-xs outline-none"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:w-auto bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="Tất cả">Tất cả trạng thái</option>
                    <option value="Đã hoàn thành">Đã hoàn thành</option>
                    <option value="Cần chỉnh sửa">Cần chỉnh sửa</option>
                    <option value="Đang xem xét">Đang xem xét</option>
                    <option value="Chưa nộp">Chưa nộp</option>
                  </select>
                </div>
              </div>

              {/* Bảng danh sách báo cáo trên Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4 w-20">Tuần</th>
                      <th className="py-3 px-4">Nội dung báo cáo</th>
                      <th className="py-3 px-4 w-36">Hạn nộp</th>
                      <th className="py-3 px-4 w-32">Trạng thái</th>
                      <th className="py-3 px-4 text-right w-24">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingApi ? (
                      Array.from({ length: 6 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td className="py-3 px-4"><SkeletonBox className="h-4 w-12" /></td>
                          <td className="py-3 px-4"><SkeletonBox className="h-4 w-40" /></td>
                          <td className="py-3 px-4"><SkeletonBox className="h-4 w-24" /></td>
                          <td className="py-3 px-4"><SkeletonBox className="h-5 w-20 rounded-md" /></td>
                          <td className="py-3 px-4 text-right"><SkeletonBox className="h-6 w-14 rounded-lg ml-auto" /></td>
                        </tr>
                      ))
                    ) : filteredReports.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          Không tìm thấy báo cáo tuần nào phù hợp với bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      filteredReports.map((rep) => {
                        const isSelected = rep.weekNumber === selectedWeek;
                        return (
                          <tr
                            key={rep.weekNumber}
                            className={`transition-colors ${
                              isSelected
                                ? "bg-blue-50/70 border-l-4 border-l-[#026aa7] font-medium"
                                : "hover:bg-slate-50/70"
                            }`}
                          >
                            <td className="py-3 px-4 font-bold text-blue-700 whitespace-nowrap">
                              Tuần {rep.weekNumber}
                              {showSemesterWeek && (
                                <span className="block text-[10px] font-semibold text-slate-400">
                                  HK tuần {semWeek(rep.weekNumber)}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-800 line-clamp-1">
                                {rep.title}
                              </p>
                              {rep.fileName && (
                                <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5 truncate">
                                  <FileText className="w-3 h-3 text-blue-600 shrink-0" />
                                  <span className="truncate">{rep.fileName}</span>
                                  <span className="shrink-0 text-slate-400">({rep.fileSize})</span>
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                              <div>{rep.deadline}</div>
                              {rep.scheduleDueDate &&
                                new Date() > new Date(rep.scheduleDueDate) && (
                                  <span
                                    className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                      rep.allowLateSubmission
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-rose-100 text-rose-800"
                                    }`}
                                  >
                                    {rep.allowLateSubmission ? "Nộp trễ" : "Hết hạn"}
                                  </span>
                                )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold inline-block border ${
                                  rep.status === "Đã hoàn thành"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : rep.status === "Cần chỉnh sửa"
                                    ? "bg-rose-50 text-rose-800 border-rose-200"
                                    : rep.status === "Đang xem xét"
                                    ? "bg-sky-50 text-sky-800 border-sky-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                {rep.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <button
                                onClick={() => setSelectedWeek(rep.weekNumber)}
                                className={`px-3 py-1 font-bold text-xs rounded-lg transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-[#026aa7] text-white shadow-xs"
                                    : "bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200"
                                }`}
                              >
                                {isSelected ? "Đang chọn" : "Chọn nộp"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Cards */}
              <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
                {filteredReports.map((rep) => {
                  const isSelected = rep.weekNumber === selectedWeek;
                  return (
                    <div
                      key={rep.weekNumber}
                      onClick={() => setSelectedWeek(rep.weekNumber)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? "border-blue-400 bg-blue-50/50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-blue-700">
                          Tuần {rep.weekNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            rep.status === "Đã hoàn thành"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : rep.status === "Cần chỉnh sửa"
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {rep.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-xs mt-1">
                        {rep.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Hạn: {rep.deadline}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CARD 2: KHU VỰC NỘP BÀI (Tuần đang chọn) */}
            <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                    Khu vực nộp bài
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    Tuần {selectedWeek}: {currentReport.title}
                    {showSemesterWeek && (
                      <span className="ml-2 align-middle px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-500 border border-slate-200">
                        HK tuần {semWeek(selectedWeek)}
                      </span>
                    )}
                  </h3>
                  {currentReport.deadline !== "—" && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Hạn nộp:{" "}
                      <strong className="text-slate-700">
                        {currentReport.deadline}
                      </strong>
                      {currentReport.scheduleDueDate &&
                        new Date() > new Date(currentReport.scheduleDueDate) && (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ml-1 ${
                              currentReport.allowLateSubmission
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-rose-100 text-rose-800 border border-rose-200"
                            }`}
                          >
                            {currentReport.allowLateSubmission
                              ? "Cho phép nộp trễ"
                              : "Đã khóa nộp"}
                          </span>
                        )}
                    </p>
                  )}
                </div>
                <div>
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                      currentReport.status === "Đã hoàn thành"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : currentReport.status === "Cần chỉnh sửa"
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : currentReport.status === "Đang xem xét"
                        ? "bg-sky-50 text-sky-800 border-sky-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {currentReport.status}
                  </span>
                </div>
              </div>

              {/* Nhận xét từ GVHD nếu có */}
              {currentReport.feedback && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <MessageSquare className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      Nhận xét từ Giảng viên ({currentReport.feedbackDate || "Gần đây"}):
                    </span>
                  </div>
                  <p className="text-slate-800 font-medium leading-relaxed bg-white/80 p-3 rounded-lg border border-amber-200/60 italic">
                    "{currentReport.feedback}"
                  </p>
                </div>
              )}

              {currentReport.id && currentReport.fileName && (
                <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-100 font-bold text-rose-700">
                      PDF
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800" title={currentReport.fileName}>
                        {currentReport.fileName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {currentReport.fileSize ?? "—"}
                        {currentReport.submittedAt && currentReport.submittedAt !== "—"
                          ? ` · Đã nộp ${currentReport.submittedAt}`
                          : ""}
                      </p>
                      {currentReport.status === "Đã hoàn thành" && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Đã được giảng viên duyệt — tuần này hoàn thành
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => void handlePreviewReport(undefined, currentReport.fileName)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      Xem
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDownloadReport(undefined, currentReport.fileName)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Tải về
                    </button>
                    {currentReport.status !== "Đã hoàn thành" && (
                      <button
                        type="button"
                        onClick={() => void handleCancelSubmission()}
                        disabled={isCancelling}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isCancelling ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <X className="h-4 w-4" aria-hidden="true" />
                        )}
                        {isCancelling ? "Đang hủy..." : "Hủy nộp"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Trạng thái kỳ thực tập đã đóng hoặc khóa nộp */}
              {selectedSemester.status === "completed" ? (
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Kỳ thực tập đã kết thúc
                    </h4>
                    <p className="mt-1">
                      Hệ thống đã đóng tiếp nhận báo cáo. Toàn bộ báo cáo tuần hiện ở chế độ chỉ xem.
                    </p>
                  </div>
                </div>
              ) : currentReport.scheduleStartDate &&
                new Date() < new Date(currentReport.scheduleStartDate) &&
                (currentReport.status === "Chưa nộp" ||
                  currentReport.status === "Cần chỉnh sửa") ? (
                <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-800">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                  <div>
                    <h4 className="text-sm font-bold">Chưa đến thời gian mở nộp</h4>
                    <p className="mt-1">
                      Thời hạn mở nhận báo cáo từ{" "}
                      {new Date(currentReport.scheduleStartDate).toLocaleString("vi-VN")}.
                    </p>
                  </div>
                </div>
              ) : currentReport.scheduleDueDate &&
                new Date() > new Date(currentReport.scheduleDueDate) &&
                currentReport.allowLateSubmission === false &&
                (currentReport.status === "Chưa nộp" ||
                  currentReport.status === "Cần chỉnh sửa") ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-rose-900 text-sm">
                      Hạn nộp báo cáo tuần này đã kết thúc
                    </h4>
                    <p className="leading-relaxed text-rose-700">
                      Thời hạn nộp báo cáo tuần {selectedWeek} đã kết thúc vào lúc {currentReport.deadline}. Học kỳ hiện tại không cho phép nộp trễ hạn. Vui lòng liên hệ Giảng viên hướng dẫn để được hỗ trợ.
                    </p>
                  </div>
                </div>
              ) : currentReport.status === "Đã hoàn thành" ? (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <div>
                    <h4 className="text-sm font-bold">Báo cáo tuần đã hoàn thành</h4>
                    <p className="mt-1">Giảng viên đã duyệt báo cáo này. Không thể hủy nộp hoặc thay đổi file.</p>
                  </div>
                </div>
              ) : currentReport.status === "Đã nộp" || currentReport.status === "Đã xem" ? (
                <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-800">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" aria-hidden="true" />
                  <div>
                    <h4 className="text-sm font-bold">Báo cáo đang chờ giảng viên xử lý</h4>
                    <p className="mt-1">Bạn có thể hủy nộp nếu giảng viên chưa duyệt. File sẽ được xóa khỏi hệ thống.</p>
                  </div>
                </div>
              ) : (
                /* Drag & Drop Upload Zone */
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                  <div
                    onClick={handleFileSelect}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed ${
                      isDragging
                        ? "border-blue-500 bg-blue-50/60 scale-[1.01]"
                        : "border-slate-300 hover:border-[#026aa7] bg-slate-50/60 hover:bg-blue-50/30"
                    } p-6 sm:p-8 text-center rounded-xl cursor-pointer transition-all space-y-2`}
                  >
                    <div className="w-11 h-11 bg-blue-50 text-[#026aa7] rounded-xl flex items-center justify-center mx-auto shadow-2xs">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Bấm để chọn file PDF hoặc kéo thả file báo cáo vào đây
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        Chỉ chấp nhận định dạng <strong>PDF (.pdf)</strong> • Dung lượng tối đa <strong>20MB</strong>
                      </p>
                    </div>
                  </div>

                  {/* Selected PDF file card */}
                  {selectedPdfFile && (
                    <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center shrink-0 border border-rose-200">
                          PDF
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 truncate">
                            {selectedPdfFile.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {selectedPdfFile.size} • {selectedPdfFile.time}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={handleFileSelect}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          Đổi file khác
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmitPdf}
                          disabled={isSubmitting}
                          className="px-4 py-1.5 bg-[#026aa7] hover:bg-[#025a8f] disabled:opacity-60 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          {isSubmitting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileUp className="w-3.5 h-3.5" />
                          )}
                          <span>{isSubmitting ? "Đang tải lên..." : "Nộp báo cáo ngay"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI (1/3): LỊCH SỬ NỘP BẢN VÀ THÔNG TIN GVHD */}
          <div className="lg:col-span-1 space-y-4">
            {/* CARD 1: LỊCH SỬ NỘP TUẦN NÀY */}
            <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Lịch sử nộp (Tuần {selectedWeek})
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                {versionHistory.length === 0 ? (
                  <p className="text-slate-400 py-6 text-center text-xs">
                    Chưa có lịch sử nộp cho tuần này
                  </p>
                ) : (
                  versionHistory.map((ver, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/90 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px] border border-blue-200">
                          {ver.version}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {ver.submittedAt}
                        </span>
                      </div>
                      <p className="font-medium text-slate-800 truncate" title={ver.fileName}>
                        {ver.fileName}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                        <span className="text-[10px] font-bold text-slate-500">
                          {ver.status}
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handlePreviewReport(ver.id, ver.fileName)}
                            className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Xem
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadReport(ver.id, ver.fileName)}
                            className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Tải về
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* CARD 2: THÔNG TIN HƯỚNG DẪN & BIỂU MẪU */}
            <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                Thông tin Hướng dẫn
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/70 space-y-1">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                    Giảng viên hướng dẫn
                  </span>
                  <p className="font-bold text-slate-900 text-sm">
                    {profile.lecturerName && profile.lecturerName !== "—"
                      ? profile.lecturerName
                      : "Chưa phân công"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Liên hệ qua hệ thống hoặc trao đổi trong các buổi gặp định kỳ
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/student/templates")}
                  className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
                >
                  <FileText className="w-4 h-4 text-slate-500" /> Xem mẫu báo cáo chuẩn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW REPORT MODAL */}
      {previewReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> {previewReport.name}
              </h3>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(previewReport.url);
                  setPreviewReport(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
                aria-label="Đóng xem trước"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe
              src={previewReport.url}
              title={`Xem trước ${previewReport.name}`}
              className="min-h-0 flex-1 w-full bg-slate-100"
            />
          </div>
        </div>
      )}

      {/* REQUIREMENTS MODAL */}
      {showRequirementModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Quy định nộp Báo cáo tuần
              </h3>
              <button
                type="button"
                onClick={() => setShowRequirementModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 font-medium">
              <div>
                <p className="font-bold text-slate-900 mb-1">1. Quy định file báo cáo:</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-slate-600">
                  <li>Soạn thảo bằng Microsoft Word theo biểu mẫu chuẩn của Khoa.</li>
                  <li>Xuất file định dạng <strong>PDF (.pdf)</strong> trước khi nộp lên hệ thống. Dung lượng dưới 20MB.</li>
                  <li>
                    Cấu trúc tên file:{" "}
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-blue-700">
                      BaoCao_Tuan[X]_[MSSV]_[HoTen].pdf
                    </code>
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-1">2. Thời hạn nộp & Đánh giá:</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-slate-600">
                  <li>Nộp trước 23:59 Chủ nhật hàng tuần hoặc theo thời hạn cụ thể của từng tuần.</li>
                  <li>Giảng viên hướng dẫn sẽ phản hồi và chấm rubric chất lượng hàng tuần.</li>
                  <li>Nếu có yêu cầu chỉnh sửa, sinh viên cần cập nhật và nộp lại bản sửa trước hạn quy định.</li>
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRequirementModal(false)}
                className="px-4 py-2 bg-[#026aa7] hover:bg-[#025a8f] text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { WeeklyReportsView as StudentWeeklyReportsView };
