import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, FileSliders, Save, ShieldCheck } from "lucide-react";
import { CompactActionBar } from "../../../components/common/CompactActionBar";
import { CompactToggleSwitch } from "../../../components/common/CompactToggleSwitch";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { systemService } from "../../../services/system.service";
import { systemAdminService } from "../../../services/systemAdmin.service";
import type { SaveSysFieldPolicy, SysFieldPolicy } from "../../../types/system";
import type { SysRole } from "../../../types/systemAdmin";

type ToastHandler = (message: string, type?: "primary" | "success" | "warning" | "danger" | "info") => void;
type PolicyRow = Omit<SysFieldPolicy, "id"> & { id: string; label: string };

const FORMS: {
  code: string;
  label: string;
}[] = [
  { code: "FORM_STUDENT_PROFILE", label: "Hồ sơ sinh viên" },
  { code: "FORM_COMPANY_REGISTRATION", label: "Phiếu tiếp nhận doanh nghiệp" },
  { code: "FORM_WEEKLY_REPORT", label: "Phiếu nộp báo cáo tuần" },
  { code: "STUDENT_WEEKLY_REPORT", label: "Báo cáo tuần sinh viên (động)" },
  { code: "FORM_EMPLOYER_EVALUATION", label: "Phiếu đánh giá thực tập của doanh nghiệp" },
];

const BOOLEAN_FIELDS = [
  ["isVisible", "Hiển thị"],
  ["isRequired", "Bắt buộc"],
  ["isReadOnly", "Chỉ đọc"],
] as const;

