import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Columns3,
  RotateCcw,
  Save,
} from "lucide-react";
import { PageHeader } from "../../../components/common/PageHeader";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { useGridConfig } from "../../../hooks/useSystemMenu";
import { systemService } from "../../../services/system.service";
import { systemAdminService } from "../../../services/systemAdmin.service";
import type { SysRole } from "../../../types/systemAdmin";
import type { SysGridConfig } from "../../../types/system";
import { DynamicDataGrid } from "../components/DynamicDataGrid";

const FEATURE_OPTIONS = [
  { code: "GRADING_SUMMARY", label: "Bảng Tổng kết Điểm Thực tập" },
  { code: "STUDENTS_LIST", label: "Bảng Danh sách Sinh viên" },
  { code: "LECTURERS_LIST", label: "Bảng Danh sách Giảng viên" },
  { code: "COMPANIES_LIST", label: "Bảng Danh sách Doanh nghiệp" },
] as const;

type FeatureCode = (typeof FEATURE_OPTIONS)[number]["code"];
type ToastHandler = (message: string, type?: "primary" | "success" | "warning" | "danger" | "info") => void;

const DEFAULT_COLUMNS: Record<FeatureCode, SysGridConfig[]> = {
  GRADING_SUMMARY: [
    { fieldCode: "studentCode", headerTitle: "MSSV", columnWidth: 120, isVisible: true, isFrozen: true, frozenSide: "left", sortOrder: 0, cellFormatType: "text" },
    { fieldCode: "studentName", headerTitle: "Họ và tên", columnWidth: 200, isVisible: true, isFrozen: true, frozenSide: "left", sortOrder: 1, cellFormatType: "text" },
    { fieldCode: "className", headerTitle: "Lớp", columnWidth: 110, isVisible: true, isFrozen: false, frozenSide: "left", sortOrder: 2, cellFormatType: "text" },
    { fieldCode: "processScore", headerTitle: "Điểm quá trình", columnWidth: 140, isVisible: true, isFrozen: false, frozenSide: "left", sortOrder: 3, cellFormatType: "number" },
    { fieldCode: "examScore", headerTitle: "Điểm cuối kỳ", columnWidth: 130, isVisible: true, isFrozen: false, frozenSide: "left", sortOrder: 4, cellFormatType: "number" },
    { fieldCode: "totalScore", headerTitle: "Điểm tổng kết", columnWidth: 140, isVisible: true, isFrozen: false, frozenSide: "left", sortOrder: 5, cellFormatType: "number" },
    { fieldCode: "grade", headerTitle: "Xếp loại", columnWidth: 110, isVisible: true, isFrozen: false, frozenSide: "left", sortOrder: 6, cellFormatType: "text" },
  ],
  STUDENTS_LIST: [
    { fieldCode: "studentCode", headerTitle: "MSSV", columnWidth: 120, isVisible: true, isFrozen: true, frozenSide: "left", sortOrder: 0, cellFormatType: "text" },
    { fieldCode: "fullName", headerTitle: "Họ và tên", columnWidth: 200, isVisible: true, isFrozen: true, frozenSide: "left", sortOrder: 1, cellFormatType: "text" },
    { fieldCode: "class", headerTitle: "Lớp", columnWidth: 110, isVisible: true, isFrozen: false, frozenSide: "left", sortOrder: 2, cellFormatType: "text" },
    { fieldCode: "email", headerTitle: "Email", columnWidth: 220, isVisible: true, isFrozen: false, frozenSide: "left", sortOrder: 3, cellFormatType: "text" },
    { fieldCode: "phone", headerTitle: "Điện thoại", columnWidth: 140, isVisible: true, isFrozen: false, frozenSide: "left", sortOrder: 4, cellFormatType: "text" },
    { fieldCode: "status", headerTitle: "Trạng thái", columnWidth: 130, isVisible: true, isFrozen: false, frozenSide: "left", sortOrder: 5, cellFormatType: "text" },
  ],
  LECTURERS_LIST: [
    { fieldCode: "staffCode", headerTitle: "Mã giảng viên", columnWidth: 140, isVisible: true, isFrozen: true, frozenSide: "left", sortOrder: 0, cellFormatType: "text" },
    { fieldCode: "fullName", headerTitle: "Họ và tên", columnWidth: 200, isVisible: true, isFrozen: true, frozenSide: "left", sortOrder: 1, cellFormatType: "text" },
    { fieldCode: "department", headerTitle: "Khoa", columnWidth: 160, isVisible: true, isFrozen: false, frozenSide: "left", sortOrder: 2, cellFormatType: "text" },
    { fieldCode: "email", headerTitle: "Email", columnWidth: 220, isVisible: true, isFrozen: false, frozenSide: "left", sortOrder: 3, cellFormatType: "text" },
    { fieldCode: "phone", headerTitle: "Điện thoại", columnWidth: 140, isVisible: true, isFrozen: false, frozenSide: "left", sortOrder: 4, cellFormatType: "text" },
  ],
  COMPANIES_LIST: [
    { fieldCode: "companyCode", headerTitle: "Mã doanh nghiệp", columnWidth: 150, isVisible: true, isFrozen: true, frozenSide: "left", sortOrder: 0, cellFormatType: "text" },
    { fieldCode: "companyName", headerTitle: "Tên doanh nghiệp", columnWidth: 220, isVisible: true, isFrozen: true, frozenSide: "left", sortOrder: 1, cellFormatType: "text" },
    { fieldCode: "industry", headerTitle: "Lĩnh vực", columnWidth: 170, isVisible: true, isFrozen: false, frozenSide: "left", sortOrder: 2, cellFormatType: "text" },
    { fieldCode: "address", headerTitle: "Địa chỉ", columnWidth: 240, isVisible: true, isFrozen: false, frozenSide: "left", sortOrder: 3, cellFormatType: "text" },
    { fieldCode: "contactEmail", headerTitle: "Email liên hệ", columnWidth: 220, isVisible: true, isFrozen: false, frozenSide: "left", sortOrder: 4, cellFormatType: "text" },
    { fieldCode: "status", headerTitle: "Trạng thái", columnWidth: 130, isVisible: true, isFrozen: false, frozenSide: "left", sortOrder: 5, cellFormatType: "text" },
  ],
};

