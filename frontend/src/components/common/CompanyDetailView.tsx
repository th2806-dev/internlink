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
  if (stipend == null) return "Chưa cập nhật";
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

  // Modal states for editing company info
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: "",
    industry: "",
    address: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    capacity: 10,
  });
  const [savingCompany, setSavingCompany] = useState(false);
  const [companyFormError, setCompanyFormError] = useState<string | null>(null);

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

  const openEditCompany = () => {
    if (!detail) return;
    setCompanyForm({
      name: detail.name,
      industry: detail.industry ?? "",
      address: detail.address ?? "",
      contactPerson: detail.contactPerson ?? "",
      contactEmail: detail.contactEmail ?? "",
      contactPhone: detail.contactPhone ?? "",
      website: "",
      capacity: 10,
    });
    setCompanyFormError(null);
    setIsCompanyModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.name.trim() || !companyId) {
      setCompanyFormError("Vui lòng nhập tên doanh nghiệp.");
      return;
    }
    setSavingCompany(true);
    setCompanyFormError(null);
    try {
      await adminCompaniesService.update(companyId, {
        companyName: companyForm.name.trim(),
        industry: companyForm.industry.trim() || undefined,
        address: companyForm.address.trim() || undefined,
        contactPerson: companyForm.contactPerson.trim() || undefined,
        contactEmail: companyForm.contactEmail.trim() || undefined,
        contactPhone: companyForm.contactPhone.trim() || undefined,
        website: companyForm.website.trim() || undefined,
        capacity: Number(companyForm.capacity) || 0,
      });
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              name: companyForm.name.trim(),
              industry: companyForm.industry.trim() || null,
              address: companyForm.address.trim() || null,
              contactPerson: companyForm.contactPerson.trim() || null,
              contactEmail: companyForm.contactEmail.trim() || null,
              contactPhone: companyForm.contactPhone.trim() || null,
            }
          : prev
      );
      setIsCompanyModalOpen(false);
    } catch (err) {
      setCompanyFormError(err instanceof Error ? err.message : "Có lỗi khi cập nhật thông tin doanh nghiệp");
    } finally {
      setSavingCompany(false);
    }
  };

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
          semesterId: editingPosition.semesterId ?? (semesterId && semesterId !== "all" ? semesterId : undefined),
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
        semesterId: p.semesterId ?? undefined,
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
      <div className="flex min-h-32 items-center justify-center rounded-xl border border-slate-200/90 bg-white py-12 text-sm font-medium text-slate-500 shadow-2xs">
        <span role="status">Đang tải thông tin doanh nghiệp…</span>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="mx-auto max-w-[1300px] animate-in fade-in duration-200 space-y-4 pb-10">
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
        <Panel role="alert" className="rounded-xl border border-rose-200 bg-rose-50/40 shadow-2xs">
          <div className="flex items-start gap-3 text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-sm">
              <p className="font-bold">Không thể tải thông tin doanh nghiệp</p>
              <p className="mt-1 text-xs text-rose-600">
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
    <div className="mx-auto max-w-[1300px] animate-in fade-in duration-200 space-y-4 pb-10">
      <PageHeader
        icon={Building2}
        title={detail.name}
        subtitle={
          subtitle ??
          `${totalStudents} sinh viên trong học kỳ đang chọn`
        }
        actions={[
          {
            label: backLabel,
            icon: ArrowLeft,
            onClick: () => navigate(backPath),
            variant: "secondary",
          },
          ...(isAdmin
            ? [
                {
                  label: "Sửa doanh nghiệp",
                  icon: Pencil,
                  onClick: openEditCompany,
                  variant: "secondary" as const,
                },
              ]
            : []),
          ...actions,
        ]}
      />

      {/* THÔNG TIN CƠ BẢN */}
      <Panel className="space-y-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#026aa7]/20 bg-[#026aa7]/5 font-bold text-[#025a8e]">
              {detail.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{detail.name}</h2>
              <p className="text-xs text-slate-500">Thông tin doanh nghiệp theo học kỳ đang chọn</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 text-xs">
          <div className="rounded-xl border border-slate-200/90 p-3 shadow-2xs">
            <span className="text-slate-500">Lĩnh vực hoạt động</span>
            <strong className="mt-1 block text-slate-900">{detail.industry ?? "—"}</strong>
          </div>
          <div className="rounded-xl border border-slate-200/90 p-3 shadow-2xs">
            <span className="text-slate-500 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />Địa chỉ
            </span>
            <strong className="mt-1 block text-slate-900">{detail.address ?? "—"}</strong>
          </div>
          <div className="rounded-xl border border-slate-200/90 p-3 shadow-2xs">
            <span className="text-slate-500 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />Sinh viên được phân công
            </span>
            <strong className="mt-1 block text-slate-900">{totalStudents} sinh viên</strong>
          </div>
          <div className="rounded-xl border border-slate-200/90 p-3 shadow-2xs">
            <span className="text-slate-500 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />Bài nộp / báo cáo tuần
            </span>
            <strong className="mt-1 block text-slate-900">
              {detail.totalSubmissions} bài · {detail.totalWeeklyReports} nhật ký
            </strong>
          </div>
          <div className="rounded-xl border border-slate-200/90 p-3 shadow-2xs">
            <span className="text-slate-500 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />Người liên hệ
            </span>
            <strong className="mt-1 block text-slate-900">{detail.contactPerson ?? "—"}</strong>
            <p className="text-[10px] text-slate-500 mt-0.5">{detail.contactEmail ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-slate-200/90 p-3 shadow-2xs">
            <span className="text-slate-500 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" />Số điện thoại
            </span>
            <strong className="mt-1 block text-slate-900">{detail.contactPhone ?? "—"}</strong>
          </div>
        </div>
      </Panel>

      {/* VỊ TRÍ TUYỂN DỤNG */}
      <Panel className="space-y-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#026aa7]" />
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
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#026aa7] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm vị trí
            </button>
          )}
        </div>

        {positions.length === 0 ? (
          <div className="space-y-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
            <Briefcase className="mx-auto mb-2 h-8 w-8 text-slate-300" />
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
                    ? "border-slate-200/90 bg-white hover:border-[#026aa7]/30 hover:shadow-2xs"
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
                            ? "bg-[#7bc043]/10 text-[#446d20] border-[#7bc043]/40"
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
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#026aa7]/20 bg-[#026aa7]/5 px-2 py-0.5 text-[10px] font-medium text-[#025a8e]">
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
                            filledRatio >= 100 ? "bg-[#7bc043]" : "bg-[#026aa7]"
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
      <Panel className="space-y-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#026aa7]" />
              Danh sách sinh viên thực tập
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {detail.internships.length} sinh viên theo dữ liệu học kỳ
            </p>
          </div>
        </div>

        {detail.internships.length === 0 ? (
          <div className="space-y-2 py-10 text-center text-xs text-slate-500">
            <Users className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
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
                <button
                  type="button"
                  key={internship.id}
                  className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-slate-50 p-3 text-left transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2"
                  onClick={() => navigate(studentPath(internship.id))}
                >
                  <span className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#026aa7]/20 bg-[#026aa7]/5 text-xs font-bold text-[#025a8e]">
                      {initials(internship.studentName)}
                    </span>
                    <span className="min-w-0">
                      <span className="font-bold text-slate-900 text-xs block truncate">
                        {internship.studentName}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        MSSV: {internship.studentCode ?? "—"} · {internship.position}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-3 text-xs shrink-0">
                    <span className="text-slate-400 font-mono text-[10px]">
                      {internship.startDate ? formatViDate(internship.startDate) : "—"} →{" "}
                      {internship.endDate ? formatViDate(internship.endDate) : "—"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isCompleted
                          ? "bg-[#7bc043]/10 text-[#446d20] border-[#7bc043]/40"
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
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      {/* TỔNG HỢP HOẠT ĐỘNG */}
      <Panel className="space-y-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#026aa7]" />
              Tổng hợp hoạt động
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Số liệu theo danh sách thực tập, bài nộp và báo cáo tuần của học kỳ đang chọn.
            </p>
          </div>
        </div>

        <dl className="grid gap-x-8 gap-y-3 text-xs sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Sinh viên được phân công</dt>
            <dd className="font-semibold tabular-nums text-slate-900">{totalStudents}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Hoàn thành / đã chấm</dt>
            <dd className="font-semibold tabular-nums text-[#446d20]">{completedStudents}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Bài nộp và báo cáo tuần chờ phản hồi</dt>
            <dd className="font-semibold tabular-nums text-amber-700">{pendingFeedbacks}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Tổng bài nộp</dt>
            <dd className="font-semibold tabular-nums text-slate-900">{detail.totalSubmissions}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Báo cáo tuần</dt>
            <dd className="font-semibold tabular-nums text-slate-900">{detail.totalWeeklyReports}</dd>
          </div>
        </dl>
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

      {/* MODAL SỬA THÔNG TIN DOANH NGHIỆP */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Chỉnh sửa thông tin doanh nghiệp
              </h3>
              <button
                type="button"
                onClick={() => setIsCompanyModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="p-5 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
              {companyFormError && (
                <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {companyFormError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên doanh nghiệp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lĩnh vực hoạt động</label>
                  <input
                    type="text"
                    placeholder="VD: CNTT, Phần mềm..."
                    value={companyForm.industry}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, industry: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sức chứa tiếp nhận</label>
                  <input
                    type="number"
                    min={1}
                    value={companyForm.capacity}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, capacity: Number(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Địa chỉ</label>
                <input
                  type="text"
                  placeholder="Địa chỉ trụ sở / văn phòng..."
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm((prev) => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Người liên hệ</label>
                  <input
                    type="text"
                    value={companyForm.contactPerson}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, contactPerson: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={companyForm.contactEmail}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={companyForm.contactPhone}
                    onChange={(e) => setCompanyForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Website</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={companyForm.website}
                  onChange={(e) => setCompanyForm((prev) => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCompanyModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingCompany}
                  className="px-4 py-1.5 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {savingCompany ? "Đang lưu..." : "Cập nhật doanh nghiệp"}
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