function mergePolicies(policies: SysFieldPolicy[]): PolicyRow[] {
  return policies
    .map((policy) => ({
      ...policy,
      label: policy.customLabel || policy.fieldKey,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function toSavePolicy(row: PolicyRow): SaveSysFieldPolicy {
  return {
    fieldKey: row.fieldKey,
    isVisible: row.isVisible,
    isRequired: row.isRequired,
    isReadOnly: row.isReadOnly,
    customLabel: row.customLabel?.trim() || null,
    defaultValue: row.defaultValue?.trim() || null,
    validationRegex: row.validationRegex?.trim() || null,
    errorMessage: row.errorMessage?.trim() || null,
    sortOrder: row.sortOrder,
  };
}

export function FieldPoliciesStudioView({
  onShowToast,
}: {
  onShowToast: ToastHandler;
}) {
  const queryClient = useQueryClient();
  const [formCode, setFormCode] = useState<string>(FORMS[0].code);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [rows, setRows] = useState<PolicyRow[]>([]);
  const rolesQuery = useQuery({
    queryKey: ["system-admin", "roles"],
    queryFn: systemAdminService.getRoles,
  });
  const policyQuery = useQuery({
    queryKey: ["system-field-policies", formCode, roleId],
    queryFn: () => systemService.getFieldPolicies(formCode, roleId),
    retry: false,
  });
  const selectedForm = FORMS.find((form) => form.code === formCode) ?? FORMS[0];
  const roles = (rolesQuery.data ?? []) as SysRole[];

  useEffect(() => {
    if (policyQuery.data)
      setRows(mergePolicies(policyQuery.data));
  }, [formCode, policyQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => systemService.saveFieldPolicies(formCode, roleId, rows.map(toSavePolicy)),
    onSuccess: async (saved) => {
      queryClient.setQueryData(["system-field-policies", formCode, roleId], saved);
      setRows(mergePolicies(saved));
      onShowToast("Đã lưu chính sách trường.", "success");
    },
    onError: (error) => onShowToast(`Không thể lưu chính sách. ${getApiErrorMessage(error)}`, "danger"),
  });

  const visibleCount = useMemo(() => rows.filter((row) => row.isVisible).length, [rows]);

  const updateRow = (index: number, patch: Partial<PolicyRow>) => {
    setRows((current) => current.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row,
    ));
  };

  return (
    <div className="w-full space-y-2 animate-in fade-in duration-200 font-sans pb-12">
      <CompactActionBar
        icon={FileSliders}
        title="Chính sách Trường Dữ liệu (F1003)"
        subtitle="Quản lý quy tắc hiển thị và kiểm tra theo biểu mẫu, vai trò."
      >
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || policyQuery.isPending || policyQuery.isError}
          className="inline-flex h-8 items-center gap-2 rounded-[4px] bg-[#026aa7] px-3 text-xs font-semibold text-white hover:bg-[#025a8e] disabled:pointer-events-none disabled:opacity-50"
        >
          <Save aria-hidden="true" className={`h-4 w-4 ${saveMutation.isPending ? "animate-pulse" : ""}`} />
          {saveMutation.isPending ? "Đang lưu..." : "Lưu chính sách"}
        </button>
      </CompactActionBar>

      <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="policy-form" className="text-xs font-semibold text-slate-800">Biểu mẫu</label>
          <select
            id="policy-form"
            value={formCode}
            onChange={(event) => {
              setFormCode(event.target.value);
              setRows([]);
            }}
            className="h-8 w-full rounded-[4px] border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-[#026aa7] focus:outline-none focus:ring-2 focus:ring-[#026aa7]/15"
          >
            {FORMS.map((form) => <option key={form.code} value={form.code}>{form.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="policy-role" className="text-xs font-semibold text-slate-800">Vai trò áp dụng</label>
          <select
            id="policy-role"
            value={roleId ?? ""}
            onChange={(event) => {
              setRoleId(event.target.value ? Number(event.target.value) : null);
              setRows([]);
            }}
            disabled={rolesQuery.isLoading}
            className="h-8 w-full rounded-[4px] border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-[#026aa7] focus:outline-none focus:ring-2 focus:ring-[#026aa7]/15 disabled:opacity-60"
          >
            <option value="">Tất cả (Mặc định)</option>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
          {rolesQuery.isError && <p role="alert" className="text-xs text-rose-700">Không tải được vai trò: {getApiErrorMessage(rolesQuery.error)}</p>}
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100/90 px-2.5 py-1.5">
          <div>
            <h2 className="text-xs font-bold text-slate-800">{selectedForm.label}</h2>
            <p className="mt-1 font-mono text-[11px] text-slate-500">{formCode}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-[3px] border border-[#026aa7]/20 bg-[#026aa7]/5 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#026aa7]">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            {visibleCount} / {rows.length} trường đang hiển thị
          </span>
        </div>
        {policyQuery.isPending ? (
          <p role="status" className="p-10 text-center text-xs text-slate-500">Đang tải chính sách trường...</p>
        ) : policyQuery.isError ? (
          <div role="alert" className="m-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            Không thể tải chính sách trường. {getApiErrorMessage(policyQuery.error)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
              <thead className="bg-slate-100/90 text-[11px] uppercase tracking-wider text-slate-600">
                <tr>
                  <th scope="col" className="border-b border-slate-200 px-2.5 py-1.5 font-semibold">Mã trường</th>
                  <th scope="col" className="border-b border-slate-200 px-2.5 py-1.5 font-semibold">Tên gốc</th>
                  <th scope="col" className="border-b border-slate-200 px-2.5 py-1.5 font-semibold">Tên ghi đè</th>
                  {BOOLEAN_FIELDS.map(([, label]) => (
                    <th key={label} scope="col" className="border-b border-slate-200 px-2.5 py-1.5 text-center font-semibold">{label}</th>
                  ))}
                  <th scope="col" className="border-b border-slate-200 px-2.5 py-1.5 font-semibold">Quy tắc Regex / Thông báo lỗi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.fieldKey} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                    <th scope="row" className="px-2.5 py-1.5 font-mono text-xs text-slate-700">{row.fieldKey}</th>
                    <td className="px-2.5 py-1.5 text-xs text-slate-700">{row.label}</td>
                    <td className="px-2.5 py-1.5">
                      <input
                        aria-label={`Tên ghi đè ${row.fieldKey}`}
                        value={row.customLabel ?? ""}
                        onChange={(event) => updateRow(index, { customLabel: event.target.value || null })}
                        maxLength={200}
                        placeholder={row.label}
                        className="h-8 w-44 rounded-[4px] border border-slate-200 px-2.5 text-xs focus:border-[#026aa7] focus:outline-none focus:ring-2 focus:ring-[#026aa7]/15"
                      />
                    </td>
                    {BOOLEAN_FIELDS.map(([field, label]) => (
                      <td key={field} className="px-2.5 py-1.5 text-center">
                        <CompactToggleSwitch
                          label={`${label} ${row.fieldKey}`}
                          checked={row[field]}
                          onChange={(checked) => updateRow(index, { [field]: checked })}
                        />
                      </td>
                    ))}
                    <td className="px-2.5 py-1.5">
                      <div className="grid gap-2">
                        <input
                          aria-label={`Regex ${row.fieldKey}`}
                          value={row.validationRegex ?? ""}
                          onChange={(event) => updateRow(index, { validationRegex: event.target.value || null })}
                          maxLength={500}
                          placeholder="^[A-Za-z0-9._%+-]+$"
                          className="h-8 w-56 rounded-[4px] border border-slate-200 px-2.5 font-mono text-xs focus:border-[#026aa7] focus:outline-none focus:ring-2 focus:ring-[#026aa7]/15"
                        />
                        <input
                          aria-label={`Thông báo lỗi ${row.fieldKey}`}
                          value={row.errorMessage ?? ""}
                          onChange={(event) => updateRow(index, { errorMessage: event.target.value || null })}
                          maxLength={500}
                          placeholder="Thông báo khi dữ liệu không hợp lệ"
                          className="h-8 w-56 rounded-[4px] border border-slate-200 px-2.5 text-xs focus:border-[#026aa7] focus:outline-none focus:ring-2 focus:ring-[#026aa7]/15"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                      Chưa có trường dữ liệu trong cấu hình biểu mẫu này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {rows.some((row) => !row.isVisible) && (
          <p className="flex items-center gap-2 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-600">
            <EyeOff aria-hidden="true" className="h-4 w-4 shrink-0" />
            Các trường ẩn không hiển thị trên biểu mẫu; chính sách mặc định vẫn giữ nguyên cho vai trò khác.
          </p>
        )}
        {rows.every((row) => row.isVisible) && rows.length > 0 && (
          <p className="flex items-center gap-2 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-600">
            <Eye aria-hidden="true" className="h-4 w-4 shrink-0 text-[#026aa7]" />
            Các chính sách áp dụng riêng cho vai trò đã chọn; chọn “Tất cả (Mặc định)” để chỉnh cấu hình mặc định.
          </p>
        )}
      </section>
    </div>
  );
}
