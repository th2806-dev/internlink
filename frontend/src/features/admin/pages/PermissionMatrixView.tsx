import { Fragment, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Bell,
  Building,
  Building2,
  Calendar,
  CalendarCheck,
  ClipboardList,
  Columns3,
  FileSliders,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  KeyRound,
  Layers,
  LayoutDashboard,
  RotateCcw,
  Save,
  ScrollText,
  Settings,
  Shield,
  UserCheck,
  UserRoundPlus,
  Users,
  Webhook,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CompactActionBar } from "../../../components/common/CompactActionBar";
import { CompactToggleSwitch as PermissionSwitch } from "../../../components/common/CompactToggleSwitch";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { systemAdminService } from "../../../services/systemAdmin.service";
import type { RolePermissionRow } from "../../../types/systemAdmin";

type PermissionKey = Exclude<keyof RolePermissionRow, "moduleCode" | "featureCode" | "functionName" | "sortOrder">;
type ToastHandler = (message: string, type?: "primary" | "success" | "warning" | "danger" | "info") => void;

const PERMISSIONS: { key: PermissionKey; label: string }[] = [
  { key: "canView", label: "Xem" },
  { key: "canCreate", label: "Thêm" },
  { key: "canEdit", label: "Sửa" },
  { key: "canDelete", label: "Xóa" },
  { key: "canExport", label: "Xuất Excel" },
  { key: "canImport", label: "Nhập Excel" },
  { key: "canPrint", label: "In phiếu" },
  { key: "canApprove", label: "Phê duyệt" },
];

const FUNCTION_GROUP_METADATA: Record<string, { label: string; icon: LucideIcon }> = {
  DASHBOARD: { label: "TỔNG QUAN", icon: LayoutDashboard },
  SYSTEM: { label: "HỆ THỐNG", icon: Shield },
  ACCOUNTS: { label: "QUẢN LÝ TÀI KHOẢN", icon: Users },
  SEMESTERS: { label: "KỲ THỰC TẬP", icon: Calendar },
  STUDENTS: { label: "SINH VIÊN", icon: GraduationCap },
  LECTURER: { label: "GIẢNG VIÊN", icon: UserCheck },
  COMPANIES: { label: "DOANH NGHIỆP", icon: Building2 },
  ASSIGNMENTS: { label: "PHÂN CÔNG GVHD", icon: UserRoundPlus },
  WEEKLY_REPORTS: { label: "BÁO CÁO TUẦN", icon: FileText },
  ATTENDANCE: { label: "ĐIỂM DANH & NHẬT KÝ", icon: CalendarCheck },
  EVALUATIONS: { label: "CHẤM ĐIỂM & ĐÁNH GIÁ", icon: Award },
  SUMMARY: { label: "BẢNG ĐIỂM TỔNG HỢP", icon: ClipboardList },
  TEMPLATES: { label: "BIỂU MẪU & TÀI LIỆU", icon: FileSpreadsheet },
  NOTIFICATIONS: { label: "THÔNG BÁO", icon: Bell },
  DEPARTMENTS: { label: "QUẢN LÝ KHOA", icon: Building },
  GRID_CONFIG: { label: "CẤU HÌNH BẢNG", icon: Columns3 },
  FIELD_POLICIES: { label: "CHÍNH SÁCH TRƯỜNG", icon: FileSliders },
  CONFIG: { label: "CẤU HÌNH", icon: Settings },
  AUDIT: { label: "NHẬT KÝ & BÁO CÁO", icon: ScrollText },
  IT_CONFIG: { label: "CẤU HÌNH KỸ THUẬT", icon: Wrench },
  API_WEBHOOK: { label: "TÍCH HỢP API & WEBHOOK", icon: Webhook },
};

interface PermissionGroup {
  code: string;
  label: string;
  icon: LucideIcon;
  rows: RolePermissionRow[];
}

