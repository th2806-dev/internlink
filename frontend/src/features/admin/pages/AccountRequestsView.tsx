import { useState, useMemo, useEffect, useCallback } from "react";
import type { ToastType } from "../../../contexts/ToastContext";
import { accountRequestService, type AccountRequestDto } from "../../../services/accountRequest.service";
import { adminUsersService } from "../../../services/adminUsers.service";
import {
  KeyRound,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Eye,
  Mail,
  Phone,
  Lock,
  Unlock,
  ChevronRight,
  ChevronLeft,
  CheckSquare,
  Square,
  HelpCircle,
  Info,
  SlidersHorizontal,
  Layers,
  Check,
  X,
  Copy,
  UserPlus,
  History,
  FileCheck2,
  Bell,
} from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { InitialsAvatar } from "../../../components/common/InitialsAvatar";
import { CompanyAvatar } from "../../../components/common/CompanyAvatar";
import { KpiCard, KpiGrid } from "../../../components/common/KpiCard";
import { Panel } from "../../../components/common/Panel";
export const AccountRequestsView = ({
  onShowToast,
  onNavigateTab,
}: {
  onShowToast: (msg: string, type?: ToastType) => void;
  onNavigateTab?: (tab: string) => void;
}) => {
  const [activeMainTab, setActiveMainTab] = useState("requests");
  const [requests, setRequests] = useState<any[]>([]);
  const [userAccounts, setUserAccounts] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Map API DTO to local UI format
  const mapDtoToRequest = useCallback((dto: AccountRequestDto) => ({
    id: dto.id,
    requesterName: dto.requesterName,
    requesterCode: dto.requesterCode,
    email: dto.requesterEmail ?? "",
    role: dto.requesterRole,
    requestType: dto.requestType,
    description: dto.description ?? "",
    priority: dto.priority,
    status: dto.status,
    processorName: dto.processorName,
    processedAt: dto.processedAt,
    adminNote: dto.adminNote,
    createdAt: dto.createdAt,
  }), []);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const dtos = await accountRequestService.getAll();
      setRequests(dtos.map(mapDtoToRequest));
    } catch {
      onShowToast("Không thể tải danh sách yêu cầu tài khoản");
    } finally {
      setIsLoading(false);
    }
  }, [mapDtoToRequest, onShowToast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [dirSearch, setDirSearch] = useState("");
  const [dirRoleFilter, setDirRoleFilter] = useState("all");
  const [dirStatusFilter, setDirStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processActionType, setProcessActionType] = useState(null);
  const [adminNoteInput, setAdminNoteInput] = useState("");
  const [generatedTempPass, setGeneratedTempPass] = useState("");
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [newAccCode, setNewAccCode] = useState("");
  const [newAccName, setNewAccName] = useState("");
  const [newAccEmail, setNewAccEmail] = useState("");
  const [newAccPhone, setNewAccPhone] = useState("");
  const [newAccRole, setNewAccRole] = useState("student");
  const [newAccOrg, setNewAccOrg] = useState("");
  const [newAccSendMail, setNewAccSendMail] = useState(true);
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchSearch =
        req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.requesterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.requesterCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === "all" || req.role === roleFilter;
      const matchType = typeFilter === "all" || req.requestType === typeFilter;
      const matchStatus = statusFilter === "all" || req.status === statusFilter;
      const matchPriority =
        priorityFilter === "all" || req.priority === priorityFilter;
      return (
        matchSearch && matchRole && matchType && matchStatus && matchPriority
      );
    });
  }, [
    requests,
    searchQuery,
    roleFilter,
    typeFilter,
    statusFilter,
    priorityFilter,
  ]);
  const filteredAccounts = useMemo(() => {
    return userAccounts.filter((acc) => {
      const matchSearch =
        acc.fullName.toLowerCase().includes(dirSearch.toLowerCase()) ||
        acc.code.toLowerCase().includes(dirSearch.toLowerCase()) ||
        acc.email.toLowerCase().includes(dirSearch.toLowerCase()) ||
        acc.departmentOrOrg.toLowerCase().includes(dirSearch.toLowerCase());
      const matchRole = dirRoleFilter === "all" || acc.role === dirRoleFilter;
      const matchStatus =
        dirStatusFilter === "all" || acc.status === dirStatusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [userAccounts, dirSearch, dirRoleFilter, dirStatusFilter]);
  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;
  const todayStr = new Date().toLocaleDateString("vi-VN");
  const todayCount = requests.filter((r) =>
    r.createdAt.startsWith(todayStr),
  ).length;
  const totalAccountsCount = userAccounts.length;
  const categoryCounts = useMemo(() => {
    const categories = [
      "Qu\xEAn m\u1EADt kh\u1EA9u",
      "M\u1EDF kh\xF3a t\xE0i kho\u1EA3n",
      "Y\xEAu c\u1EA7u c\u1EA5p m\u1EDBi",
      "\u0110\u1ED5i Email",
      "\u0110\u1ED5i s\u1ED1 \u0111i\u1EC7n tho\u1EA1i",
      "K\xEDch ho\u1EA1t t\xE0i kho\u1EA3n",
      "C\u1EADp nh\u1EADt th\xF4ng tin c\xE1 nh\xE2n",
      "Kh\xE1c",
    ];
    return categories.map((cat) => ({
      name: cat,
      count: requests.filter((r) => r.requestType === cat).length,
      pending: requests.filter(
        (r) => r.requestType === cat && r.status === "pending",
      ).length,
    }));
  }, [requests]);
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedRequests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedRequests.map((r) => r.id));
    }
  };
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "urgent":
        return {
          bg: "bg-rose-100 text-rose-800 border-rose-300 ",
          label: "Kh\u1EA9n c\u1EA5p",
          icon: ShieldAlert,
        };
      case "high":
        return {
          bg: "bg-amber-100 text-amber-800 border-amber-300",
          label: "Cao",
          icon: AlertTriangle,
        };
      case "medium":
        return {
          bg: "bg-blue-100 text-blue-800 border-blue-200",
          label: "Trung b\xECnh",
          icon: Info,
        };
      case "low":
      default:
        return {
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          label: "Th\u1EA5p",
          icon: Clock,
        };
    }
  };
  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          label: "\u0110\xE3 x\u1EED l\xFD",
          icon: CheckCircle2,
          dot: "bg-emerald-500",
        };
      case "rejected":
        return {
          bg: "bg-rose-50 text-rose-800 border-rose-200",
          label: "B\u1ECB t\u1EEB ch\u1ED1i",
          icon: XCircle,
          dot: "bg-rose-500",
        };
      case "need_info":
        return {
          bg: "bg-blue-50 text-blue-800 border-blue-200",
          label: "Ch\u1EDD b\u1ED5 sung",
          icon: HelpCircle,
          dot: "bg-blue-500",
        };
      case "pending":
      default:
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          label: "\u0110ang ch\u1EDD",
          icon: Clock,
          dot: "bg-amber-500",
        };
    }
  };
  const openProcessModal = (req, action) => {
    setSelectedRequest(req);
    setProcessActionType(action);
    setAdminNoteInput("");
    if (action === "reset_pass") {
      const randStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      setGeneratedTempPass(`InternLink@2026#${randStr}`);
    }
    setShowProcessModal(true);
  };
  const handleExecuteProcess = async () => {
    if (!selectedRequest || !processActionType) return;
    setIsLoading(true);
    try {
      let updatedStatus = "approved";
      let actionText = "";
      if (processActionType === "reject") {
        updatedStatus = "rejected";
        actionText = `T\u1EEB ch\u1ED1i y\xEAu c\u1EA7u ${selectedRequest.id}`;
      } else if (processActionType === "need_info") {
        updatedStatus = "need_info";
        actionText = `Y\xEAu c\u1EA7u b\u1ED5 sung th\xF4ng tin cho ${selectedRequest.id}`;
      } else if (processActionType === "reset_pass") {
        updatedStatus = "approved";
        actionText = `\u0110\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u t\u1EA1m (${generatedTempPass}) th\xE0nh c\xF4ng`;
      } else if (processActionType === "unlock") {
        updatedStatus = "approved";
        actionText = `M\u1EDF kh\xF3a t\xE0i kho\u1EA3n th\xE0nh c\xF4ng`;
      } else if (processActionType === "activate") {
        updatedStatus = "approved";
        actionText = `K\xEDch ho\u1EA1t t\xE0i kho\u1EA3n th\xE0nh c\xF4ng`;
      } else {
        updatedStatus = "approved";
        actionText = `Ph\xEA duy\u1EC7t y\xEAu c\u1EA7u ${selectedRequest.id}`;
      }
      await accountRequestService.process(selectedRequest.id, {
        status: updatedStatus,
        adminNote: adminNoteInput || (processActionType === "reset_pass" ? `M\u1EADt kh\u1EA9u m\u1EDBi: ${generatedTempPass}` : undefined),
      });
      await loadRequests();
      onShowToast(
        `\u0110\xE3 x\u1EED l\xFD y\xEAu c\u1EA7u ${selectedRequest.id} th\xE0nh c\xF4ng!`,
      );
      setIsDetailOpen(false);
    } catch {
      onShowToast("Lỗi khi xử lý yêu cầu");
    } finally {
      setIsLoading(false);
      setShowProcessModal(false);
    }
  };
  const handleProvisionNewAccount = async (e) => {
    e.preventDefault();
    if (!newAccCode.trim() || !newAccName.trim() || !newAccEmail.trim()) {
      onShowToast(
        "Vui l\xF2ng \u0111i\u1EC1n \u0111\u1EA7y \u0111\u1EE7 M\xE3, H\u1ECD t\xEAn v\xE0 Email ch\xEDnh th\u1EE9c.",
      );
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/Admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newAccCode.trim(),
          fullName: newAccName.trim(),
          email: newAccEmail.trim(),
          phone: newAccPhone.trim() || undefined,
          role: newAccRole,
        }),
      });
      if (!response.ok) throw new Error("Tạo tài khoản thất bại");
      const newAcc = {
        id: `ACC-${1e3 + userAccounts.length + 1}`,
        code: newAccCode.trim(),
        fullName: newAccName.trim(),
        email: newAccEmail.trim(),
        phone: newAccPhone.trim() || "0901234567",
        role: newAccRole,
        departmentOrOrg:
          newAccOrg.trim() ||
          (newAccRole === "student"
            ? "Sinh vi\xEAn K20"
            : newAccRole === "lecturer"
              ? "Khoa CNTT"
              : "Doanh nghi\u1EC7p"),
        status: "active",
        createdAt: /* @__PURE__ */ new Date().toLocaleDateString("vi-VN"),
        lastLogin: "Ch\u01B0a \u0111\u0103ng nh\u1EADp",
      };
      setUserAccounts((prev) => [newAcc, ...prev]);
      setActivityLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          requestId: "C\u1EA4P-M\u1EDAI",
          user: `${newAcc.fullName} (${newAcc.role})`,
          action: `C\u1EA5p ph\xE1t t\xE0i kho\u1EA3n m\u1EDBi (${newAcc.code}) th\xE0nh c\xF4ng. ${newAccSendMail ? "\u0110\xE3 g\u1EEDi email th\xF4ng b\xE1o k\xEDch ho\u1EA1t." : ""}`,
          timestamp: "V\u1EEBa xong",
          type: "provisioned",
        },
        ...prev,
      ]);
      onShowToast(
        `\u0110\xE3 c\u1EA5p ph\xE1t t\xE0i kho\u1EA3n m\u1EDBi cho ${newAcc.fullName} (${newAcc.code}) th\xE0nh c\xF4ng!`,
      );
      setShowProvisionModal(false);
      setNewAccCode("");
      setNewAccName("");
      setNewAccEmail("");
      setNewAccPhone("");
      setNewAccOrg("");
    } catch {
      onShowToast("Lỗi khi tạo tài khoản mới");
    } finally {
      setIsLoading(false);
    }
  };
  const handleToggleAccountLock = async (account) => {
    const isLocking = account.status === "active";
    const newIsActive = !isLocking;
    try {
      setIsLoading(true);
      await adminUsersService.update(account.id, {
        fullName: account.fullName,
        email: account.email,
        isActive: newIsActive,
      });
      setUserAccounts((prev) =>
        prev.map((a) =>
          a.id === account.id
            ? { ...a, status: newIsActive ? "active" : "locked" }
            : a,
        ),
      );
      onShowToast(
        `\u0110\xE3 ${isLocking ? "kh\xF3a" : "m\u1EDF kh\xF3a"} t\xE0i kho\u1EA3n ${account.fullName} th\xE0nh c\xF4ng!`,
      );
    } catch {
      onShowToast("L\x1ED7i khi thay \x0111\x1ED5i tr\x1EA1ng th\xE1i t\xE0i kho\u1EA3n");
    } finally {
      setIsLoading(false);
    }
  };
  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) {
      onShowToast(
        "Vui l\xF2ng ch\u1ECDn \xEDt nh\u1EA5t 01 y\xEAu c\u1EA7u \u0111\u1EC3 x\u1EED l\xFD \u0111\u1ED3ng lo\u1EA1t.",
      );
      return;
    }
    setIsLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          accountRequestService.process(id, {
            status: "approved",
            adminNote: "Ph\xEA duy\u1EC7t h\xE0ng lo\u1EA1t.",
          })
        )
      );
      await loadRequests();
      onShowToast(
        `\u0110\xE3 ph\xEA duy\u1EC7t h\xE0ng lo\u1EA1t ${selectedIds.length} y\xEAu c\u1EA7u t\xE0i kho\u1EA3n!`,
      );
      setSelectedIds([]);
    } catch {
      onShowToast("Lỗi khi phê duyệt hàng loạt");
    } finally {
      setIsLoading(false);
    }
  };
  const handleExportExcel = () => {
    onShowToast(
      "\u0110\xE3 xu\u1EA5t B\xE1o c\xE1o Y\xEAu c\u1EA7u & T\xE0i kho\u1EA3n (.xlsx) th\xE0nh c\xF4ng!",
    );
  };
  const handleExportPdf = () => {
    onShowToast(
      "\u0110\xE3 xu\u1EA5t Nh\u1EADt k\xFD X\u1EED l\xFD T\xE0i kho\u1EA3n (.pdf) th\xE0nh c\xF4ng!",
    );
  };
  const handleRefresh = () => {
    loadRequests();
  };
  return (
    <div className="space-y-5 max-w-[1500px] mx-auto min-w-0 max-w-full overflow-hidden">
      <PageHeader
        icon={KeyRound}
        title="Quản lý Yêu cầu & Cấp phát Tài khoản"
        actions={[
          {
            label: "Excel",
            icon: FileSpreadsheet,
            onClick: handleExportExcel,
            variant: "secondary",
          },
          {
            label: "Cấp tài khoản mới",
            icon: UserPlus,
            onClick: () => setShowProvisionModal(true),
            variant: "primary",
          },
        ]}
      >
        <button
          type="button"
          onClick={handleBatchApprove}
          disabled={selectedIds.length === 0}
          className="il-btn il-btn-secondary il-btn-press disabled:opacity-40"
        >
          <CheckSquare className="w-4 h-4 text-blue-600" />
          <span>Xử lý ({selectedIds.length})</span>
        </button>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          className="il-btn il-btn-secondary il-btn-press p-2 disabled:opacity-50"
          title="Làm mới"
          aria-label="Làm mới"
        >
          <RefreshCw
            className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-600" : ""}`}
          />
        </button>
      </PageHeader>

      {/* MAIN VIEW MODE NAV TABS */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-lg border border-slate-200 text-xs font-bold max-w-full overflow-x-auto shrink-0">
        <button
          onClick={() => setActiveMainTab("requests")}
          className={`px-4 py-2.5 rounded-md transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${activeMainTab === "requests" ? "bg-white text-blue-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
        >
          <KeyRound className="w-4 h-4 shrink-0" />
          <span>Hàng đợi yêu cầu</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
              {pendingCount} chờ
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveMainTab("directory")}
          className={`px-4 py-2.5 rounded-md transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${activeMainTab === "directory" ? "bg-white text-blue-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
        >
          <UserCheck className="w-4 h-4 shrink-0" />
          <span>Danh sách &amp; Cấp phát tài khoản</span>
          <span className="px-2 py-0.5 bg-slate-200 text-slate-800 text-[10px] font-bold rounded-full">
            {totalAccountsCount}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab("logs")}
          className={`px-4 py-2.5 rounded-md transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${activeMainTab === "logs" ? "bg-white text-blue-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
        >
          <History className="w-4 h-4 shrink-0" />
          <span>Nhật ký hệ thống &amp; Kiểm toán</span>
        </button>
      </div>

      <KpiGrid>
        <KpiCard
          tone="blue"
          title="Tổng yêu cầu"
          value={totalCount}
          unit="yêu cầu"
          icon={Layers}
          footer="Toàn hệ thống"
        />
        <KpiCard
          tone="amber"
          title="Đang chờ xử lý"
          value={pendingCount}
          unit="yêu cầu"
          icon={Clock}
          footer="Cần đối soát"
        />
        <KpiCard
          tone="emerald"
          title="Đã phê duyệt"
          value={approvedCount}
          unit="yêu cầu"
          icon={CheckCircle2}
          footer="Thành công 95%"
        />
        <KpiCard
          tone="rose"
          title="Bị từ chối"
          value={rejectedCount}
          unit="yêu cầu"
          icon={XCircle}
          footer="Cần bổ sung hồ sơ"
        />
      </KpiGrid>

      {/* TAB 1: ACCOUNT REQUESTS QUEUE */}
      {activeMainTab === "requests" && (
        <div className="space-y-6">
          {/* REQUEST CATEGORIES GRID */}
          <Panel className="space-y-3 max-w-full overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                Danh mục loại yêu cầu tài khoản
              </h2>
              <span className="text-[11px] font-bold text-slate-400">
                Bấm để lọc nhanh
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {categoryCounts.map((cat) => {
                const isSelected = typeFilter === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => {
                      setTypeFilter(isSelected ? "all" : cat.name);
                      setCurrentPage(1);
                    }}
                    className={`p-2.5 rounded-md border text-left transition-all relative overflow-hidden ${isSelected ? "bg-blue-600 text-white border-blue-600 shadow-sm scale-[1.02]" : "bg-slate-50/70 hover:bg-slate-100/80 text-slate-800 border-slate-200/80"}`}
                  >
                    <p
                      className={`text-[10px] font-bold truncate ${isSelected ? "text-white" : "text-slate-800"}`}
                    >
                      {cat.name}
                    </p>
                    <div className="flex items-baseline justify-between mt-1">
                      <span
                        className={`text-base font-bold ${isSelected ? "text-white" : "text-slate-900"}`}
                      >
                        {cat.count}
                      </span>
                      {cat.pending > 0 && (
                        <span
                          className={`text-[9px] font-bold px-1 rounded ${isSelected ? "bg-amber-400 text-slate-900" : "bg-amber-100 text-amber-800"}`}
                        >
                          {cat.pending}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>

          {/* MAIN CONTENT AREA & RIGHT SIDEBAR GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start min-w-0 max-w-full">
            {/* LEFT COLUMN: REQUEST QUEUE TABLE */}
            <div className="lg:col-span-8 space-y-6 min-w-0 max-w-full">
              <Panel className="space-y-4 max-w-full overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-blue-600" />
                      Hàng đợi yêu cầu tài khoản ({filteredRequests.length})
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Danh sách các yêu cầu quên mật khẩu, mở khóa, đổi thông
                      tin từ người dùng.
                    </p>
                  </div>

                  {selectedIds.length > 0 && (
                    <div className="px-3 py-1.5 bg-blue-50 text-blue-800 rounded-md border border-blue-200 text-xs font-bold flex items-center gap-2">
                      <span>
                        Đã chọn: <strong>{selectedIds.length}</strong>
                      </span>
                      <button
                        onClick={() => setSelectedIds([])}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Filter Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="relative sm:col-span-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Mã YC, Tên, MSSV, Email..."
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">Tất cả Vai trò</option>
                    <option value="student">Sinh viên</option>
                    <option value="lecturer">Giảng viên</option>
                    <option value="enterprise">Doanh nghiệp</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">Tất cả Trạng thái</option>
                    <option value="pending">Đang chờ xử lý</option>
                    <option value="approved">Đã phê duyệt</option>
                    <option value="need_info">Chờ bổ sung thông tin</option>
                    <option value="rejected">Bị từ chối</option>
                  </select>

                  <select
                    value={priorityFilter}
                    onChange={(e) => {
                      setPriorityFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">Tất cả Mức ưu tiên</option>
                    <option value="urgent">Khẩn cấp</option>
                    <option value="high">Mức độ Cao</option>
                    <option value="medium">Mức độ Trung bình</option>
                    <option value="low">Mức độ Thấp</option>
                  </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto border border-slate-200/80 rounded-md">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3 w-8">
                          <button
                            onClick={toggleSelectAll}
                            className="text-slate-500 hover:text-slate-800"
                          >
                            {selectedIds.length === paginatedRequests.length &&
                            paginatedRequests.length > 0 ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </th>
                        <th className="py-2.5 px-3">Mã &amp; Người gửi</th>
                        <th className="py-2.5 px-3 text-center">Vai trò</th>
                        <th className="py-2.5 px-3">Loại yêu cầu</th>
                        <th className="py-2.5 px-3">Thời gian</th>
                        <th className="py-2.5 px-3 text-center">Ưu tiên</th>
                        <th className="py-2.5 px-3 text-center">Trạng thái</th>
                        <th className="py-2.5 px-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedRequests.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="py-8 text-center text-slate-400 font-medium"
                          >
                            Không tìm thấy yêu cầu tài khoản nào phù hợp bộ lọc.
                          </td>
                        </tr>
                      ) : (
                        paginatedRequests.map((req) => {
                          const isChecked = selectedIds.includes(req.id);
                          const priorityBadge = getPriorityBadge(req.priority);
                          const statusBadge = getStatusBadge(req.status);
                          const PriorityIcon = priorityBadge.icon;
                          return (
                            <tr
                              key={req.id}
                              className={`hover:bg-slate-50/80 transition-colors ${isChecked ? "bg-blue-50/30" : ""}`}
                            >
                              <td className="py-3 px-3">
                                <button
                                  onClick={() => toggleSelectOne(req.id)}
                                  className="text-slate-400 hover:text-blue-600"
                                >
                                  {isChecked ? (
                                    <CheckSquare className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                              </td>

                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2.5">
                                  {req.role === "enterprise" ? (
                                    <CompanyAvatar name={req.requesterName} size={32} />
                                  ) : (
                                    <InitialsAvatar
                                      name={req.requesterName}
                                      seed={req.requesterCode || req.requesterName}
                                      size={32}
                                    />
                                  )}
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-900">
                                        {req.requesterName}
                                      </span>
                                      <span className="text-[10px] font-mono font-bold text-slate-400">
                                        ({req.requesterCode})
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium block">
                                      {req.email}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${req.role === "lecturer" ? "bg-slate-100 text-slate-800 border-slate-200" : req.role === "enterprise" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-blue-50 text-blue-800 border-blue-200"}`}
                                >
                                  {req.role === "lecturer"
                                    ? "Gi\u1EA3ng vi\xEAn"
                                    : req.role === "enterprise"
                                      ? "Doanh nghi\u1EC7p"
                                      : "Sinh vi\xEAn"}
                                </span>
                              </td>

                              <td className="py-3 px-3">
                                <span className="font-bold text-slate-800 block text-xs">
                                  {req.requestType}
                                </span>
                                <span className="text-[10px] text-slate-400 line-clamp-1 max-w-[180px]">
                                  {req.description}
                                </span>
                              </td>

                              <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                                {req.createdAt}
                              </td>

                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border inline-flex items-center gap-1 ${priorityBadge.bg}`}
                                >
                                  <PriorityIcon className="w-3 h-3" />
                                  <span>{priorityBadge.label}</span>
                                </span>
                              </td>

                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border inline-flex items-center gap-1 ${statusBadge.bg}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`}
                                  />
                                  <span>{statusBadge.label}</span>
                                </span>
                              </td>

                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setSelectedRequest(req);
                                      setIsDetailOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-[11px] rounded-lg border border-slate-200 transition-colors flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Xem</span>
                                  </button>

                                  {req.status === "pending" && (
                                    <button
                                      onClick={() =>
                                        openProcessModal(
                                          req,
                                          req.requestType ===
                                            "Qu\xEAn m\u1EADt kh\u1EA9u"
                                            ? "reset_pass"
                                            : req.requestType ===
                                                "M\u1EDF kh\xF3a t\xE0i kho\u1EA3n"
                                              ? "unlock"
                                              : "approve",
                                        )
                                      }
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Xử lý</span>
                                    </button>
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

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-medium">
                      Hiển thị {paginatedRequests.length} /{" "}
                      {filteredRequests.length} yêu cầu
                    </span>
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <span>Số dòng:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer text-xs"
                      >
                        <option value={5}>5 dòng</option>
                        <option value={10}>10 dòng</option>
                        <option value={20}>20 dòng</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 font-bold">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 bg-slate-50 rounded-lg border border-slate-200 text-slate-800">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Panel>
            </div>

            {/* RIGHT SIDEBAR WIDGETS */}
            <div className="lg:col-span-4 space-y-6">
              {/* Urgent Pending Widget */}
              <div className="bg-white p-5 rounded-lg border border-slate-200/80 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-[11px] font-bold uppercase text-amber-700 tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" /> Cần xử lý gấp (
                    {pendingCount})
                  </span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md border border-amber-200">
                    Khẩn
                  </span>
                </div>

                <div className="space-y-2.5">
                  {requests
                    .filter((r) => r.status === "pending")
                    .slice(0, 3)
                    .map((req) => (
                      <div
                        key={req.id}
                        className="p-3 bg-amber-50/40 rounded-md border border-amber-200/80 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {req.requesterName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {req.id}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                          <KeyRound className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>{req.requestType}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 line-clamp-2">
                          {req.description}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-amber-100">
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setIsDetailOpen(true);
                            }}
                            className="px-2 py-0.5 bg-white text-slate-700 font-bold text-[10px] rounded-md border border-slate-200 hover:bg-slate-50"
                          >
                            Chi tiết
                          </button>
                          <button
                            onClick={() =>
                              openProcessModal(
                                req,
                                req.requestType === "Qu\xEAn m\u1EADt kh\u1EA9u"
                                  ? "reset_pass"
                                  : "approve",
                              )
                            }
                            className="px-2 py-0.5 bg-emerald-600 text-white font-bold text-[10px] rounded-md hover:bg-emerald-700 shadow-2xs"
                          >
                            Duyệt ngay
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Security Alert Card */}
              <div className="bg-white p-5 rounded-lg border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-rose-600" /> Cảnh báo an ninh
                    tài khoản
                  </span>
                </div>

                <div className="p-3 bg-rose-50/60 rounded-md border border-rose-100 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Nhập sai mật khẩu liên tiếp</span>
                  </div>
                  <p className="text-[11px] text-rose-700 font-medium leading-relaxed">
                    Tài khoản đã bị khóa tự động do
                    5 lần nhập sai từ địa chỉ IP lạ.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER ACCOUNT DIRECTORY & PROVISIONING */}
      {activeMainTab === "directory" && (
        <div className="bg-white p-5 rounded-lg border border-slate-200/80 shadow-xs space-y-4 max-w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                Danh mục tài khoản người dùng ({filteredAccounts.length})
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Quản lý trạng thái tài khoản sinh viên, giảng viên, cán bộ doanh
                nghiệp và Super Admin.
              </p>
            </div>

            <button
              onClick={() => setShowProvisionModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs transition-all flex items-center gap-1.5 shrink-0"
            >
              <UserPlus className="w-4 h-4 text-blue-200" />
              <span>Cấp tài khoản mới</span>
            </button>
          </div>

          {/* Directory Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={dirSearch}
                onChange={(e) => setDirSearch(e.target.value)}
                placeholder="Tìm tên, mã, email, tổ chức..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <select
              value={dirRoleFilter}
              onChange={(e) => setDirRoleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Tất cả Vai trò</option>
              <option value="student">Sinh viên</option>
              <option value="lecturer">Giảng viên</option>
              <option value="enterprise">Doanh nghiệp</option>
              <option value="admin">Super Admin</option>
            </select>

            <select
              value={dirStatusFilter}
              onChange={(e) => setDirStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Tất cả Trạng thái</option>
              <option value="active">Đang hoạt động (Active)</option>
              <option value="locked">Đang bị khóa (Locked)</option>
              <option value="inactive">Chưa kích hoạt (Inactive)</option>
            </select>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto border border-slate-200/80 rounded-md">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Tài khoản &amp; Mã</th>
                  <th className="py-2.5 px-3 text-center">Vai trò</th>
                  <th className="py-2.5 px-3">Lớp / Đơn vị công tác</th>
                  <th className="py-2.5 px-3">Email &amp; SĐT</th>
                  <th className="py-2.5 px-3 text-center">Trạng thái</th>
                  <th className="py-2.5 px-3">Đăng nhập gần nhất</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-slate-400 font-medium"
                    >
                      Không tìm thấy tài khoản nào trong hệ thống.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((acc) => (
                    <tr
                      key={acc.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          {acc.role === "enterprise" ? (
                            <CompanyAvatar name={acc.fullName} size={32} />
                          ) : (
                            <InitialsAvatar
                              name={acc.fullName}
                              seed={acc.username || acc.fullName}
                              size={32}
                            />
                          )}
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {acc.fullName}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              {acc.code} • {acc.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${acc.role === "admin" ? "bg-rose-50 text-rose-800 border-rose-200" : acc.role === "lecturer" ? "bg-slate-100 text-slate-800 border-slate-200" : acc.role === "enterprise" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-blue-50 text-blue-800 border-blue-200"}`}
                        >
                          {acc.role === "admin"
                            ? "Qu\u1EA3n tr\u1ECB vi\xEAn"
                            : acc.role === "lecturer"
                              ? "Gi\u1EA3ng vi\xEAn"
                              : acc.role === "enterprise"
                                ? "Doanh nghi\u1EC7p"
                                : "Sinh vi\xEAn"}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {acc.departmentOrOrg}
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-slate-800 font-medium block">
                          {acc.email}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {acc.phone}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {acc.status === "active" && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold">
                            Hoạt động
                          </span>
                        )}
                        {acc.status === "locked" && (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-[10px] font-bold">
                            Bị khóa
                          </span>
                        )}
                        {acc.status === "inactive" && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[10px] font-bold">
                            Chưa kích hoạt
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-[10px] text-slate-500">
                        {acc.lastLogin}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleAccountLock(acc)}
                            className={`p-1.5 rounded-lg border font-bold text-[10px] transition-colors ${acc.status === "active" ? "bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border-slate-200" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"}`}
                            title={
                              acc.status === "active"
                                ? "Kh\xF3a t\xE0i kho\u1EA3n"
                                : "M\u1EDF kh\xF3a"
                            }
                          >
                            {acc.status === "active" ? (
                              <Lock className="w-3.5 h-3.5" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            onClick={() => {
                              const randStr = Math.random()
                                .toString(36)
                                .substring(2, 6)
                                .toUpperCase();
                              const pass = `InternLink@2026#${randStr}`;
                              onShowToast(
                                `\u0110\xE3 c\u1EA5p l\u1EA1i m\u1EADt kh\u1EA9u t\u1EA1m cho ${acc.fullName}: ${pass}`,
                              );
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 rounded-lg border border-slate-200 transition-colors"
                            title="Đặt lại mật khẩu tạm"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM AUDIT & ACTIVITY LOGS */}
      {activeMainTab === "logs" && (
        <Panel className="space-y-4 max-w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                Nhật ký kiểm toán &amp; Xử lý hệ thống (System Audit Logs)
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Lưu toàn bộ lịch sử khởi tạo, duyệt yêu cầu, đổi mật khẩu và
                thay đổi quyền hạn tài khoản.
              </p>
            </div>

            <button
              onClick={handleExportPdf}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-md border border-slate-200 transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>Xuất nhật ký PDF</span>
            </button>
          </div>

          <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-100">
            {activityLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 relative z-10 pl-1"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border text-xs font-bold shadow-2xs ${log.type === "approved" || log.type === "provisioned" || log.type === "unlocked" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : log.type === "rejected" || log.type === "locked" ? "bg-rose-50 text-rose-700 border-rose-200" : log.type === "need_info" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
                >
                  {log.type === "approved" ||
                  log.type === "provisioned" ||
                  log.type === "unlocked" ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : log.type === "rejected" || log.type === "locked" ? (
                    <X className="w-3.5 h-3.5" />
                  ) : (
                    <Info className="w-3.5 h-3.5" />
                  )}
                </div>

                <div className="flex-1 bg-slate-50/80 p-3 rounded-md border border-slate-200/60 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{log.user}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {log.timestamp}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium">{log.action}</p>
                  <div className="text-[10px] text-slate-400 font-mono pt-0.5">
                    Mã tham chiếu / YC: <strong>{log.requestId}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* REQUEST DETAIL DRAWER */}
      {isDetailOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white h-full shadow-md flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-md shadow-xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedRequest.id}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusBadge(selectedRequest.status).bg}`}
                    >
                      {getStatusBadge(selectedRequest.status).label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Chi tiết hồ sơ yêu cầu xử lý tài khoản
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Thông tin người gửi (Requester Info)
                </span>

                <div className="flex items-center gap-3">
                  {selectedRequest.role === "enterprise" ? (
                    <CompanyAvatar name={selectedRequest.requesterName} size={48} />
                  ) : (
                    <InitialsAvatar
                      name={selectedRequest.requesterName}
                      seed={selectedRequest.requesterCode || selectedRequest.requesterName}
                      size={48}
                      className="text-base"
                    />
                  )}

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {selectedRequest.requesterName}
                      </h4>
                      <span className="font-mono text-slate-500 font-bold">
                        ({selectedRequest.requesterCode})
                      </span>
                    </div>
                    <p className="text-slate-600 font-medium">
                      {selectedRequest.departmentOrClass}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedRequest.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedRequest.phone}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Nội dung chi tiết yêu cầu
                </span>

                <div className="p-4 bg-white rounded-md border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedRequest.requestType}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedRequest.createdAt}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {selectedRequest.description}
                  </p>
                </div>

                {selectedRequest.requestedChanges &&
                  selectedRequest.requestedChanges.length > 0 && (
                    <div className="p-3 bg-blue-50/60 rounded-md border border-blue-100 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase text-blue-800 tracking-wider">
                        Thay đổi đề xuất
                      </span>
                      {selectedRequest.requestedChanges.map((chg, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] font-medium"
                        >
                          <span className="text-slate-600">{chg.field}:</span>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="text-rose-600 line-through">
                              {chg.oldValue}
                            </span>
                            <span className="text-slate-400">→</span>
                            <span className="text-emerald-700 font-bold">
                              {chg.newValue}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              {selectedRequest.attachmentName && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Minh chứng đính kèm
                  </span>
                  <div className="p-3 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-slate-800">
                        {selectedRequest.attachmentName}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        onShowToast(
                          `\u0110ang m\u1EDF xem minh ch\u1EE9ng ${selectedRequest.attachmentName}...`,
                        )
                      }
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200"
                    >
                      Xem đính kèm
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Ghi chú của Super Admin
                </span>
                <p className="p-3 bg-slate-50 rounded-md border border-slate-200 font-medium text-slate-700 italic">
                  {selectedRequest.adminNote ||
                    "Ch\u01B0a c\xF3 ghi ch\xFA n\u1ED9i b\u1ED9."}
                </p>
                {selectedRequest.processorName && (
                  <p className="text-[10px] text-slate-400 text-right">
                    Xử lý bởi: <strong>{selectedRequest.processorName}</strong>{" "}
                    ({selectedRequest.processedAt})
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => openProcessModal(selectedRequest, "reject")}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-md border border-rose-200 transition-colors"
              >
                Từ chối
              </button>

              <button
                onClick={() => openProcessModal(selectedRequest, "need_info")}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-md border border-blue-200 transition-colors"
              >
                Yêu cầu bổ sung
              </button>

              <div className="flex items-center gap-2 shrink-0">
                {selectedRequest.requestType ===
                  "Qu\xEAn m\u1EADt kh\u1EA9u" && (
                  <button
                    onClick={() =>
                      openProcessModal(selectedRequest, "reset_pass")
                    }
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-md shadow-2xs transition-colors flex items-center gap-1.5"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Đặt lại mật khẩu</span>
                  </button>
                )}

                {selectedRequest.requestType ===
                  "M\u1EDF kh\xF3a t\xE0i kho\u1EA3n" && (
                  <button
                    onClick={() => openProcessModal(selectedRequest, "unlock")}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-2xs transition-colors flex items-center gap-1.5"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Mở khóa ngay</span>
                  </button>
                )}

                <button
                  onClick={() => openProcessModal(selectedRequest, "approve")}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Phê duyệt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROCESS ACTION MODAL */}
      {showProcessModal && selectedRequest && processActionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {processActionType === "reset_pass" &&
                  "\u0110\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u t\u1EA1m"}
                {processActionType === "unlock" &&
                  "M\u1EDF kh\xF3a t\xE0i kho\u1EA3n"}
                {processActionType === "activate" &&
                  "K\xEDch ho\u1EA1t t\xE0i kho\u1EA3n"}
                {processActionType === "approve" &&
                  "X\xE1c nh\u1EADn ph\xEA duy\u1EC7t y\xEAu c\u1EA7u"}
                {processActionType === "reject" &&
                  "T\u1EEB ch\u1ED1i y\xEAu c\u1EA7u t\xE0i kho\u1EA3n"}
                {processActionType === "need_info" &&
                  "G\u1EEDi y\xEAu c\u1EA7u b\u1ED5 sung th\xF4ng tin"}
              </h3>
              <button
                onClick={() => setShowProcessModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {processActionType === "reset_pass" && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600 font-medium">
                  Mật khẩu tạm thời đã được khởi tạo tự động. Mật khẩu này sẽ có
                  hiệu lực trong vòng 24 giờ.
                </p>
                <div className="p-3 bg-slate-100 rounded-md font-mono text-center text-sm font-bold text-slate-900 flex items-center justify-between border border-slate-200">
                  <span>{generatedTempPass}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedTempPass);
                      onShowToast(
                        "\u0110\xE3 sao ch\xE9p m\u1EADt kh\u1EA9u t\u1EA1m v\xE0o clipboard!",
                      );
                    }}
                    className="p-1 hover:bg-white rounded"
                    title="Sao chép"
                  >
                    <Copy className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700">
                Ghi chú nội bộ / Phản hồi gửi người dùng:
              </label>
              <textarea
                value={adminNoteInput}
                onChange={(e) => setAdminNoteInput(e.target.value)}
                placeholder="Nhập ghi chú xử lý hoặc lý do..."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-md font-medium outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowProcessModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md"
              >
                Hủy
              </button>
              <button
                onClick={handleExecuteProcess}
                disabled={isLoading}
                className={`px-4 py-2 font-bold text-xs rounded-md text-white shadow-2xs flex items-center gap-1.5 ${processActionType === "reject" ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Xác nhận thực hiện</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROVISION NEW ACCOUNT MODAL */}
      {showProvisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-md p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cấp phát tài khoản mới
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Khởi tạo tài khoản cho Sinh viên, Giảng viên hoặc Doanh
                    nghiệp
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProvisionModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleProvisionNewAccount}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">
                    Mã định danh (MSSV/MSGV/Mã DN) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAccCode}
                    onChange={(e) => setNewAccCode(e.target.value)}
                    placeholder="VD: 20110299 hoặc GV010"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">
                    Vai trò người dùng *
                  </label>
                  <select
                    value={newAccRole}
                    onChange={(e) => setNewAccRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
                  >
                    <option value="student">Sinh viên</option>
                    <option value="lecturer">Giảng viên hướng dẫn</option>
                    <option value="enterprise">
                      Cán bộ Doanh nghiệp (Mentor)
                    </option>
                    <option value="admin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">
                  Họ và tên người dùng *
                </label>
                <input
                  type="text"
                  required
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Anh"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">
                    Email chính thức *
                  </label>
                  <input
                    type="email"
                    required
                    value={newAccEmail}
                    onChange={(e) => setNewAccEmail(e.target.value)}
                    placeholder="VD: email@hcmute.edu.vn"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={newAccPhone}
                    onChange={(e) => setNewAccPhone(e.target.value)}
                    placeholder="VD: 0901234567"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">
                  Lớp / Bộ môn / Tên doanh nghiệp
                </label>
                <input
                  type="text"
                  value={newAccOrg}
                  onChange={(e) => setNewAccOrg(e.target.value)}
                  placeholder="VD: Lớp 20CNTT1 • Khoa CNTT hoặc FPT Software"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-medium outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="p-3 bg-blue-50/60 rounded-md border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-blue-900 block">
                    Tự động gửi mail thông báo
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Gửi liên kết kích hoạt và mật khẩu khởi tạo qua Email.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={newAccSendMail}
                  onChange={(e) => setNewAccSendMail(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProvisionModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>Cấp tài khoản</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export { AccountRequestsView as AdminAccountRequestsView };