function getDefaultGridConfig(featureCode: FeatureCode): SysGridConfig[] {
  return DEFAULT_COLUMNS[featureCode].map((column) => ({
    ...column,
    frozenSide: column.frozenSide ?? "left",
  }));
}

function normalizeColumns(columns: SysGridConfig[]): SysGridConfig[] {
  return [...columns]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((column, sortOrder) => ({ ...column, sortOrder }));
}

function reorderColumns(
  columns: SysGridConfig[],
  index: number,
  offset: -1 | 1,
): SysGridConfig[] {
  const targetIndex = index + offset;
  if (targetIndex < 0 || targetIndex >= columns.length) return columns;

  const next = [...columns];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return normalizeColumns(next);
}

export function GridConfigStudioView({
  onShowToast,
}: {
  onShowToast: ToastHandler;
}) {
  const [featureCode, setFeatureCode] = useState<FeatureCode>("GRADING_SUMMARY");
  const [roleId, setRoleId] = useState<number | null>(null);
  const [columns, setColumns] = useState<SysGridConfig[]>(() => getDefaultGridConfig("GRADING_SUMMARY"));
  const queryClient = useQueryClient();
  const rolesQuery = useQuery({
    queryKey: ["system-admin", "roles"],
    queryFn: systemAdminService.getRoles,
  });
  const configQuery = useGridConfig(featureCode, true, roleId);

  useEffect(() => {
    if (configQuery.data) {
      setColumns(normalizeColumns(
        configQuery.data.length > 0
          ? configQuery.data
          : getDefaultGridConfig(featureCode),
      ));
    }
  }, [configQuery.data, featureCode]);

  const saveMutation = useMutation({
    mutationFn: (payload: SysGridConfig[]) =>
      systemService.saveGridConfig(featureCode, payload, roleId ?? undefined),
    onSuccess: (saved) => {
      const normalized = normalizeColumns(saved);
      setColumns(normalized);
      queryClient.setQueryData(["system-grid-config", featureCode, roleId, false], normalized);
      onShowToast("Đã lưu cấu hình bảng thành công.", "success");
    },
    onError: (error) => {
      onShowToast(`Không thể lưu cấu hình bảng. ${getApiErrorMessage(error)}`, "danger");
    },
  });

  const changeFeature = (value: string) => {
    const nextFeature = value as FeatureCode;
    setFeatureCode(nextFeature);
    setColumns(getDefaultGridConfig(nextFeature));
  };

  const changeRole = (value: string) => {
    const nextRoleId = value ? Number(value) : null;
    setRoleId(nextRoleId);
    setColumns(getDefaultGridConfig(featureCode));
  };

  const updateColumn = (
    index: number,
    patch: Partial<SysGridConfig>,
  ) => {
    setColumns((current) =>
      current.map((column, currentIndex) =>
        currentIndex === index ? { ...column, ...patch } : column,
      ),
    );
  };

  const save = () => {
    if (columns.some((column) => !column.headerTitle.trim())) {
      onShowToast("Tiêu đề hiển thị không được để trống.", "warning");
      return;
    }
    saveMutation.mutate(normalizeColumns(columns));
  };

  const restoreDefaults = () => {
    setColumns(getDefaultGridConfig(featureCode));
    onShowToast("Đã khôi phục cấu hình mặc định trên bản xem trước. Hãy lưu để áp dụng.");
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 animate-in fade-in duration-200 font-sans pb-12">
      <PageHeader
        icon={Columns3}
        title="Cấu hình bảng"
        subtitle="Tùy chỉnh tiêu đề, khả năng hiển thị, màu sắc và độ rộng cột cho từng màn hình."
        badge="GRID STUDIO"
        badgeColor="border-[#026aa7]/20 bg-[#026aa7]/5 text-[#026aa7]"
      >
        <button
          type="button"
          onClick={restoreDefaults}
          className="il-btn il-btn-secondary inline-flex items-center gap-2"
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Khôi phục mặc định
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saveMutation.isPending || configQuery.isPending || (roleId !== null && rolesQuery.isLoading)}
          className="il-btn il-btn-primary inline-flex items-center gap-2 disabled:pointer-events-none disabled:opacity-50"
        >
          <Save aria-hidden="true" className={`h-4 w-4 ${saveMutation.isPending ? "animate-pulse" : ""}`} />
          {saveMutation.isPending ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </PageHeader>

      <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5">
        <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
          <div className="space-y-1.5">
            <label htmlFor="grid-feature-select" className="text-sm font-semibold text-slate-800">
              Màn hình cần cấu hình
            </label>
            <select
              id="grid-feature-select"
              value={featureCode}
              onChange={(event) => changeFeature(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#026aa7] focus:ring-2 focus:ring-[#026aa7]/10"
            >
              {FEATURE_OPTIONS.map((feature) => (
                <option key={feature.code} value={feature.code}>
                  {feature.label} · {feature.code}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="grid-role-select" className="text-sm font-semibold text-slate-800">
              Vai trò áp dụng
            </label>
            <select
              id="grid-role-select"
              value={roleId ?? ""}
              onChange={(event) => changeRole(event.target.value)}
              disabled={rolesQuery.isLoading}
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#026aa7] focus:ring-2 focus:ring-[#026aa7]/10"
            >
              <option value="">Mặc định toàn hệ thống</option>
              {rolesQuery.data?.map((role: SysRole) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Kéo không bắt buộc: dùng các nút mũi tên để đổi thứ tự, đặt độ rộng từ 60 đến 400 px.
            Thay đổi chỉ được áp dụng sau khi lưu.
          </p>
        </div>
        {rolesQuery.isError && (
          <p role="alert" className="mt-3 text-sm text-rose-700">
            Không thể tải danh sách vai trò. Cấu hình mặc định vẫn có thể chỉnh sửa.
          </p>
        )}
      </section>

      {configQuery.isError ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Không thể tải cấu hình cột. Vui lòng tải lại trang hoặc thử lại sau.
          <button
            type="button"
            onClick={() => void configQuery.refetch()}
            className="ml-2 font-semibold underline underline-offset-2"
          >
            Thử lại
          </button>
        </div>
      ) : (
        <section aria-labelledby="grid-columns-heading" className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
            <div>
              <h2 id="grid-columns-heading" className="font-semibold text-slate-900">
                Danh sách cột
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">{columns.length} trường cấu hình</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-600">
              {featureCode}
            </span>
          </div>

          {configQuery.isPending ? (
            <p role="status" className="p-6 text-sm text-slate-500">Đang tải cấu hình cột...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th scope="col" className="px-3 py-3">Trường / Tiêu đề</th>
                    <th scope="col" className="px-3 py-3 text-center">Hiển thị</th>
                    <th scope="col" className="px-3 py-3 text-center">Ghim cố định</th>
                    <th scope="col" className="w-56 px-3 py-3">Độ rộng</th>
                    <th scope="col" className="px-3 py-3">Màu header / chữ</th>
                    <th scope="col" className="px-3 py-3 text-center">Thứ tự</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {columns.map((column, index) => (
                    <tr key={column.fieldCode} className="align-middle">
                      <td className="min-w-64 px-3 py-3">
                        <code className="mb-1 block text-[11px] font-semibold text-[#026aa7]">
                          {column.fieldCode}
                        </code>
                        <label className="sr-only" htmlFor={`grid-title-${column.fieldCode}`}>
                          Tiêu đề hiển thị cho {column.fieldCode}
                        </label>
                        <input
                          id={`grid-title-${column.fieldCode}`}
                          type="text"
                          value={column.headerTitle}
                          onChange={(event) => updateColumn(index, { headerTitle: event.target.value })}
                          className="min-h-10 w-full rounded-md border border-slate-300 px-2.5 text-sm outline-none focus:border-[#026aa7] focus:ring-2 focus:ring-[#026aa7]/10"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={column.isVisible}
                          onChange={(event) => updateColumn(index, { isVisible: event.target.checked })}
                          aria-label={`${column.isVisible ? "Ẩn" : "Hiện"} cột ${column.headerTitle}`}
                          className="h-5 w-5 rounded border-slate-300 accent-[#026aa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] focus-visible:ring-offset-2"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <label className="sr-only" htmlFor={`grid-frozen-${column.fieldCode}`}>
                          Vị trí ghim {column.headerTitle}
                        </label>
                        <select
                          id={`grid-frozen-${column.fieldCode}`}
                          value={column.isFrozen ? column.frozenSide ?? "left" : ""}
                          onChange={(event) => updateColumn(index, {
                            isFrozen: Boolean(event.target.value),
                            frozenSide: event.target.value === "right" ? "right" : "left",
                          })}
                          aria-label={`Vị trí ghim ${column.headerTitle}`}
                          className="min-h-10 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none focus:border-[#026aa7] focus:ring-2 focus:ring-[#026aa7]/10"
                        >
                          <option value="">Không ghim</option>
                          <option value="left">Bên trái</option>
                          <option value="right">Bên phải</option>
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={60}
                            max={400}
                            step={10}
                            value={column.columnWidth}
                            onChange={(event) => updateColumn(index, { columnWidth: Number(event.target.value) })}
                            aria-label={`Điều chỉnh độ rộng cột ${column.headerTitle}`}
                            className="min-w-20 flex-1 accent-[#026aa7]"
                          />
                          <label className="sr-only" htmlFor={`grid-width-${column.fieldCode}`}>
                            Độ rộng cột {column.headerTitle} (px)
                          </label>
                          <input
                            id={`grid-width-${column.fieldCode}`}
                            type="number"
                            min={60}
                            max={400}
                            step={1}
                            value={column.columnWidth}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              if (Number.isFinite(value))
                                updateColumn(index, {
                                  columnWidth: Math.min(400, Math.max(60, Math.round(value))),
                                });
                            }}
                            className="min-h-10 w-20 rounded-md border border-slate-300 px-2 text-right tabular-nums outline-none focus:border-[#026aa7] focus:ring-2 focus:ring-[#026aa7]/10"
                          />
                          <span className="text-xs text-slate-500">px</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs text-slate-600">
                            <input
                              type="color"
                              value={column.headerBgColor ?? "#f1f5f9"}
                              onChange={(event) => updateColumn(index, { headerBgColor: event.target.value })}
                              aria-label={`Màu nền header ${column.headerTitle}`}
                              className="h-9 w-10 cursor-pointer rounded border border-slate-300 bg-white p-1"
                            />
                            Nền
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-slate-600">
                            <input
                              type="color"
                              value={column.headerTextColor ?? "#1e293b"}
                              onChange={(event) => updateColumn(index, { headerTextColor: event.target.value })}
                              aria-label={`Màu chữ header ${column.headerTitle}`}
                              className="h-9 w-10 cursor-pointer rounded border border-slate-300 bg-white p-1"
                            />
                            Chữ
                          </label>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setColumns((current) => reorderColumns(current, index, -1))}
                            disabled={index === 0}
                            aria-label={`Chuyển ${column.headerTitle} lên`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-[#026aa7]/5 hover:text-[#026aa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowUp aria-hidden="true" className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setColumns((current) => reorderColumns(current, index, 1))}
                            disabled={index === columns.length - 1}
                            aria-label={`Chuyển ${column.headerTitle} xuống`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-[#026aa7]/5 hover:text-[#026aa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowDown aria-hidden="true" className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="grid-preview-heading" className="space-y-3">
        <div>
          <h2 id="grid-preview-heading" className="text-lg font-semibold text-slate-900">
            Xem trước trực tiếp
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Thay đổi tiêu đề, độ rộng, màu sắc và vị trí ghim được phản ánh ngay; cấu hình chỉ áp dụng sau khi lưu.
          </p>
        </div>
        <DynamicDataGrid
          featureCode={featureCode}
          rows={[]}
          configOverride={columns}
          loadingMessage="Đang dựng bản xem trước..."
          emptyMessage="Bản xem trước cấu hình không tải dữ liệu nghiệp vụ."
        />
      </section>
    </div>
  );
}
