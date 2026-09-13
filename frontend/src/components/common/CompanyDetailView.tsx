import { useEffect, useState } from "react";
import {
  Building2,
  ArrowLeft,
  ArrowRight,
  Users,
  FileText,
  Mail,
  Phone,
  AlertCircle,
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  DollarSign,
  GraduationCap,
  Code,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "../common/PageHeader";
import { Panel } from "../common/Panel";
import { adminCompaniesService } from "../../services/adminCompanies.service";
import type { CompanyPositionDto } from "../../types/api";

interface CompanyDetailDto {
  id: string;
  name: string;
  industry?: string | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  studentCount: number;
  totalSubmissions: number;
  totalWeeklyReports: number;
  pendingReviewsCount: number;
  positions?: CompanyPositionDto[];
  internships: {
    id: string;
    studentId: string;
    studentCode?: string | null;
    studentName: string;
    position: string;
    status: string;
    startDate?: string;
    endDate?: string;
    submissionCount: number;
  }[];
}

interface CompanyDetailViewProps {
  /** Fetch function returning the company detail DTO. */
  fetchDetail: (companyId: string, semesterId?: string) => Promise<CompanyDetailDto>;
  /** Label for the back button. */
  backLabel: string;
  /** Path to navigate back to. */
  backPath: string;
  /** Current semester id for API scoping. */
  semesterId?: string;
  /** Optional: override the page title subtitle. */
  subtitle?: string;
  /** Optional: additional actions for PageHeader. */
  actions?: Array<{
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    variant?: "secondary" | "primary" | "ghost";
  }>;
  studentPath?: (internshipId: string) => string;
  isAdmin?: boolean;
}

function formatViDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}

function formatStipend(stipend?: number | null) {
  if (!stipend || stipend <= 0) return "Thỏa thuận";
  return `${Number(stipend).toLocaleString("vi-VN")} đ/tháng`;
}

const STATUS_LABEL: Record<string, string> = {
  NotStarted: "Chưa bắt đầu",
  InProgress: "Đang thực tập",
  BehindSchedule: "Quá hạn",
  AwaitingFeedback: "Chờ phản hồi",
  RequiresRevision: "Đang chỉnh sửa",
  Completed: "Hoàn thành",
  Graded: "Đã chấm điểm",
};

