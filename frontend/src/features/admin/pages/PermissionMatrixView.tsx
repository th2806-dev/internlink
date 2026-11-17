import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, RotateCcw, Save } from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
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

export function PermissionMatrixView({
  onShowToast,
}: {
  onShowToast: ToastHandler;
}) {
  const [roleId, setRoleId] = useState<number | "">("");
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
  const toggleCell = (moduleCode: string, key: PermissionKey, checked: boolean) =>
    updateRows((row) =>
      row.moduleCode === moduleCode ? { ...row, [key]: checked } : row,
    );

  const isBusy = saveMutation.isPending || resetMutation.isPending;
  const error = rolesQuery.error ?? permissionsQuery.error;

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 animate-in fade-in duration-200 font-sans pb-12">
      <PageHeader
        icon={KeyRound}
        title="Ma trận phân quyền"
        subtitle="Cấp quyền theo phân hệ và thao tác cho từng vai trò. F1005: cấp toàn quyền theo chức năng hoặc áp dụng quyền theo cột."
        badge="PERMISSION STUDIO"
        badgeColor="border-blue-200 bg-blue-50 text-[#026aa7]"
      />

      <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-sm">
            <label htmlFor="permission-role" className="mb-1.5 block text-sm font-medium text-slate-700">
              Nhóm quyền
            </label>
            <select
              id="permission-role"
              value={roleId}
              onChange={(event) => setRoleId(Number(event.target.value))}
              disabled={rolesQuery.isLoading || !rolesQuery.data?.length}
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
            >
              {rolesQuery.data?.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => resetMutation.mutate()}
              disabled={!selectedRoleId || isBusy || permissionsQuery.isLoading}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Khôi phục mặc định
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={!selectedRoleId || isBusy || permissionsQuery.isLoading || !!error}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#026aa7] px-4 text-xs font-bold text-white transition hover:bg-[#025a8e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              {saveMutation.isPending ? "Đang lưu…" : "Lưu ma trận quyền"}
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {getApiErrorMessage(error)}
          </div>
        )}
        {rolesQuery.isLoading || permissionsQuery.isLoading ? (
          <p role="status" className="mt-6 text-sm text-slate-600">Đang tải ma trận phân quyền…</p>
        ) : !rolesQuery.data?.length ? (
          <p className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Chưa có vai trò nào được cấu hình.</p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-[1080px] w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th scope="col" className="sticky left-0 z-10 min-w-56 border-b border-slate-200 bg-slate-50 px-4 py-3">Phân hệ / chức năng</th>
                  <th scope="col" className="border-b border-slate-200 px-3 py-3 text-center">Toàn quyền chức năng</th>
                  {PERMISSIONS.map(({ key, label }) => (
                    <th key={key} scope="col" className="min-w-24 border-b border-slate-200 px-3 py-3 text-center">
                      <label className="flex cursor-pointer flex-col items-center gap-2">
                        <span>{label}</span>
                        <input
                          type="checkbox"
                          aria-label={`Cấp quyền cột ${label} cho tất cả phân hệ`}
                          checked={rows.length > 0 && rows.every((row) => row[key])}
                          onChange={(event) => toggleColumn(key, event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 accent-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                        />
                      </label>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRows.map((row) => {
                  const allGranted = PERMISSIONS.every(({ key }) => row[key]);
                  return (
                    <tr key={row.moduleCode} className="hover:bg-slate-50/80">
                      <th scope="row" className="sticky left-0 bg-white px-4 py-3 text-left font-medium text-slate-900">
                        <span className="block">{row.functionName}</span>
                        <span className="mt-0.5 block text-xs font-normal text-slate-500">{row.featureCode}</span>
                      </th>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Cấp toàn quyền chức năng cho ${row.functionName}`}
                          checked={allGranted}
                          onChange={(event) => toggleRow(row.moduleCode, event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 accent-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                        />
                      </td>
                      {PERMISSIONS.map(({ key, label }) => (
                        <td key={key} className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            aria-label={`${row.functionName}: ${label}`}
                            checked={row[key]}
                            onChange={(event) => toggleCell(row.moduleCode, key, event.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 accent-[#026aa7] focus-visible:ring-2 focus-visible:ring-[#026aa7]"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {!sortedRows.length && (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">Vai trò này chưa có danh mục chức năng.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {selectedRole && (
          <p className="mt-3 text-xs text-slate-500">
            Đang chỉnh quyền cho vai trò <span className="font-semibold text-slate-700">{selectedRole.name}</span>.
          </p>
        )}
      </section>
    </div>
  );
}
