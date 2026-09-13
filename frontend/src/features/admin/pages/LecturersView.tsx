import { useState, useMemo, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  KeyRound,
  Lock,
  Unlock,
  RotateCcw,
  Eye,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  GraduationCap,
  FileUp,
  Check,
} from "lucide-react";
import { CreateLecturerModal } from "../components/modals/CreateLecturerModal";
import type { CreateLecturerFormPayload } from "../components/modals/CreateLecturerModal";
import { EditLecturerModal } from "../components/modals/EditLecturerModal";
import type {
  EditLecturerFormPayload,
  LecturerRowForEdit,
} from "../components/modals/EditLecturerModal";
import { ImportLecturersModal } from "../components/modals/ImportLecturersModal";
import { PageHeader } from "../../../components/common/PageHeader";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { Panel } from "../../../components/common/Panel";
import { Toolbar } from "../../../components/common/Toolbar";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { getApiErrorMessage } from "../../../lib/apiClient";
import {
  buildAssignmentMaps,
  mapLecturerDtoToRow,
} from "../../../lib/adminMappers";
import { adminAssignmentsService } from "../../../services/adminAssignments.service";
import { adminLecturersService } from "../../../services/adminLecturers.service";
import { adminUsersService } from "../../../services/adminUsers.service";
import { useSemester, toApiSemesterId, toApiDepartmentId } from "../../../contexts/SemesterContext";
import { useAdminCapabilities } from "../../../hooks/useAdminCapabilities";
import type { ToastType } from "../../../contexts/ToastContext";
export const LecturersView = ({
  onShowToast,
  onNavigateTab,
}: {
  onShowToast: (msg: string, type?: ToastType) => void;
  onNavigateTab?: (tab: string) => void;
}) => {
  const { selectedSemester, selectedDepartmentId } = useSemester();
  const { canMutateOps, isSuperAdmin } = useAdminCapabilities();
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLecturer, setEditingLecturer] = useState<LecturerRowForEdit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LecturerRowForEdit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState<
    (typeof lecturers)[number] | null
  >(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGenerateAccountsModalOpen, setIsGenerateAccountsModalOpen] =
    useState(false);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [accountStatusFilter, setAccountStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchLecturerRows = async () => {
    const semesterId = toApiSemesterId(selectedSemester?.id);
    const departmentId = toApiDepartmentId(selectedDepartmentId);
    const [dtos, allAssignments] = await Promise.all([
      adminLecturersService.getAll(0, 500, semesterId, departmentId),
      adminAssignmentsService.getAll(semesterId, departmentId).catch(() => []),
    ]);
    const { lecturerCounts } = buildAssignmentMaps(dtos, allAssignments);
    return dtos.map((l) =>
      mapLecturerDtoToRow(l, lecturerCounts.get(l.id) ?? 0),
    );
  };

  const reloadLecturers = async () => {
    const rows = await fetchLecturerRows();
    setLecturers(rows);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingApi(true);
      try {
        const rows = await fetchLecturerRows();
        if (!cancelled) setLecturers(rows);
      } catch (err) {
        onShowToast(getApiErrorMessage(err));
      } finally {
        if (!cancelled) setIsLoadingApi(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onShowToast, selectedSemester?.id, selectedDepartmentId]);

  const handleAddLecturer = async (payload: CreateLecturerFormPayload) => {

    try {
      await adminLecturersService.create({
        staffCode: payload.staffCode,
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        department: payload.department,
        grantAccount: payload.grantAccount,
      });
      await reloadLecturers();
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
      throw err;
    }
  };

  const handleUpdateLecturer = async (
    id: string,
    payload: EditLecturerFormPayload,
  ) => {
    const existing = lecturers.find((l) => l.id === id);
    if (!existing) return;



    try {
      await adminLecturersService.update(id, {
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        department: payload.department,
      });
      await reloadLecturers();
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
      throw err;
    }
  };

  const handleDeleteLecturer = async (lec: LecturerRowForEdit) => {


    try {
      await adminLecturersService.delete(lec.id);
      if (selectedLecturer?.id === lec.id) setSelectedLecturer(null);
      if (editingLecturer?.id === lec.id) setEditingLecturer(null);
      await reloadLecturers();
      onShowToast(`Đã xóa ${lec.fullName}`);
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };

  const confirmDeleteLecturer = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await handleDeleteLecturer(deleteTarget);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalLecturers = lecturers.length;
  const activeLecturers = lecturers.filter(
    (l) => l.accountStatus === "active",
  ).length;
  const pendingAccounts = lecturers.filter(
    (l) => l.accountStatus === "pending",
  ).length;
  const guidingLecturers = lecturers.filter((l) => l.currentCount > 0).length;
  const filteredLecturers = useMemo(() => {
    return lecturers.filter((l) => {
      const matchSearch =
        l.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDept = deptFilter === "all" || l.department === deptFilter;
      const matchAccount =
        accountStatusFilter === "all" ||
        l.accountStatus === accountStatusFilter;
      return matchSearch && matchDept && matchAccount;
    });
  }, [lecturers, searchQuery, deptFilter, accountStatusFilter]);
  const totalPages = Math.ceil(filteredLecturers.length / pageSize) || 1;
  const paginatedLecturers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLecturers.slice(start, start + pageSize);
  }, [filteredLecturers, currentPage, pageSize]);
  const isAllPageSelected =
    paginatedLecturers.length > 0 &&
    paginatedLecturers.every((l) => selectedIds.includes(l.id));
  const handleToggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !paginatedLecturers.some((pl) => pl.id === id)),
      );
    } else {
      const pageIds = paginatedLecturers.map((l) => l.id);
      setSelectedIds((prev) =>
        Array.from(/* @__PURE__ */ new Set([...prev, ...pageIds])),
      );
    }
  };
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };
  const handleQuickGrantSingle = async (lec) => {

    try {
      await adminLecturersService.update(lec.id, {
        fullName: lec.fullName,
        email: lec.email !== "—" ? lec.email : undefined,
        phone: lec.phone !== "—" ? lec.phone : undefined,
        department: lec.department !== "—" ? lec.department : undefined,
        grantAccount: true,
      });
      await reloadLecturers();
      onShowToast(
        lec.email !== "—"
          ? `Đã cấp tài khoản ${lec.employeeId} — email mời đã gửi (nếu SMTP bật)`
          : `Đã cấp tài khoản ${lec.employeeId} — chưa có email để gửi mật khẩu`,
      );
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };
  const handleBatchGenerateAccounts = async () => {
    const targetIds =
      selectedIds.length > 0
        ? selectedIds
        : lecturers
            .filter((l) => l.accountStatus === "pending")
            .map((l) => l.id);

    let ok = 0;
    let fail = 0;
    for (const id of targetIds) {
      const lec = lecturers.find((l) => l.id === id);
      if (!lec || lec.accountStatus !== "pending") continue;
      try {
        await adminLecturersService.update(lec.id, {
          fullName: lec.fullName,
          email: lec.email !== "—" ? lec.email : undefined,
          phone: lec.phone !== "—" ? lec.phone : undefined,
          department: lec.department !== "—" ? lec.department : undefined,
          grantAccount: true,
        });
        ok++;
      } catch {
        fail++;
      }
    }
    if (ok > 0) await reloadLecturers();
    onShowToast(
      fail > 0
        ? `Cấp tài khoản: ${ok} thành công, ${fail} lỗi`
        : `Đã cấp tài khoản thành công cho ${ok} giảng viên`,
    );
    setIsGenerateAccountsModalOpen(false);
    setSelectedIds([]);
  };
  const handleResetPassword = async (lec) => {

    const userId = (lec as { userId?: string | null }).userId;
    if (!userId) {
      onShowToast("Giảng viên chưa có tài khoản đăng nhập");
      return;
    }
    try {
      const res = await adminUsersService.resetPassword(userId);
      onShowToast(
        res.emailSent
          ? `Đã gửi email đặt lại mật khẩu cho ${lec.fullName}`
          : `Đã reset mật khẩu cho ${res.username}`,
      );
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };
  const handleToggleLockAccount = async (id) => {
    const lec = lecturers.find((l) => l.id === id);
    if (!lec) return;
    const newStatus = lec.accountStatus === "locked" ? "active" : "locked";

    const userId = (lec as { userId?: string | null }).userId;
    if (!userId) {
      onShowToast("Giảng viên chưa có tài khoản đăng nhập");
      return;
    }
    try {
      await adminUsersService.update(userId, {
        fullName: lec.fullName,
        email: lec.email !== "—" ? lec.email : undefined,
        isActive: newStatus === "active",
      });
      setLecturers((prev) =>
        prev.map((l) => (l.id === id ? { ...l, accountStatus: newStatus } : l)),
      );
      onShowToast(
        `Đã ${newStatus === "locked" ? "khóa" : "mở khóa"} tài khoản của ${lec.fullName}`,
      );
    } catch (err) {
      onShowToast(getApiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto">
      <PageHeader
        icon={GraduationCap}
        title="Quản lý Giảng viên"
        actions={
          canMutateOps
            ? [
                {
                  label: "Import Excel",
                  icon: FileUp,
                  onClick: () => setIsImportModalOpen(true),
                  variant: "secondary" as const,
                },
                {
                  label: "Thêm giảng viên",
                  icon: UserPlus,
                  onClick: () => setIsCreateModalOpen(true),
                  variant: "primary" as const,
                },
              ]
            : []
        }
      >
        {canMutateOps && (
          <button
            type="button"
            onClick={() => setIsGenerateAccountsModalOpen(true)}
            className="il-btn-press px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>Cấp tài khoản nhanh ({pendingAccounts})</span>
          </button>
        )}
      </PageHeader>

      {isSuperAdmin && (
        <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2.5">
          <Eye className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Chế độ chỉ xem nghiệp vụ khoa — Quản trị hệ thống không thể tạo/sửa/xóa/cấp tài khoản giảng viên.
          </span>
        </div>
      )}

      <Toolbar
        left={
          <p className="text-xs text-slate-500 font-medium">
            <span className="font-bold text-slate-800">{totalLecturers}</span>{" "}
            GV ·{" "}
            <span className="font-bold text-emerald-700">{activeLecturers}</span>{" "}
            đã cấp TK ·{" "}
            <span className="font-bold text-amber-700">{pendingAccounts}</span>{" "}
            chưa TK ·{" "}
            <span className="font-bold text-sky-700">{guidingLecturers}</span>{" "}
            đang phân công
          </p>
        }
      />

      {/* LECTURERS MAIN TABLE */}
      <Panel className="space-y-4">
        {/* Table Header & Search Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Danh sách Giảng viên ({filteredLecturers.length})
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Bảng thông tin chi tiết và quản lý quyền truy cập
            </p>
          </div>

          {/* Search & Filter Inputs */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm tên, MSGV, Email..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Tất cả Bộ môn</option>
              <option value="Công nghệ Phần mềm">Bộ môn CNPM</option>
              <option value="Mạng máy tính & TTTT">Bộ môn MMT</option>
              <option value="Hệ thống Thông tin">Bộ môn HTTT</option>
              <option value="Khoa học Máy tính">Bộ môn KHMT</option>
            </select>

            <select
              value={accountStatusFilter}
              onChange={(e) => {
                setAccountStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Tất cả trạng thái TK</option>
              <option value="active">Đã cấp tài khoản</option>
              <option value="pending">Chưa cấp tài khoản</option>
              <option value="locked">Tài khoản bị khóa</option>
            </select>

            {canMutateOps && selectedIds.length > 0 && (
              <button
                onClick={handleBatchGenerateAccounts}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md transition-colors flex items-center gap-1.5 cursor-pointer animate-in fade-in"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Cấp TK đã chọn ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto border border-slate-200/80 rounded-md">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                {canMutateOps && (
                  <th className="py-2.5 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleToggleSelectAllPage}
                      className="rounded text-blue-600 cursor-pointer"
                    />
                  </th>
                )}
                <th className="py-2.5 px-3">Giảng viên</th>
                <th className="py-2.5 px-3">MSGV</th>
                <th className="py-2.5 px-3">Khoa / Bộ môn</th>
                <th className="py-2.5 px-3">Liên hệ</th>
                <th className="py-2.5 px-3 text-center">SV phân công</th>
                <th className="py-2.5 px-3 text-center">Trạng thái TK</th>
                <th className="py-2.5 px-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLecturers.length === 0 ? (
                <tr>
                  <td
                    colSpan={canMutateOps ? 8 : 7}
                    className="py-8 text-center text-slate-400 font-medium"
                  >
                    Không tìm thấy giảng viên nào khớp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedLecturers.map((lec) => {
                  const isSelected = selectedIds.includes(lec.id);
                  return (
                    <tr
                      key={lec.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? "bg-blue-50/50" : ""}`}
                    >
                      {canMutateOps && (
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(lec.id)}
                            className="rounded text-blue-600 cursor-pointer"
                          />
                        </td>
                      )}

                      {/* Name & Academic Degree */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <InitialsAvatar
                            name={lec.fullName}
                            seed={lec.lecturerCode || lec.email || lec.fullName}
                            size={32}
                          />
                          <div>
                            <p className="font-bold text-slate-900">
                              {lec.fullName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {lec.academicDegree}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {lec.employeeId}
                      </td>

                      {/* Department */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-800 block">
                          {lec.department}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {lec.faculty}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-3">
                        <p className="font-bold text-blue-600">{lec.email}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {lec.phone}
                        </p>
                      </td>

                      {/* Assignment count */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-slate-800 tabular-nums">
                          {lec.currentCount}
                        </span>
                      </td>

                      {/* Account Status Badge */}
                      <td className="py-3 px-3 text-center">
                        {lec.accountStatus === "active" && (
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-md inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />{" "}
                            Đã cấp
                          </span>
                        )}
                        {lec.accountStatus === "pending" && (
                          <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-md inline-flex items-center gap-1">
                            <KeyRound className="w-3 h-3 text-amber-600" /> Chưa
                            cấp
                          </span>
                        )}
                        {lec.accountStatus === "locked" && (
                          <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold rounded-md inline-flex items-center gap-1">
                            <Lock className="w-3 h-3 text-rose-600" /> Đã khóa
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {canMutateOps && lec.accountStatus === "pending" && (
                            <button
                              onClick={() => handleQuickGrantSingle(lec)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                              title="Cấp tài khoản ngay"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>Cấp TK ngay</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedLecturer(lec)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canMutateOps && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingLecturer(lec)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
                                title="Sửa"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeleteTarget(lec)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleResetPassword(lec)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
                                title="Đặt lại mật khẩu"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleToggleLockAccount(lec.id)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title={
                                  lec.accountStatus === "locked"
                                    ? "M\u1EDF kh\xF3a t\xE0i kho\u1EA3n"
                                    : "Kh\xF3a t\xE0i kho\u1EA3n"
                                }
                              >
                                {lec.accountStatus === "locked" ? (
                                  <Unlock className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Lock className="w-4 h-4 text-rose-600" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-1 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-medium">
              Hiển thị {paginatedLecturers.length} / {filteredLecturers.length}{" "}
              giảng viên
            </span>
            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span>Số dòng:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer text-xs"
              >
                <option value={5}>5 dòng</option>
                <option value={10}>10 dòng</option>
                <option value={20}>20 dòng</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-bold">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 text-slate-800">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Panel>

      {/* GENERATE ACCOUNTS MODAL */}
      {isGenerateAccountsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-lg border border-slate-200 shadow-md max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Cấp Tài khoản Nhanh
                </h3>
              </div>
              <button
                onClick={() => setIsGenerateAccountsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Khởi tạo tài khoản đăng nhập MSGV cho{" "}
              <span className="font-bold text-emerald-700">
                {selectedIds.length > 0
                  ? `${selectedIds.length} gi\u1EA3ng vi\xEAn \u0111\xE3 ch\u1ECDn`
                  : `${pendingAccounts} gi\u1EA3ng vi\xEAn ch\u01B0a c\xF3 t\xE0i kho\u1EA3n`}
              </span>
              .
            </p>

            <div className="p-3 bg-emerald-50 rounded-md border border-emerald-200 text-xs space-y-1">
              <p className="font-bold text-emerald-950">
                Quy tắc cấp tài khoản mặc định:
              </p>
              <ul className="list-disc pl-4 text-[11px] text-emerald-800 space-y-0.5">
                <li>Username: Mã giảng viên (MaGV)</li>
                <li>Mật khẩu tạm: 8 ký tự ngẫu nhiên (gửi qua email nếu có)</li>
                <li>Yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsGenerateAccountsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-md cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleBatchGenerateAccounts}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Kích hoạt ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LECTURER DETAIL DRAWER */}
      {selectedLecturer && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex justify-end animate-in fade-in">
          <div className="bg-white w-full max-w-md h-full shadow-md p-6 space-y-5 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Hồ sơ Giảng viên
              </h3>
              <button
                onClick={() => setSelectedLecturer(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <InitialsAvatar
                name={selectedLecturer.fullName}
                seed={selectedLecturer.employeeId || selectedLecturer.fullName}
                size={56}
                className="text-lg"
              />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {selectedLecturer.fullName}
                </h4>
                <p className="text-xs font-mono font-bold text-blue-600">
                  {selectedLecturer.employeeId}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedLecturer.academicDegree} •{" "}
                  {selectedLecturer.department}
                </p>
              </div>
            </div>

            {/* Info Details List */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-md space-y-2 font-medium text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Khoa:</span>
                  <span className="font-bold text-slate-900">
                    {selectedLecturer.faculty}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bộ môn:</span>
                  <span className="font-bold text-slate-900">
                    {selectedLecturer.department}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-bold text-blue-600">
                    {selectedLecturer.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Số điện thoại:</span>
                  <span className="font-bold text-slate-900">
                    {selectedLecturer.phone}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Trạng thái tài khoản:</span>
                  <span className="font-bold uppercase text-emerald-700">
                    {selectedLecturer.accountStatus}
                  </span>
                </div>
              </div>

              {/* Assignment count */}
              <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-lg">
                <span className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">
                  SV phân công
                </span>
                <p className="text-xl font-bold text-blue-950 mt-1">
                  {selectedLecturer.currentCount}
                </p>
              </div>

              {/* List of Assigned Students */}
              <div className="space-y-2 pt-2">
                <span className="font-bold text-slate-900 text-xs block">
                  Danh sách Sinh viên đang hướng dẫn (
                  {selectedLecturer.assignedStudents?.length || 0})
                </span>

                {selectedLecturer.assignedStudents &&
                selectedLecturer.assignedStudents.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {selectedLecturer.assignedStudents.map((st, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-md flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{st.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {st.studentId} • Lớp {st.classCode}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600">
                          {st.company}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-4 text-center text-slate-400 italic bg-slate-50 rounded-md">
                    Chưa có sinh viên nào được phân công.
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            {canMutateOps && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              {selectedLecturer.accountStatus === "pending" && (
                <button
                  onClick={() => {
                    handleQuickGrantSingle(selectedLecturer);
                    setSelectedLecturer(null);
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Cấp tài khoản ngay
                </button>
              )}

              <button
                onClick={() => {
                  setEditingLecturer(selectedLecturer);
                  setSelectedLecturer(null);
                }}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" /> Sửa hồ sơ
              </button>

              <button
                onClick={() => {
                  setDeleteTarget(selectedLecturer);
                  setSelectedLecturer(null);
                }}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa giảng viên
              </button>

              <button
                onClick={() => handleResetPassword(selectedLecturer)}
                className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Đặt lại mật khẩu tài khoản
              </button>

              <button
                onClick={() => handleToggleLockAccount(selectedLecturer.id)}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />{" "}
                {selectedLecturer.accountStatus === "locked"
                  ? "M\u1EDF kh\xF3a t\xE0i kho\u1EA3n"
                  : "Kh\xF3a t\xE0i kho\u1EA3n"}
              </button>
            </div>
            )}
          </div>
        </div>
      )}

      {/* IMPORT LECTURERS MODAL */}
      <ImportLecturersModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onShowToast={onShowToast}
        onSuccess={() => void reloadLecturers()}
        currentSemesterId={toApiSemesterId(selectedSemester?.id)}
      />

      {/* CREATE LECTURER MODAL */}
      <CreateLecturerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onShowToast={onShowToast}
        onAddLecturer={handleAddLecturer}
      />

      <EditLecturerModal
        isOpen={Boolean(editingLecturer)}
        lecturer={editingLecturer}
        onClose={() => setEditingLecturer(null)}
        onShowToast={onShowToast}
        onSave={handleUpdateLecturer}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa giảng viên"
        description={
          deleteTarget ? (
            <>
              Xóa giảng viên{" "}
              <strong className="text-slate-900">{deleteTarget.fullName}</strong> (
              {deleteTarget.employeeId})? Hành động không thể hoàn tác.
            </>
          ) : null
        }
        confirmLabel="Xóa giảng viên"
        variant="danger"
        loading={isDeleting}
        onConfirm={() => void confirmDeleteLecturer()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export { LecturersView as AdminLecturersView };
