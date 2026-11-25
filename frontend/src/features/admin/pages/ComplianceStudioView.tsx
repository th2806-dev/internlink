import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Clock3,
  FileClock,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { CompactActionBar } from "../../../components/common/CompactActionBar";
import type { ToastType } from "../../../contexts/ToastContext";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { PLATFORM_PAGE_CONTENT_CLASS, PlatformPageHeader } from "../components/PlatformPageHeader";
import { PlatformTabBar } from "../components/PlatformTabBar";
import {
  systemComplianceService,
  type DataRetentionPolicy,
} from "../../../services/systemCompliance.service";

type Props = { onShowToast: (message: string, type?: ToastType) => void };
type StudioTab = "retention" | "anonymization";
type PolicyEdit = { retentionYears: number; isEnabled: boolean };

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function policyTitle(code: string): string {
  if (code === "WEEKLY_REPORT") return "Báo cáo tuần";
  if (code === "INTERNSHIP_EVALUATION") return "Phiếu đánh giá thực tập";
  if (code === "STUDENT_PII") return "Định danh hồ sơ sinh viên";
  return code;
}

function operationTitle(code: string): string {
  if (code === "STUDENT_PII_ANONYMIZATION") return "Ẩn danh hóa dữ liệu hồ sơ sinh viên";
  return code;
}

function complianceStatusLabel(status: string): string {
  if (status === "Completed") return "Hoàn tất";
  return status;
}