export const CompanyDetailView = ({
  fetchDetail,
  backLabel,
  backPath,
  semesterId,
  subtitle,
  actions = [],
  studentPath = (internshipId) => `/lecturer/students/${internshipId}`,
  isAdmin = false,
}: CompanyDetailViewProps) => {
  const params = useParams<{ id?: string; companyId?: string }>();
  const companyId = params.companyId ?? params.id;
  const navigate = useNavigate();
  const [detail, setDetail] = useState<CompanyDetailDto | null>(null);
  const [positions, setPositions] = useState<CompanyPositionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states for position CRUD
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<CompanyPositionDto | null>(null);
  const [positionForm, setPositionForm] = useState({
    title: "",
    slots: 1,
    stipend: "",
    requiredMajor: "",
    requiredSkills: "",
    location: "",
    description: "",
    isOpen: true,
  });
  const [savingPosition, setSavingPosition] = useState(false);
  const [positionError, setPositionError] = useState<string | null>(null);
  const [deletePositionId, setDeletePositionId] = useState<string | null>(null);
  const [deletingPosition, setDeletingPosition] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    fetchDetail(companyId, semesterId)
      .then((data) => {
        setDetail(data);
        setPositions(data.positions ?? []);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Không tải được thông tin doanh nghiệp")
      )
      .finally(() => setLoading(false));
  }, [companyId, semesterId, fetchDetail]);

  const openCreatePosition = () => {
    setEditingPosition(null);
    setPositionForm({
      title: "",
      slots: 1,
      stipend: "",
      requiredMajor: "",
      requiredSkills: "",
      location: "",
      description: "",
      isOpen: true,
    });
    setPositionError(null);
    setIsPositionModalOpen(true);
  };

  const openEditPosition = (p: CompanyPositionDto) => {
    setEditingPosition(p);
    setPositionForm({
      title: p.title,
      slots: p.slots,
      stipend: p.stipend != null ? String(p.stipend) : "",
      requiredMajor: p.requiredMajor ?? "",
      requiredSkills: p.requiredSkills ?? "",
      location: p.location ?? "",
      description: p.description ?? "",
      isOpen: p.isOpen,
    });
    setPositionError(null);
    setIsPositionModalOpen(true);
  };

  const handleSavePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!positionForm.title.trim()) {
      setPositionError("Vui lòng nhập tên vị trí.");
      return;
    }
    setSavingPosition(true);
    setPositionError(null);
    try {
      const cleanDigits = positionForm.stipend.replace(/[^0-9]/g, "");
      const stipendVal = cleanDigits ? Number(cleanDigits) : undefined;
      if (editingPosition) {
        const updated = await adminCompaniesService.updatePosition(editingPosition.id, {
          title: positionForm.title.trim(),
          slots: Math.max(1, positionForm.slots),
          stipend: stipendVal,
          requiredMajor: positionForm.requiredMajor.trim() || undefined,
          requiredSkills: positionForm.requiredSkills.trim() || undefined,
          location: positionForm.location.trim() || undefined,
          description: positionForm.description.trim() || undefined,
          isOpen: positionForm.isOpen,
        });
        setPositions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else if (companyId) {
        const created = await adminCompaniesService.createPosition(companyId, {
          semesterId: semesterId && semesterId !== "all" ? semesterId : undefined,
          title: positionForm.title.trim(),
          slots: Math.max(1, positionForm.slots),
          stipend: stipendVal,
          requiredMajor: positionForm.requiredMajor.trim() || undefined,
          requiredSkills: positionForm.requiredSkills.trim() || undefined,
          location: positionForm.location.trim() || undefined,
          description: positionForm.description.trim() || undefined,
          isOpen: positionForm.isOpen,
        });
        setPositions((prev) => [created, ...prev]);
      }
      setIsPositionModalOpen(false);
    } catch (err) {
      setPositionError(err instanceof Error ? err.message : "Có lỗi khi lưu vị trí tuyển dụng");
    } finally {
      setSavingPosition(false);
    }
  };

  const handleToggleStatus = async (p: CompanyPositionDto) => {
    try {
      const updated = await adminCompaniesService.updatePosition(p.id, {
        title: p.title,
        slots: p.slots,
        stipend: p.stipend ?? undefined,
        requiredMajor: p.requiredMajor ?? undefined,
        requiredSkills: p.requiredSkills ?? undefined,
        location: p.location ?? undefined,
        description: p.description ?? undefined,
        isOpen: !p.isOpen,
      });
      setPositions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      alert("Không thể thay đổi trạng thái vị trí tuyển dụng.");
    }
  };

  const handleDeletePosition = async () => {
    if (!deletePositionId) return;
    setDeletingPosition(true);
    try {
      await adminCompaniesService.deletePosition(deletePositionId);
      setPositions((prev) => prev.filter((item) => item.id !== deletePositionId));
      setDeletePositionId(null);
    } catch {
      alert("Không thể xóa vị trí tuyển dụng.");
    } finally {
      setDeletingPosition(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm font-medium text-slate-500">
        Đang tải thông tin doanh nghiệp…
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4 max-w-[1000px] mx-auto animate-in fade-in duration-200 pb-10">
        <PageHeader
          icon={Building2}
          title="Doanh nghiệp"
          subtitle={
            error
              ? "Không tìm thấy thông tin doanh nghiệp."
              : subtitle ?? "Thông tin doanh nghiệp"
          }
          actions={[
            {
              label: backLabel,
              icon: ArrowLeft,
              onClick: () => navigate(backPath),
              variant: "secondary",
            },
            ...actions,
          ]}
        />
        <Panel className="border-red-200 bg-red-50/40">
          <div className="flex items-start gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">Không có dữ liệu</p>
              <p className="text-xs mt-1 text-red-600">
                {error ?? "Không tìm thấy doanh nghiệp này."}
              </p>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  const initials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const pendingFeedbacks = detail.pendingReviewsCount;
  const totalStudents = detail.studentCount;
  const completedStudents = detail.internships.filter(
    (i) => i.status === "Completed" || i.status === "Graded"
  ).length;

  return (
    <div className="space-y-5 max-w-[1100px] mx-auto pb-10">
      <PageHeader
        icon={Building2}
        title={detail.name}
        subtitle={
          subtitle ??
          `Mã DN: ${detail.id.slice(0, 8).toUpperCase()} · ${totalStudents} sinh viên`
        }
        actions={[
          {
            label: backLabel,
            icon: ArrowLeft,
            onClick: () => navigate(backPath),
            variant: "secondary",
          },
          ...actions,
        ]}
      />

      {/* THÔNG TIN CƠ BẢN */}
      <Panel className="space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-blue-50 text-blue-700 font-bold flex items-center justify-center border border-blue-100">
              {detail.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{detail.name}</h2>
              <p className="text-xs text-slate-500">Thông tin doanh nghiệp theo học kỳ đang chọn</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-md border border-emerald-200 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            Đang hợp tác
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 text-xs">
          <div className="border border-slate-200 rounded-md p-3">
            <span className="text-slate-500">Lĩnh vực hoạt động</span>
            <strong className="mt-1 block text-slate-900">{detail.industry ?? "—"}</strong>
          </div>
          <div className="border border-slate-200 rounded-md p-3">
            <span className="text-slate-500 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />Địa chỉ
            </span>
            <strong className="mt-1 block text-slate-900">{detail.address ?? "—"}</strong>
          </div>
          <div className="border border-slate-200 rounded-md p-3">
            <span className="text-slate-500 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />Sinh viên được phân công
            </span>
            <strong className="mt-1 block text-slate-900">{totalStudents} sinh viên</strong>
          </div>
          <div className="border border-slate-200 rounded-md p-3">
            <span className="text-slate-500 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />Tổng bài nộp / nhật ký
            </span>
            <strong className="mt-1 block text-slate-900">
              {detail.totalSubmissions} bài · {detail.totalWeeklyReports} nhật ký
            </strong>
          </div>
          <div className="border border-slate-200 rounded-md p-3">
            <span className="text-slate-500 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />Người liên hệ
            </span>
            <strong className="mt-1 block text-slate-900">{detail.contactPerson ?? "—"}</strong>
            <p className="text-[10px] text-slate-500 mt-0.5">{detail.contactEmail ?? "—"}</p>
          </div>
          <div className="border border-slate-200 rounded-md p-3">
            <span className="text-slate-500 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" />Số điện thoại
            </span>
            <strong className="mt-1 block text-slate-900">{detail.contactPhone ?? "—"}</strong>
          </div>
        </div>
      </Panel>

      {/* VỊ TRÍ TUYỂN DỤNG */}
      <Panel className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              Vị trí tuyển dụng thực tập
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {positions.length} vị trí · {positions.reduce((sum, p) => sum + p.slots, 0)} chỉ tiêu tiếp nhận
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={openCreatePosition}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm vị trí
            </button>
          )}
        </div>

        {positions.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-md bg-slate-50/50">
            <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">Chưa có vị trí tuyển dụng nào</p>
            {isAdmin && (
              <p className="text-[11px] text-slate-400 mt-1">
                Nhấn &quot;Thêm vị trí&quot; để tạo các vị trí thực tập (Backend, Frontend, BA, ...)
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {positions.map((p) => {
              const filledRatio = p.slots > 0 ? Math.min(100, Math.round((p.filledSlots / p.slots) * 100)) : 0;
              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-lg border transition-all ${
                    p.isOpen
                      ? "border-slate-200 bg-white hover:border-blue-200 hover:shadow-xs"
                      : "border-slate-200/60 bg-slate-50/70 opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        {p.title}
                      </h4>
                      {p.location && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {p.location}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          p.isOpen
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {p.isOpen ? "Đang tuyển" : "Đã đóng"}
                      </span>
                    </div>
                  </div>

                  {/* Badges for Major and Skills */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {p.requiredMajor && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium border border-indigo-100">
                        <GraduationCap className="w-3 h-3" />
                        {p.requiredMajor}
                      </span>
                    )}
                    {p.requiredSkills && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                        <Code className="w-3 h-3 text-slate-400" />
                        {p.requiredSkills}
                      </span>
                    )}
                    {p.stipend != null && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-medium border border-amber-100">
                        <DollarSign className="w-3 h-3" />
                        {formatStipend(p.stipend)}
                      </span>
                    )}
                  </div>

                  {p.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 mb-3 bg-slate-50 p-2 rounded border border-slate-100">
                      {p.description}
                    </p>
                  )}

                  {/* Progress & Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            filledRatio >= 100 ? "bg-emerald-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${filledRatio}%` }}
                        />
                      </div>
                      <span className="font-semibold text-slate-700 font-mono text-[10px]">
                        {p.filledSlots}/{p.slots} SV
                      </span>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p)}
                          className="px-1.5 py-0.5 text-[10px] font-medium rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
                          title={p.isOpen ? "Đóng tuyển dụng" : "Mở lại tuyển dụng"}
                        >
                          {p.isOpen ? "Đóng" : "Mở lại"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditPosition(p)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletePositionId(p.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Xóa"
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

      {/* DANH SÁCH SINH VIÊN THỰC TẬP */}
      <Panel className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Danh sách sinh viên thực tập
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {detail.internships.length} sinh viên · Nhắn tin / theo dõi từng sinh viên
            </p>
          </div>
        </div>

        {detail.internships.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            Chưa có sinh viên nào được phân công cho doanh nghiệp này.
          </div>
        ) : (
          <div className="space-y-2">
            {detail.internships.map((internship) => {
              const isCompleted =
                internship.status === "Completed" || internship.status === "Graded";
              const isPending =
                internship.status === "AwaitingFeedback" ||
                internship.status === "RequiresRevision";
              const statusLabel = STATUS_LABEL[internship.status] ?? internship.status;
              return (
                <div
                  key={internship.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-md border border-slate-200 bg-slate-50 hover:bg-white cursor-pointer"
                  onClick={() => navigate(studentPath(internship.id))}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-100 shrink-0">
                      {initials(internship.studentName)}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 text-xs block truncate">
                        {internship.studentName}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        MSSV: {internship.studentCode ?? "—"} · {internship.position}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs shrink-0">
                    <span className="text-slate-400 font-mono text-[10px]">
                      {internship.startDate ? formatViDate(internship.startDate) : "—"} →{" "}
                      {internship.endDate ? formatViDate(internship.endDate) : "—"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isCompleted
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : isPending
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {statusLabel}
                    </span>
                    <span className="text-slate-400 text-[10px] font-mono">
                      {internship.submissionCount} bài
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* THỐNG KÊ BÀI NỘP / NHẬT KÝ */}
      <Panel className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Nhật ký nhận sinh viên & bài nộp
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tổng quan hoạt động tại doanh nghiệp trong học kỳ này
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4 text-xs">
          <div className="border border-slate-200 rounded-md p-3 bg-blue-50">
            <span className="text-slate-500">Sinh viên thực tập</span>
            <strong className="mt-1 block text-blue-700 text-lg font-bold font-mono">
              {totalStudents}
            </strong>
            <span className="text-[10px] text-slate-500">sinh viên đang được hướng dẫn</span>
          </div>
          <div className="border border-slate-200 rounded-md p-3 bg-emerald-50">
            <span className="text-slate-500">Hoàn thành / đã chấm</span>
            <strong className="mt-1 block text-emerald-700 text-lg font-bold font-mono">
              {completedStudents}
            </strong>
            <span className="text-[10px] text-slate-500">sinh viên hoàn thành thực tập</span>
          </div>
          <div className="border border-slate-200 rounded-md p-3 bg-amber-50">
            <span className="text-slate-500">Chờ duyệt / phản hồi</span>
            <strong className="mt-1 block text-amber-700 text-lg font-bold font-mono">
              {pendingFeedbacks}
            </strong>
            <span className="text-[10px] text-slate-500">bài nộp / nhật ký cần xử lý</span>
          </div>
          <div className="border border-slate-200 rounded-md p-3">
            <span className="text-slate-500">Tổng bài nộp</span>
            <strong className="mt-1 block text-slate-900 text-lg font-bold font-mono">
              {detail.totalSubmissions}
            </strong>
            <span className="text-[10px] text-slate-500">bài nộp sản phẩm / báo cáo</span>
          </div>
        </div>

        <div className="border border-slate-200 rounded-md p-4 text-xs text-slate-600">
          <p className="font-medium text-slate-700 mb-1">Nhật ký nhận sinh viên:</p>
          <p className="text-slate-500 leading-relaxed">
            Doanh nghiệp đã tiếp nhận {totalStudents} sinh viên thực tập trong học kỳ này.
            Tất cả sinh viên đã ký hợp đồng thực tập và được hướng dẫn bởi giảng viên đứng nhóm.
            Hiển thị chi tiết từng sinh viên, trạng thái thực tập và bài nộp tại trang danh sách
            sinh viên.
          </p>
        </div>
      </Panel>

      {/* MODAL THÊM / SỬA VỊ TRÍ */}
      {isPositionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                {editingPosition ? "Chỉnh sửa vị trí tuyển dụng" : "Thêm vị trí tuyển dụng mới"}
              </h3>
              <button
                type="button"
                onClick={() => setIsPositionModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePosition} className="p-5 space-y-3.5 text-xs">
              {positionError && (
                <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {positionError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên vị trí <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Thực tập sinh Backend, Frontend Developer, ..."
                  value={positionForm.title}
                  onChange={(e) => setPositionForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chỉ tiêu (số lượng)</label>
                  <input
                    type="number"
                    min={1}
                    value={positionForm.slots}
                    onChange={(e) => setPositionForm((prev) => ({ ...prev, slots: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mức hỗ trợ (VNĐ/tháng)</label>
                  <input
                    type="text"
                    placeholder="VD: 5000000 hoặc để trống"
                    value={positionForm.stipend}
                    onChange={(e) => setPositionForm((prev) => ({ ...prev, stipend: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chuyên ngành phù hợp</label>
                  <input
                    type="text"
                    placeholder="VD: CNTT, KTPM, QTKD"
                    value={positionForm.requiredMajor}
                    onChange={(e) => setPositionForm((prev) => ({ ...prev, requiredMajor: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Địa điểm làm việc</label>
                  <input
                    type="text"
                    placeholder="VD: Chi nhánh Quận 1, TP.HCM"
                    value={positionForm.location}
                    onChange={(e) => setPositionForm((prev) => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kỹ năng yêu cầu</label>
                <input
                  type="text"
                  placeholder="VD: React, C#, SQL, Git"
                  value={positionForm.requiredSkills}
                  onChange={(e) => setPositionForm((prev) => ({ ...prev, requiredSkills: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả công việc</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả công việc, trách nhiệm hoặc quyền lợi thực tập sinh..."
                  value={positionForm.description}
                  onChange={(e) => setPositionForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="positionIsOpen"
                  checked={positionForm.isOpen}
                  onChange={(e) => setPositionForm((prev) => ({ ...prev, isOpen: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="positionIsOpen" className="font-semibold text-slate-700 cursor-pointer select-none">
                  Đang mở tiếp nhận hồ sơ
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPositionModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingPosition}
                  className="px-4 py-1.5 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {savingPosition ? "Đang lưu..." : editingPosition ? "Cập nhật" : "Tạo vị trí"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletePositionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900">Xác nhận xóa vị trí</h3>
            </div>
            <p className="text-xs text-slate-600">
              Bạn có chắc muốn xóa vị trí tuyển dụng này không? Vị trí sẽ bị gỡ khỏi danh sách.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletePositionId(null)}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeletePosition}
                disabled={deletingPosition}
                className="px-4 py-1.5 rounded-md bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50 transition cursor-pointer"
              >
                {deletingPosition ? "Đang xóa..." : "Xóa vị trí"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
