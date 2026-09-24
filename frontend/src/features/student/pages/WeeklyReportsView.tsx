import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
} from "lucide-react";
import { useStudentPortal } from "../../../contexts/StudentPortalContext";
import { useSemester } from "../../../contexts/SemesterContext";
import { PageHeader } from "../../../components/common/PageHeader";
import { Panel } from "../../../components/common/Panel";
import { Toolbar } from "../../../components/common/Toolbar";
import { EmptyState } from "../../../components/common/EmptyState";
import { SkeletonBox } from "../../../components/common/SkeletonLoader";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { mapWeeklyReportDtoToUi } from "../../../lib/portalMappers";
import { weeklyReportService } from "../../../services/weeklyReport.service";
import { semesterReportScheduleService, type SemesterReportScheduleDto } from "../../../services/semesterReportSchedule.service";
import { INTERNSHIP_WEEKS } from "../../../config/internship";

type WeeklyReportRow = {
  id?: string;
  internshipId?: string;
  weekNumber: number;
  title: string;
  content?: string;
  deadline: string;
  allowLateSubmission?: boolean;
  scheduleDueDate?: string;
  submittedAt: string | null;
  version: string;
  status: string;
  fileName?: string;
  fileSize?: string;
  versions?: {
    id: string;
    version: number;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
  }[];
  feedback?: string;
  feedbackDate?: string;
  stepIndex: number;
};