export function ComplianceStudioView({ onShowToast }: Props) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<StudioTab>("retention");
  const [edits, setEdits] = useState<Record<string, PolicyEdit>>({});
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [understandsPreservedData, setUnderstandsPreservedData] = useState(false);

  const policiesQuery = useQuery({
    queryKey: ["system-admin", "compliance", "policies"],
    queryFn: ({ signal }) => systemComplianceService.getPolicies(signal),
  });
  const previewQuery = useQuery({
    queryKey: ["system-admin", "compliance", "anonymization-preview"],
    queryFn: ({ signal }) => systemComplianceService.getAnonymizationPreview(signal),
  });
  const logsQuery = useQuery({
    queryKey: ["system-admin", "compliance", "audit-logs"],
    queryFn: ({ signal }) => systemComplianceService.getAuditLogs(1, 25, signal),
  });

  const savePolicyMutation = useMutation({
    mutationFn: (input: { code: string; retentionYears: number; isEnabled: boolean }) =>
      systemComplianceService.updatePolicy(input.code, input.retentionYears, input.isEnabled),
    onSuccess: async (_result, input) => {
      setEdits((current) => {
        const next = { ...current };
        delete next[input.code];
        return next;
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["system-admin", "compliance", "policies"] }),
        queryClient.invalidateQueries({ queryKey: ["system-admin", "compliance", "anonymization-preview"] }),
      ]);
      onShowToast("Đã cập nhật chính sách lưu trữ.", "success");
    },
    onError: (error) => onShowToast(getApiErrorMessage(error), "danger"),
  });
  const executeMutation = useMutation({
    mutationFn: () => systemComplianceService.executeAnonymization(
      previewQuery.data?.eligibleStudentCount ?? 0,
      confirmationPhrase,
    ),
    onSuccess: async (result) => {
      setShowExecuteDialog(false);
      setConfirmationPhrase("");
      setUnderstandsPreservedData(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["system-admin", "compliance", "anonymization-preview"] }),
        queryClient.invalidateQueries({ queryKey: ["system-admin", "compliance", "audit-logs"] }),
      ]);
      onShowToast(`Đã ẩn danh ${result.affectedCount.toLocaleString("vi-VN")} hồ sơ sinh viên.`, "success");
    },
    onError: (error) => onShowToast(getApiErrorMessage(error), "danger"),
  });

  function editPolicy(policy: DataRetentionPolicy, patch: Partial<PolicyEdit>) {
    setEdits((current) => ({
      ...current,
      [policy.code]: {
        retentionYears: current[policy.code]?.retentionYears ?? policy.retentionYears,
        isEnabled: current[policy.code]?.isEnabled ?? policy.isEnabled,
        ...patch,
      },
    }));
  }

  const eligibleCount = previewQuery.data?.eligibleStudentCount ?? 0;
  const canExecute = confirmationPhrase === "ANONYMIZE"
    && understandsPreservedData
    && eligibleCount > 0
    && Boolean(previewQuery.data?.isEnabled)
    && !executeMutation.isPending;

  return (
    <div className="min-h-full w-full bg-slate-50 pb-12 font-sans">
      <PlatformPageHeader
        title="Tuân thủ & vòng đời dữ liệu"
        description="Chính sách lưu trữ, ẩn danh hóa và nhật ký tuân thủ."
        breadcrumbs={[
          { label: "Quản trị nền tảng", href: "/admin/dashboard" },
          { label: "Quản trị & tuân thủ" },
          { label: "Tuân thủ pháp lý và vòng đời dữ liệu" },
        ]}
        statistic={policiesQuery.data ? `${policiesQuery.data.length} chính sách` : undefined}
      />
      <CompactActionBar
        icon={ShieldAlert}
        title="Tuân thủ pháp lý và vòng đời dữ liệu"
        subtitle="Quản lý thời hạn lưu trữ và ẩn danh hồ sơ có kiểm soát."
        hideTitle
      />

      <main className={PLATFORM_PAGE_CONTENT_CLASS}>
      <PlatformTabBar
        ariaLabel="Phân hệ tuân thủ"
        selectedId={activeTab}
        tabs={[
          {
            id: "retention",
            label: "Vòng đời lưu trữ",
            icon: Archive,
            onSelect: () => setActiveTab("retention"),
          },
          {
            id: "anonymization",
            label: "Ẩn danh hóa & tuân thủ",
            icon: Trash2,
            onSelect: () => {
              setActiveTab("anonymization");
              void previewQuery.refetch();
              void logsQuery.refetch();
            },
          },
        ]}
      />

      {activeTab === "retention" && (
        <section role="tabpanel" className="space-y-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
          <header className="flex items-start gap-2 border-b border-slate-100 pb-3">
            <FileClock className="mt-0.5 h-4 w-4 text-[#026aa7]" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Vòng đời lưu trữ dữ liệu</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Thời hạn lưu trữ có thể thay đổi theo quy chế của đơn vị; chính sách tắt sẽ không được áp dụng.
              </p>
            </div>
          </header>
          {policiesQuery.isLoading && (
            <p role="status" className="flex items-center gap-2 py-4 text-xs text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Đang tải chính sách…
            </p>
          )}
          {policiesQuery.isError && (
            <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {getApiErrorMessage(policiesQuery.error)}
            </p>
          )}
          <div className="space-y-2">
            {policiesQuery.data?.map((policy) => {
              const edit = edits[policy.code] ?? {
                retentionYears: policy.retentionYears,
                isEnabled: policy.isEnabled,
              };
              return (
                <article key={policy.code} className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[minmax(0,1fr)_130px_145px_auto] md:items-center">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">{policyTitle(policy.code)}</h3>
                    <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{policy.description}</p>
                    <span className="mt-1 inline-block font-mono text-[10px] text-slate-400">{policy.code}</span>
                  </div>
                  <label className="text-[11px] font-medium text-slate-600">
                    Thời hạn (năm)
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={edit.retentionYears}
                      onChange={(event) => editPolicy(policy, { retentionYears: Number(event.target.value) })}
                      className="mt-1 h-8 w-full rounded-[4px] border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 focus:border-[#026aa7] focus:outline-none"
                    />
                  </label>
                  <label className="flex h-8 items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={edit.isEnabled}
                      onChange={(event) => editPolicy(policy, { isEnabled: event.target.checked })}
                      className="accent-[#026aa7]"
                    />
                    Đang áp dụng
                  </label>
                  <button
                    type="button"
                    onClick={() => savePolicyMutation.mutate({
                      code: policy.code,
                      retentionYears: edit.retentionYears,
                      isEnabled: edit.isEnabled,
                    })}
                    disabled={savePolicyMutation.isPending || edit.retentionYears < 1 || edit.retentionYears > 100}
                    className="h-8 rounded-[4px] bg-[#026aa7] px-3 text-xs font-semibold text-white hover:bg-[#025a8e] disabled:opacity-50"
                  >
                    {savePolicyMutation.isPending ? "Đang lưu…" : "Lưu"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === "anonymization" && (
        <section role="tabpanel" className="space-y-4">
          <article className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
            <header className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-600" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Ẩn danh hóa định danh hồ sơ sinh viên</h2>
                  <p className="mt-0.5 max-w-3xl text-[11px] leading-4 text-slate-500">
                    Chỉ chọn hồ sơ có toàn bộ kỳ thực tập đã hoàn tất và kỳ gần nhất kết thúc trước mốc lưu trữ.
                    MSSV, Khoa, kỳ thực tập và điểm số học thuật được giữ nguyên.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void previewQuery.refetch()}
                disabled={previewQuery.isFetching}
                className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${previewQuery.isFetching ? "animate-spin" : ""}`} />
                Làm mới bản xem trước
              </button>
            </header>

            {previewQuery.isLoading ? (
              <p role="status" className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin" /> Đang tính số hồ sơ đủ điều kiện…
              </p>
            ) : previewQuery.isError ? (
              <p role="alert" className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {getApiErrorMessage(previewQuery.error)}
              </p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold text-slate-500">Số hồ sơ hiện đủ điều kiện</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                    {eligibleCount.toLocaleString("vi-VN")}
                    <span className="ml-1 text-xs font-medium text-slate-500">sinh viên</span>
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                    <Clock3 className="h-3 w-3" />
                    Kỳ gần nhất kết thúc trước {formatDate(previewQuery.data?.eligibleBefore ?? null)}
                    {" · "}Thời hạn lưu trữ {previewQuery.data?.retentionYears} năm
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmationPhrase("");
                    setUnderstandsPreservedData(false);
                    setShowExecuteDialog(true);
                  }}
                  disabled={!eligibleCount || !previewQuery.data?.isEnabled || previewQuery.isFetching}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-[4px] bg-rose-600 px-4 text-xs font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Thực thi ẩn danh
                </button>
              </div>
            )}
            {previewQuery.data && !previewQuery.data.isEnabled && (
              <div role="alert" className="mt-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Chính sách định danh sinh viên đang tắt. Bật chính sách trong tab Vòng đời lưu trữ để xem trước.
              </div>
            )}
          </article>

          <article className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center gap-2 border-b border-slate-200 px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-[#026aa7]" aria-hidden="true" />
              <div>
                <h2 className="text-xs font-bold text-slate-800">Lịch sử xử lý tuân thủ</h2>
                <p className="text-[10px] text-slate-500">Nhật ký chỉ lưu số lượng và điều kiện xử lý, không lưu dữ liệu định danh.</p>
              </div>
            </header>
            {logsQuery.isError ? (
              <p role="alert" className="m-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {getApiErrorMessage(logsQuery.error)}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Thời điểm</th>
                      <th className="px-3 py-2">Thao tác</th>
                      <th className="px-3 py-2 text-right">Hồ sơ</th>
                      <th className="px-3 py-2">Thời hạn lưu trữ</th>
                      <th className="px-3 py-2">Thực hiện bởi</th>
                      <th className="px-3 py-2">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logsQuery.data?.map((log) => (
                      <tr key={log.id} className="text-slate-700">
                        <td className="whitespace-nowrap px-3 py-2">{formatDate(log.executedAt)}</td>
                        <td className="px-3 py-2 font-medium">{operationTitle(log.operationCode)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{log.affectedCount.toLocaleString("vi-VN")}</td>
                        <td className="px-3 py-2">{log.retentionYears} năm</td>
                        <td className="px-3 py-2">{log.triggeredBy}</td>
                        <td className="px-3 py-2">
                          <span className="rounded-[3px] border border-[#7bc043]/40 bg-[#7bc043]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#385d1b]">
                            {complianceStatusLabel(log.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!logsQuery.isLoading && !logsQuery.data?.length && (
                      <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">Chưa có đợt xử lý tuân thủ.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      )}
      </main>

      {showExecuteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3">
          <section role="dialog" aria-modal="true" aria-labelledby="anonymize-confirm-title" className="w-full max-w-lg rounded-md border border-slate-200 bg-white shadow-xl">
            <header className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 text-rose-600" aria-hidden="true" />
                <div>
                  <h2 id="anonymize-confirm-title" className="text-sm font-bold text-slate-900">Xác nhận ẩn danh hóa dữ liệu</h2>
                  <p className="mt-1 text-xs text-slate-500">Thao tác cập nhật định danh và không thể tự khôi phục.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowExecuteDialog(false)} className="rounded-[4px] p-1 text-slate-500 hover:bg-slate-100" aria-label="Đóng">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="space-y-3 p-4">
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-900">
                Sắp ẩn danh <strong>{eligibleCount.toLocaleString("vi-VN")} hồ sơ</strong>: đổi họ tên/email, xóa điện thoại, gỡ liên kết CV và làm sạch các giá trị PII tương ứng trong audit JSON. MSSV, Khoa và điểm số được giữ lại.
              </div>
              <label className="flex items-start gap-2 text-xs leading-5 text-slate-700">
                <input
                  type="checkbox"
                  checked={understandsPreservedData}
                  onChange={(event) => setUnderstandsPreservedData(event.target.checked)}
                  className="mt-1 accent-[#026aa7]"
                />
                Tôi đã xem bản xem trước, hiểu dữ liệu nào sẽ được thay đổi và xác nhận giữ nguyên MSSV, Khoa, kết quả học thuật.
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Nhập chính xác <span className="font-mono text-rose-700">ANONYMIZE</span> để tiếp tục
                <input
                  className="mt-1 h-9 w-full rounded-[4px] border border-slate-200 bg-white px-2.5 font-mono text-xs focus:border-[#026aa7] focus:outline-none"
                  value={confirmationPhrase}
                  onChange={(event) => setConfirmationPhrase(event.target.value)}
                  autoComplete="off"
                  autoFocus
                />
              </label>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => setShowExecuteDialog(false)} className="h-8 rounded-[4px] border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => executeMutation.mutate()}
                  disabled={!canExecute}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {executeMutation.isPending
                    ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                  Xác nhận thực thi
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