export function PermissionMatrixView({
  onShowToast,
}: {
  onShowToast: ToastHandler;
}) {
  const [roleId, setRoleId] = useState<number | "">("");
  const [functionGroupCode, setFunctionGroupCode] = useState("all");
  const [rows, setRows] = useState<RolePermissionRow[]>([]);
  const queryClient = useQueryClient();
  const rolesQuery = useQuery({
    queryKey: ["system-admin", "roles"],
    queryFn: systemAdminService.getRoles,
  });
  const selectedRoleId = roleId || 0;
  const permissionsQuery = useQuery({
    queryKey: ["system-admin", "role-permissions", selectedRoleId],
    queryFn: () => systemAdminService.getRolePermissions(selectedRoleId),
    enabled: selectedRoleId > 0,
  });
  const selectedRole = rolesQuery.data?.find((role) => role.id === roleId);

  useEffect(() => {
    if (!roleId && rolesQuery.data?.length) setRoleId(rolesQuery.data[0].id);
  }, [roleId, rolesQuery.data]);

  useEffect(() => {
    setRows(permissionsQuery.data ?? []);
  }, [permissionsQuery.data]);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.sortOrder - b.sortOrder),
    [rows],
  );
  const functionGroups = useMemo(() => {
    const groupedRows = new Map<string, RolePermissionRow[]>();
    sortedRows.forEach((row) => {
      const groupRows = groupedRows.get(row.moduleCode) ?? [];
      groupRows.push(row);
      groupedRows.set(row.moduleCode, groupRows);
    });

    return Array.from(groupedRows, ([code, groupRows]): PermissionGroup => {
      const metadata = FUNCTION_GROUP_METADATA[code.toUpperCase()];
      return {
        code,
        label: metadata?.label ?? groupRows[0].functionName.toLocaleUpperCase("vi-VN"),
        icon: metadata?.icon ?? Layers,
        rows: groupRows,
      };
    });
  }, [sortedRows]);
  const selectedFunctionGroupCode = functionGroups.some((group) => group.code === functionGroupCode)
    ? functionGroupCode
    : "all";
  const visibleFunctionGroups = selectedFunctionGroupCode === "all"
    ? functionGroups
    : functionGroups.filter((group) => group.code === selectedFunctionGroupCode);

  const saveMutation = useMutation({
    mutationFn: () => systemAdminService.saveRolePermissions(selectedRoleId, sortedRows),
    onSuccess: (savedRows) => {
      setRows(savedRows);
      queryClient.setQueryData(
        ["system-admin", "role-permissions", selectedRoleId],
        savedRows,
      );
      onShowToast("Đã lưu ma trận phân quyền.", "success");
    },
    onError: (error) => onShowToast(getApiErrorMessage(error), "danger"),
  });
  const resetMutation = useMutation({
    mutationFn: () => systemAdminService.resetRolePermissions(selectedRoleId),
    onSuccess: (resetRows) => {
      setRows(resetRows);
      queryClient.setQueryData(
        ["system-admin", "role-permissions", selectedRoleId],
        resetRows,
      );
      onShowToast("Đã khôi phục quyền mặc định cho vai trò.", "success");
    },
    onError: (error) => onShowToast(getApiErrorMessage(error), "danger"),
  });

  const updateRows = (update: (row: RolePermissionRow) => RolePermissionRow) =>
    setRows((current) => current.map(update));
  const toggleColumn = (key: PermissionKey, checked: boolean) =>
    updateRows((row) => ({ ...row, [key]: checked }));
  const toggleRow = (moduleCode: string, checked: boolean) =>
    updateRows((row) =>
      row.moduleCode === moduleCode
        ? {
            ...row,
            canView: checked,
            canCreate: checked,
            canEdit: checked,
            canDelete: checked,
            canExport: checked,
            canImport: checked,
            canPrint: checked,
            canApprove: checked,
          }
        : row,
    );
  const toggleGroup = (group: PermissionGroup, checked: boolean) => {
    const moduleCodes = new Set(group.rows.map((row) => row.moduleCode));
    updateRows((row) =>
      moduleCodes.has(row.moduleCode)
        ? {
            ...row,
            canView: checked,
            canCreate: checked,
            canEdit: checked,
            canDelete: checked,
            canExport: checked,
            canImport: checked,
            canPrint: checked,
            canApprove: checked,
          }
        : row,
    );
  };
  const toggleCell = (moduleCode: string, key: PermissionKey, checked: boolean) =>
    updateRows((row) =>
      row.moduleCode === moduleCode ? { ...row, [key]: checked } : row,
    );

  const isBusy = saveMutation.isPending || resetMutation.isPending;
  const error = rolesQuery.error ?? permissionsQuery.error;

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-200 font-sans pb-12">
      <CompactActionBar
        icon={KeyRound}
        title="Ma trận phân quyền"
        subtitle="Cấp quyền theo phân hệ, chức năng và thao tác."
      />

      <section className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid w-full gap-3 sm:max-w-2xl sm:grid-cols-2">
            <div>
              <label htmlFor="permission-role" className="mb-1 block text-xs font-medium text-slate-700">
                Nhóm quyền
              </label>
              <select
                id="permission-role"
                value={roleId}
                onChange={(event) => setRoleId(Number(event.target.value))}
                disabled={rolesQuery.isLoading || !rolesQuery.data?.length}
                className="h-8 w-full rounded-[4px] border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
              >
                {rolesQuery.data?.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="permission-function-group" className="mb-1 block text-xs font-medium text-slate-700">
                Nhóm chức năng
              </label>
              <select
                id="permission-function-group"
                value={selectedFunctionGroupCode}
                onChange={(event) => setFunctionGroupCode(event.target.value)}
                disabled={permissionsQuery.isLoading || !functionGroups.length}
                className="h-8 w-full rounded-[4px] border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
              >
                <option value="all">Tất cả nhóm chức năng</option>
                {functionGroups.map((group) => (
                  <option key={group.code} value={group.code}>
                    {group.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => resetMutation.mutate()}
              disabled={!selectedRoleId || isBusy || permissionsQuery.isLoading}
              className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Khôi phục mặc định
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={!selectedRoleId || isBusy || permissionsQuery.isLoading || !!error}
              className="inline-flex h-8 items-center gap-2 rounded-[4px] bg-[#026aa7] px-3.5 text-xs font-semibold text-white transition hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              {saveMutation.isPending ? "Đang lưu…" : "Lưu ma trận quyền"}
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {getApiErrorMessage(error)}
          </div>
        )}
        {rolesQuery.isLoading || permissionsQuery.isLoading ? (
          <p role="status" className="text-sm text-slate-600">Đang tải ma trận phân quyền…</p>
        ) : !rolesQuery.data?.length ? (
          <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">Chưa có vai trò nào được cấu hình.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-[1160px] w-full border-separate border-spacing-0 text-sm">
              <thead className="bg-slate-100/90 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th scope="col" className="sticky left-0 z-20 min-w-56 border-b border-r border-slate-200 bg-white px-4 py-1.5">Phân hệ / chức năng</th>
                  <th scope="col" className="min-w-16 border-b border-slate-200 px-2 py-1.5 text-center">Sort</th>
                  <th scope="col" className="min-w-32 border-b border-slate-200 px-2 py-1.5 text-center">Toàn quyền</th>
                  {PERMISSIONS.map(({ key, label }) => (
                    <th key={key} scope="col" className="min-w-24 border-b border-slate-200 bg-slate-100/90 px-3 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                      <div className="flex flex-col items-center gap-1">
                        <span>{label}</span>
                        <PermissionSwitch
                          label={`Cấp quyền cột ${label} cho tất cả phân hệ`}
                          checked={rows.length > 0 && rows.every((row) => row[key])}
                          onChange={(checked) => toggleColumn(key, checked)}
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleFunctionGroups.map((group) => {
                  const groupGranted = group.rows.length > 0
                    && group.rows.every((row) => PERMISSIONS.every(({ key }) => row[key]));
                  const GroupIcon = group.icon;

                  return (
                    <Fragment key={group.code}>
                      <tr className="bg-blue-50/70">
                        <th
                          scope="rowgroup"
                          className="sticky left-0 z-20 border-y border-r border-slate-200 bg-blue-50/70 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-700"
                        >
                          <span className="flex items-center gap-2">
                            <GroupIcon aria-hidden="true" className="h-4 w-4 text-[#026aa7]" />
                            {group.label}
                            <span className="font-medium normal-case tracking-normal text-slate-500">
                              ({group.rows.length})
                            </span>
                          </span>
                        </th>
                        <td className="border-y border-blue-100" />
                        <td className="border-y border-blue-100 px-2 py-1 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <PermissionSwitch
                              label={`Cấp toàn quyền nhóm ${group.label}`}
                              checked={groupGranted}
                              onChange={(checked) => toggleGroup(group, checked)}
                            />
                            <span className="text-[10px] font-semibold text-slate-600">Toàn nhóm</span>
                          </div>
                        </td>
                        <td colSpan={PERMISSIONS.length} className="border-y border-blue-100" />
                      </tr>
                      {group.rows.map((row) => {
                        const allGranted = PERMISSIONS.every(({ key }) => row[key]);
                        return (
                          <tr key={row.moduleCode} className="hover:bg-slate-50/80">
                            <th scope="row" className="sticky left-0 z-20 border-r border-slate-200 bg-white px-4 py-2.5 text-left font-medium text-slate-900">
                              <span className="block pl-5">{row.functionName}</span>
                              <span className="mt-0.5 block pl-5 text-xs font-normal text-slate-500">{row.featureCode}</span>
                            </th>
                            <td className="px-2 py-1 text-center">
                              <span
                                aria-label={`Thứ tự ${row.sortOrder}`}
                                className="inline-flex min-w-8 items-center justify-center rounded-[3px] border border-amber-200 bg-amber-50 px-2 py-1 font-mono text-[10px] font-bold text-amber-800"
                              >
                                {row.sortOrder}
                              </span>
                            </td>
                            <td className="px-2 py-1 text-center">
                              <PermissionSwitch
                                label={`Cấp toàn quyền chức năng cho ${row.functionName}`}
                                checked={allGranted}
                                onChange={(checked) => toggleRow(row.moduleCode, checked)}
                              />
                            </td>
                            {PERMISSIONS.map(({ key, label }) => (
                              <td key={key} className="px-2 py-1 text-center">
                                <PermissionSwitch
                                  label={`${row.functionName}: ${label}`}
                                  checked={row[key]}
                                  onChange={(checked) => toggleCell(row.moduleCode, key, checked)}
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
                {!sortedRows.length && (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-500">Vai trò này chưa có danh mục chức năng.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {selectedRole && (
          <p className="text-xs text-slate-500">
            Đang chỉnh quyền cho vai trò <span className="font-semibold text-slate-700">{selectedRole.name}</span>.
          </p>
        )}
      </section>
    </div>
  );
}