export const WeeklyReportsView = ({ onShowToast }: { onShowToast: (msg: string) => void }) => {
  const navigate = useNavigate();
  const { internshipId, profile } = useStudentPortal();
  const { selectedSemester } = useSemester();
  const totalWeeks = selectedSemester.totalWeeks || INTERNSHIP_WEEKS;
  // Đồng bộ tuần theo lịch học kỳ trường: tuần HK = tuần thực tập + (InternshipStartWeek - 1).
  // vd InternshipStartWeek = 14 → báo cáo tuần 1..6 rơi vào HK tuần 14..19.
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
  const [reports, setReports] = useState<WeeklyReportRow[]>([]);
  const [schedules, setSchedules] = useState<SemesterReportScheduleDto[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const requiredSchedules = useMemo(
    () => schedules.filter((schedule) => schedule.weekNumber <= totalWeeks && schedule.isSubmissionOpen),
    [schedules, totalWeeks],
  );
  const requiredWeekCount = requiredSchedules.length || totalWeeks;

  useEffect(() => {
    if (selectedSemester?.id) {
      semesterReportScheduleService
        .getSchedules(selectedSemester.id)
        .then((res) => setSchedules(res))
        .catch(() => {});
    }
  }, [selectedSemester?.id]);

  const reloadReports = useCallback(async () => {
    const rows = await weeklyReportService.getMine();
    const mapped: WeeklyReportRow[] = rows.map(mapWeeklyReportDtoToUi);
    setReports(mapped);
    return mapped;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingApi(true);
      try {
        const mapped = await reloadReports();
        if (!cancelled && mapped.length > 0) {
          setSelectedWeek(mapped[mapped.length - 1].weekNumber);
        }
      } catch (err) {
        if (!cancelled) onShowToast?.(getApiErrorMessage(err));
      } finally {
        if (!cancelled) setIsLoadingApi(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onShowToast, reloadReports]);

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
    () =>
      (requiredSchedules.length > 0 ? requiredSchedules.map((schedule) => schedule.weekNumber) : Array.from({ length: totalWeeks }, (_, i) => i + 1)).map((week) => {
        const existing = reports.find((r) => r.weekNumber === week);
        const schedule = schedules.find((s) => s.weekNumber === week);
        const deadline = schedule?.dueDate
          ? new Date(schedule.dueDate).toLocaleString("vi-VN", {
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
            deadline: existing.deadline && existing.deadline !== "—" ? existing.deadline : deadline,
            allowLateSubmission: schedule ? schedule.allowLateSubmission : true,
            scheduleDueDate: schedule?.dueDate,
          };
        }
        return {
          ...emptyWeek(week),
          deadline,
          allowLateSubmission: schedule ? schedule.allowLateSubmission : true,
          scheduleDueDate: schedule?.dueDate,
        };
      }),
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
          status: version.version === currentReport.versions?.[0]?.version
            ? currentReport.status
            : "Bản trước",
          feedback: currentReport.feedback,
        }))
      : [{
          id: undefined,
          version: currentReport.version,
          submittedAt: currentReport.submittedAt ?? "—",
          fileName: currentReport.fileName ?? currentReport.title,
          fileSize: currentReport.fileSize ?? "—",
          status: currentReport.status,
          feedback: currentReport.feedback,
        }];
  }, [currentReport]);

  const nextPendingWeek = allWeekRows.find(
    (r) => r.status === "Chưa nộp" || r.status === "Cần chỉnh sửa",
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      onShowToast("Hệ thống chỉ chấp nhận định dạng file PDF (.pdf)!");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      onShowToast("Dung lượng file vượt quá giới hạn 20MB!");
      return;
    }
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setSelectedPdfFile({
      name: file.name,
      size: `${sizeMb} MB`,
      time: "Vừa chọn",
      file,
    });
    onShowToast(`Đã chọn file: ${file.name}`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      onShowToast("Hệ thống chỉ chấp nhận định dạng file PDF (.pdf)!");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      onShowToast("Dung lượng file vượt quá giới hạn 20MB!");
      return;
    }
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setSelectedPdfFile({
      name: file.name,
      size: `${sizeMb} MB`,
      time: "Vừa kéo thả",
      file,
    });
    onShowToast(`Đã nhận file: ${file.name}`);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };
  const handleSubmitPdf = async () => {
    if (!selectedPdfFile) {
      onShowToast(
        "Vui lòng chọn file PDF trước khi nộp báo cáo.",
      );
      return;
    }

    if (!internshipId) {
      onShowToast("Ch\u01B0a c\u00F3 k\u1EF3 th\u1EF1c t\u1EADp \u2014 li\u00EAn h\u1EC7 ph\u00F2ng \u0111\u00E0o t\u1EA1o.");
      return;
    }

    const editable =
      !currentReport.id ||
      currentReport.status === "B\u1EA3n nh\u00E1p" ||
      currentReport.status === "C\u1EA7n ch\u1EC9nh s\u1EEDa" ||
      currentReport.status === "Ch\u01B0a n\u1ED9p";

    if (!editable) {
      onShowToast("B\u00E1o c\u00E1o tu\u1EA7n n\u00E0y kh\u00F4ng th\u1EC3 n\u1ED9p l\u1EA1i \u1EDF tr\u1EA1ng th\u00E1i hi\u1EC7n t\u1EA1i.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (!currentReport.id) {
        await weeklyReportService.upload({
          internshipId,
          weekNumber: selectedWeek,
          title: currentReport.title || `B\u00E1o c\u00E1o tu\u1EA7n ${selectedWeek}`,
          file: selectedPdfFile.file,
        });
      } else {
        await weeklyReportService.uploadRevision(
          currentReport.id,
          currentReport.title,
          selectedPdfFile.file,
        );
      }
      const refreshed = await reloadReports();
      const refreshedReport = refreshed.find((r) => r.weekNumber === selectedWeek);
      if (refreshedReport?.id) await weeklyReportService.submit(refreshedReport.id);
      await reloadReports();
      setSelectedPdfFile(null);
      onShowToast(`Đã nộp báo cáo tuần ${selectedWeek} lên hệ thống.`);
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDownloadReport = async (versionId?: string, fileName?: string) => {
    if (!currentReport.id || !currentReport.fileName) {
      onShowToast("Báo cáo này chưa có file để tải xuống.");
      return;
    }
    try {
      const { blob, filename } = versionId
        ? await weeklyReportService.downloadVersion(versionId, fileName ?? currentReport.fileName)
        : await weeklyReportService.download(currentReport.id, fileName ?? currentReport.fileName);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };
  const handlePreviewReport = async (versionId?: string, fileName?: string) => {
    if (!currentReport.id || !currentReport.fileName) {
      onShowToast("Báo cáo này chưa có file để xem trước.");
      return;
    }
    try {
      const { blob, filename } = versionId
        ? await weeklyReportService.downloadVersion(versionId, fileName ?? currentReport.fileName)
        : await weeklyReportService.download(currentReport.id, fileName ?? currentReport.fileName);
      if (blob.type !== "application/pdf") {
        onShowToast("Chỉ hỗ trợ xem trước file PDF.");
        return;
      }
      if (previewReport) URL.revokeObjectURL(previewReport.url);
      setPreviewReport({ url: URL.createObjectURL(blob), name: filename });
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };
  const filteredReports = allWeekRows.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.weekNumber.toString().includes(searchQuery);
    const matchesStatus =
      statusFilter === "T\u1EA5t c\u1EA3" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const completedCount = reports.filter(
    (r) => r.status === "\u0110\xE3 ho\xE0n th\xE0nh" && requiredSchedules.some((schedule) => schedule.weekNumber === r.weekNumber),
  ).length;
  return (
    <div className="space-y-5 animate-in fade-in duration-200 max-w-7xl mx-auto">
      <PageHeader
        icon={FileCheck2}
        title="Báo cáo thực tập tuần"
        subtitle="Xem biểu mẫu, theo dõi tiến độ và nộp báo cáo đúng hạn cho Giảng viên hướng dẫn."
        badge={`Tiến độ: ${completedCount} / ${requiredWeekCount} tuần cần nộp`}
        badgeColor="bg-blue-100 text-blue-800 border-blue-200"
        actions={[
          {
            label: "Quy định nộp",
            icon: ShieldCheck,
            onClick: () => setShowRequirementModal(true),
            variant: "secondary",
          },
        ]}
      />

      <Toolbar
        left={
          <span className="text-xs font-semibold text-slate-600">
            <span className="text-slate-900 font-bold">{completedCount}</span> /{" "}
            {requiredWeekCount} tuần cần nộp · Tuần {selectedWeek}{showSemesterWeek ? ` (HK tuần ${semWeek(selectedWeek)})` : ""} đang chọn
          </span>
        }
        right={
          nextPendingWeek ? (
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
              Cần nộp: Tuần {nextPendingWeek.weekNumber}{showSemesterWeek ? ` (HK ${semWeek(nextPendingWeek.weekNumber)})` : ""}
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
              Đủ báo cáo tuần
            </span>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT 2 COLS: REPORTS TABLE & SELECTED WEEK WORKSPACE */}
        <div className="lg:col-span-2 space-y-5">
          {/* WEEKLY REPORTS TABLE CARD */}
          <Panel className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-blue-600" /> Danh sách báo
                  cáo ({requiredWeekCount} tuần cần nộp)
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-40 sm:w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm tuần/tiêu đề..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-md text-xs outline-none"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="Tất cả">Tất cả</option>
                  <option value="Đã hoàn thành">Đã hoàn thành</option>
                  <option value="Cần chỉnh sửa">Cần chỉnh sửa</option>
                  <option value="Đang xem xét">Đang xem xét</option>
                  <option value="Chưa nộp">Chưa nộp</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold">
                    <th className="p-3 w-16">Tuần</th>
                    <th className="p-3">Nội dung báo cáo</th>
                    <th className="p-3 w-28">Hạn nộp</th>
                    <th className="p-3 w-28">Trạng thái</th>
                    <th className="p-3 text-right w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingApi ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="p-3"><SkeletonBox className="h-4 w-12" /></td>
                        <td className="p-3"><SkeletonBox className="h-4 w-40" /></td>
                        <td className="p-3"><SkeletonBox className="h-4 w-20" /></td>
                        <td className="p-3"><SkeletonBox className="h-5 w-20 rounded-md" /></td>
                        <td className="p-3 text-right"><SkeletonBox className="h-6 w-14 rounded-lg ml-auto" /></td>
                      </tr>
                    ))
                  ) : filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4">
                        <EmptyState
                          title="Không tìm thấy báo cáo tuần phù hợp"
                          description="Thử đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm tuần."
                          action={{
                            label: "Xóa bộ lọc",
                            onClick: () => {
                              setSearchQuery("");
                              setStatusFilter("Tất cả");
                            },
                          }}
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((rep) => {
                      const isSelected = rep.weekNumber === selectedWeek;
                      return (
                        <tr
                          key={rep.weekNumber}
                          className={`transition-colors ${isSelected ? "bg-blue-50/60 font-medium" : "hover:bg-slate-50/80"}`}
                        >
                          <td className="p-3 font-bold text-blue-700">
                            Tuần {rep.weekNumber}
                            {showSemesterWeek && (
                              <span className="block text-[10px] font-semibold text-slate-400">
                                HK tuần {semWeek(rep.weekNumber)}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <p className="font-bold text-slate-800 line-clamp-1">
                              {rep.title}
                            </p>
                            {rep.fileName && (
                              <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                <FileText className="w-3 h-3 text-blue-600" />{" "}
                                {rep.fileName} ({rep.fileSize})
                              </p>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 font-medium">
                            <div>{rep.deadline}</div>
                            {rep.scheduleDueDate && new Date() > new Date(rep.scheduleDueDate) && (
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
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold inline-block ${rep.status === "Đã hoàn thành" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : rep.status === "Cần chỉnh sửa" ? "bg-rose-50 text-rose-800 border border-rose-200" : rep.status === "Đang xem xét" ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-slate-100 text-slate-500"}`}
                            >
                              {rep.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedWeek(rep.weekNumber)}
                              className={`px-2.5 py-1 font-bold text-[11px] rounded-lg transition-colors ${isSelected ? "bg-blue-600 text-white" : "bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700"}`}
                            >
                              {isSelected ? "Đang chọn" : "Chọn"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* SELECTED WEEK WORKSPACE CARD */}
          <Panel className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                  Khu vực nộp bài
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  Tuần {selectedWeek}: {currentReport.title}
                  {showSemesterWeek && (
                    <span className="ml-2 align-middle px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-500 border border-slate-200">
                      HK tuần {semWeek(selectedWeek)}
                    </span>
                  )}
                </h2>
                {currentReport.deadline !== "—" && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Hạn nộp: <strong className="text-slate-700">{currentReport.deadline}</strong>
                    {currentReport.scheduleDueDate && new Date() > new Date(currentReport.scheduleDueDate) && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ml-1 ${
                          currentReport.allowLateSubmission
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {currentReport.allowLateSubmission ? "Cho phép nộp trễ" : "Đã khóa nộp"}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <span
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${currentReport.status === "Đã hoàn thành" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : currentReport.status === "Cần chỉnh sửa" ? "bg-rose-50 text-rose-800 border border-rose-200" : "bg-blue-50 text-blue-800 border border-blue-200"}`}
              >
                {currentReport.status}
              </span>
            </div>

            {/* Lecturer Feedback (If present) */}
            {currentReport.feedback && (
              <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-md space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600" />{" "}
                    Nhận xét từ Giảng viên ({currentReport.feedbackDate}):
                  </span>
                </div>
                <p className="text-slate-800 font-medium leading-relaxed bg-white/80 p-3 rounded-lg border border-amber-200/60">
                  "{currentReport.feedback}"
                </p>
              </div>
            )}

            {/* Compact Drag & Drop Upload Zone or Deadline Locked Warning */}
            {currentReport.scheduleDueDate &&
            new Date() > new Date(currentReport.scheduleDueDate) &&
            currentReport.allowLateSubmission === false &&
            (currentReport.status === "Chưa nộp" || currentReport.status === "Cần chỉnh sửa") ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 text-rose-800 text-xs">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-rose-900 text-sm">Hạn nộp báo cáo tuần này đã kết thúc</h4>
                  <p className="leading-relaxed text-rose-700">
                    Thời hạn nộp báo cáo tuần {selectedWeek} đã kết thúc vào lúc {currentReport.deadline}. Học kỳ hiện tại không cho phép nộp trễ hạn. Vui lòng liên hệ giảng viên hướng dẫn để được hỗ trợ.
                  </p>
                </div>
              </div>
            ) : (
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
                      : "border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/30"
                  } p-6 text-center rounded-md cursor-pointer transition-all space-y-2`}
                >
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-md flex items-center justify-center mx-auto">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Bấm để chọn file PDF hoặc kéo thả file báo cáo vào đây
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Định dạng chấp nhận: <strong>PDF (.pdf)</strong> (Dưới 20MB)
                    </p>
                  </div>
                </div>

                {/* Selected PDF file info */}
                {selectedPdfFile && (
                <div className="p-3.5 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                      PDF
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">
                        {selectedPdfFile.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {selectedPdfFile.size} • {selectedPdfFile.time}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleFileSelect}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-200 transition-colors"
                    >
                      Đổi file
                    </button>
                    <button
                      onClick={handleSubmitPdf}
                      disabled={isSubmitting}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileUp className="w-3.5 h-3.5" />
                      )}
                      {isSubmitting ? "Đang nộp…" : "Nộp báo cáo"}
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}
          </Panel>
        </div>

        {/* RIGHT 1 COL: VERSION HISTORY & HELPFUL INFO */}
        <div className="lg:col-span-1 space-y-5">
          {/* VERSION HISTORY */}
          <Panel className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> Lịch sử nộp (Tuần{" "}
              {selectedWeek}{showSemesterWeek ? ` · HK ${semWeek(selectedWeek)}` : ""})
            </h3>

            <div className="space-y-2.5 text-xs">
              {versionHistory.length === 0 ? (
                <p className="text-slate-500 py-4 text-center">
                  Chưa có lịch sử nộp cho tuần này
                </p>
              ) : (
                versionHistory.map((ver, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50/80 rounded-md border border-slate-200/80 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-blue-700">
                        {ver.version}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {ver.submittedAt}
                      </span>
                    </div>
                    <p className="font-medium text-slate-800 truncate">
                      {ver.fileName}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-bold text-slate-500">
                        {ver.status}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePreviewReport(ver.id, ver.fileName)}
                          className="text-[10px] text-blue-600 hover:underline font-bold flex items-center gap-0.5"
                        >
                          <Eye className="w-3 h-3" /> Xem
                        </button>
                        <button
                          onClick={() => handleDownloadReport(ver.id, ver.fileName)}
                          className="text-[10px] text-blue-600 hover:underline font-bold flex items-center gap-0.5"
                        >
                          <Download className="w-3 h-3" /> Tải về
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>

          {/* LECTURER CONTACT & QUICK GUIDELINE */}
          <Panel className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Thông tin Hướng dẫn
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-blue-50/60 rounded-md border border-blue-200/60 space-y-1">
                <span className="text-[10px] font-bold text-blue-700 uppercase">
                  Giảng viên hướng dẫn
                </span>
                <p className="font-bold text-slate-900">
                  {profile.lecturerName}
                </p>
                <p className="text-[11px] text-slate-500">
                  Liên hệ qua hệ thống hoặc email trường
                </p>
              </div>

              <button
                onClick={() => navigate("/student/templates")}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4 text-slate-500" /> Xem mẫu báo cáo
              </button>
            </div>
          </Panel>
        </div>
      </div>

      {/* REQUIREMENTS MODAL */}
      {previewReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl h-[90vh] flex flex-col shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> {previewReport.name}
              </h3>
              <button
                onClick={() => {
                  URL.revokeObjectURL(previewReport.url);
                  setPreviewReport(null);
                }}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Đóng xem trước"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe
              src={previewReport.url}
              title={`Xem trước ${previewReport.name}`}
              className="min-h-0 flex-1 w-full"
            />
          </div>
        </div>
      )}

      {/* REQUIREMENTS MODAL */}
      {showRequirementModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4 shadow-md border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Quy định nộp
                Báo cáo tuần
              </h3>
              <button
                onClick={() => setShowRequirementModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700 font-medium">
              <p className="font-bold text-slate-900">1. Quy định file:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Soạn thảo bằng Microsoft Word theo mẫu chuẩn của Khoa.</li>
                <li>
                  Xuất file định dạng PDF (.pdf) trước khi nộp lên hệ thống.
                </li>
                <li>
                  Cấu trúc tên file:{" "}
                  <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-blue-700">
                    BaoCao_Tuan[X]_[MSSV]_[HoTen].pdf
                  </code>
                </li>
              </ul>

              <p className="font-bold text-slate-900 pt-2">
                2. Hạn nộp & Đánh giá:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Nộp trước 23:59 Chủ nhật hàng tuần.</li>
                <li>
                  Giảng viên sẽ phản hồi và chấm điểm trong vòng 3 ngày làm
                  việc.
                </li>
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setShowRequirementModal(false)}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-md"
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
