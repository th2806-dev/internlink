import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, FileSliders, Save, ShieldCheck } from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
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
    <div className="mx-auto max-w-[1300px] space-y-4 animate-in fade-in duration-200 font-sans pb-12">
      <PageHeader
        icon={FileSliders}
        title="Chính sách trường dữ liệu"
        subtitle="Quản lý quy tắc hiển thị và kiểm tra theo biểu mẫu, vai trò."
      >
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || policyQuery.isPending || policyQuery.isError}
          className="il-btn il-btn-primary inline-flex items-center gap-2 disabled:pointer-events-none disabled:opacity-50"
        >
          <Save aria-hidden="true" className={`h-4 w-4 ${saveMutation.isPending ? "animate-pulse" : ""}`} />
          {saveMutation.isPending ? "Đang lưu..." : "Lưu chính sách"}
        </button>
      </PageHeader>

      <section className="grid gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:grid-cols-2 sm:p-5">
        <div className="space-y-1.5">
          <label htmlFor="policy-form" className="text-sm font-semibold text-slate-800">Biểu mẫu</label>
          <select
            id="policy-form"
            value={formCode}
            onChange={(event) => {
              setFormCode(event.target.value);
              setRows([]);
            }}
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-[#026aa7] focus:outline-none focus:ring-2 focus:ring-[#026aa7]/15"
          >
            {FORMS.map((form) => <option key={form.code} value={form.code}>{form.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="policy-role" className="text-sm font-semibold text-slate-800">Vai trò áp dụng</label>
          <select
            id="policy-role"
            value={roleId ?? ""}
            onChange={(event) => {
              setRoleId(event.target.value ? Number(event.target.value) : null);
              setRows([]);
            }}
            disabled={rolesQuery.isLoading}
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-[#026aa7] focus:outline-none focus:ring-2 focus:ring-[#026aa7]/15 disabled:opacity-60"
          >
            <option value="">Tất cả (Mặc định)</option>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
          {rolesQuery.isError && <p role="alert" className="text-xs text-rose-700">Không tải được vai trò: {getApiErrorMessage(rolesQuery.error)}</p>}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">{selectedForm.label}</h2>
            <p className="mt-1 font-mono text-[11px] text-slate-500">{formCode}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#026aa7]/5 px-3 py-1 text-xs font-semibold text-[#026aa7]">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            {visibleCount} / {rows.length} trường đang hiển thị
          </span>
        </div>
        {policyQuery.isPending ? (
          <p role="status" className="p-10 text-center text-xs text-slate-500">Đang tải chính sách trường...</p>
        ) : policyQuery.isError ? (
          <div role="alert" className="m-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
            Không thể tải chính sách trường. {getApiErrorMessage(policyQuery.error)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th scope="col" className="border-b border-slate-200 px-3 py-3 font-bold">Mã trường</th>
                  <th scope="col" className="border-b border-slate-200 px-3 py-3 font-bold">Tên gốc</th>
                  <th scope="col" className="border-b border-slate-200 px-3 py-3 font-bold">Tên ghi đè</th>
                  {BOOLEAN_FIELDS.map(([, label]) => (
                    <th key={label} scope="col" className="border-b border-slate-200 px-3 py-3 text-center font-bold">{label}</th>
                  ))}
                  <th scope="col" className="border-b border-slate-200 px-3 py-3 font-bold">Quy tắc Regex / Thông báo lỗi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.fieldKey} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                    <th scope="row" className="px-3 py-3 font-mono text-slate-700">{row.fieldKey}</th>
                    <td className="px-3 py-3 text-slate-700">{row.label}</td>
                    <td className="px-3 py-3">
                      <input
                        aria-label={`Tên ghi đè ${row.fieldKey}`}
                        value={row.customLabel ?? ""}
                        onChange={(event) => updateRow(index, { customLabel: event.target.value || null })}
                        maxLength={200}
                        placeholder={row.label}
                        className="min-h-10 w-44 rounded-lg border border-slate-300 px-2.5 text-xs focus:border-[#026aa7] focus:outline-none focus:ring-2 focus:ring-[#026aa7]/15"
                      />
                    </td>
                    {BOOLEAN_FIELDS.map(([field, label]) => (
                      <td key={field} className="px-3 py-3 text-center">
                        <label className="inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg hover:bg-slate-100">
                          <span className="sr-only">{label} {row.fieldKey}</span>
                          <input
                            type="checkbox"
                            aria-label={`${label} ${row.fieldKey}`}
                            checked={row[field]}
                            onChange={(event) => updateRow(index, { [field]: event.target.checked })}
                            className="h-4 w-4 accent-[#026aa7]"
                          />
                        </label>
                      </td>
                    ))}
                    <td className="px-3 py-3">
                      <div className="grid gap-2">
                        <input
                          aria-label={`Regex ${row.fieldKey}`}
                          value={row.validationRegex ?? ""}
                          onChange={(event) => updateRow(index, { validationRegex: event.target.value || null })}
                          maxLength={500}
                          placeholder="^[A-Za-z0-9._%+-]+$"
                          className="min-h-10 w-56 rounded-lg border border-slate-300 px-2.5 font-mono text-[11px] focus:border-[#026aa7] focus:outline-none focus:ring-2 focus:ring-[#026aa7]/15"
                        />
                        <input
                          aria-label={`Thông báo lỗi ${row.fieldKey}`}
                          value={row.errorMessage ?? ""}
                          onChange={(event) => updateRow(index, { errorMessage: event.target.value || null })}
                          maxLength={500}
                          placeholder="Thông báo khi dữ liệu không hợp lệ"
                          className="min-h-10 w-56 rounded-lg border border-slate-300 px-2.5 text-xs focus:border-[#026aa7] focus:outline-none focus:ring-2 focus:ring-[#026aa7]/15"
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
