import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ClipboardList,
  Columns3,
  FileSliders,
  FileSpreadsheet,
  FileText,
  Folder,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Shield,
  ScrollText,
  Trash2,
  Users,
} from "lucide-react";
import { CompactActionBar } from "../../../components/common/CompactActionBar";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { systemService } from "../../../services/system.service";
import type { SaveSysFunction, SysFunction } from "../../../types/system";

type ToastHandler = (message: string, type?: "primary" | "success" | "warning" | "danger" | "info") => void;

const MODULES = [
  { code: "SYSTEM", label: "Hệ thống" },
  { code: "STUDENT", label: "Sinh viên" },
  { code: "LECTURER", label: "Giảng viên" },
  { code: "COMPANY", label: "Doanh nghiệp" },
  { code: "EVALUATION", label: "Đánh giá" },
  { code: "ACCREDITATION", label: "Khảo thí" },
] as const;

const ICONS = {
  Folder,
  Users,
  Settings,
  FileText,
  Shield,
  ClipboardList,
  Columns3,
  FileSliders,
  FileSpreadsheet,
  ScrollText,
} as const;

const EMPTY_DRAFT: SaveSysFunction = {
  code: "",
  name: "",
  moduleCode: "SYSTEM",
  description: null,
  parentId: null,
  sortOrder: 1,
  isAction: false,
  isActive: true,
  funcUrl: null,
  iconName: "Folder",
  badgeText: null,
  isVisibleInMenu: true,
  isView: true,
  isNew: true,
  isEdit: true,
  isDelete: true,
  isExport: true,
};

function flattenTree(items: SysFunction[]): SysFunction[] {
  return items.flatMap((item) => [item, ...flattenTree(item.children)]);
}

function findFunction(items: SysFunction[], id: string): SysFunction | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const child = findFunction(item.children, id);
    if (child) return child;
  }
  return undefined;
}

function collectDescendantIds(item: SysFunction): Set<string> {
  return new Set([item.id, ...item.children.flatMap((child) => [...collectDescendantIds(child)])]);
}

function reorderSibling(
  items: SysFunction[],
  id: string,
  offset: -1 | 1,
): { tree: SysFunction[]; changed: boolean } {
  const index = items.findIndex((item) => item.id === id);
  if (index >= 0) {
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= items.length) return { tree: items, changed: false };
    const next = [...items];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    return {
      tree: next.map((item, sortOrder) => ({ ...item, sortOrder })),
      changed: true,
    };
  }

  for (let index = 0; index < items.length; index += 1) {
    const childResult = reorderSibling(items[index].children, id, offset);
    if (childResult.changed) {
      const next = [...items];
      next[index] = { ...items[index], children: childResult.tree };
      return { tree: next, changed: true };
    }
  }
  return { tree: items, changed: false };
}

function toSaveRequest(draft: SaveSysFunction): SaveSysFunction {
  return {
    ...draft,
    code: draft.code?.trim(),
    name: draft.name.trim(),
    moduleCode: draft.moduleCode.trim(),
    description: draft.description?.trim() || null,
    funcUrl: draft.funcUrl?.trim() || null,
    iconName: draft.iconName?.trim() || "Folder",
    badgeText: draft.badgeText?.trim() || null,
  };
}

export function SysFunctionsManagerView({
  onShowToast,
}: {
  onShowToast: ToastHandler;
}) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState<SaveSysFunction>(EMPTY_DRAFT);
  const treeQuery = useQuery({
    queryKey: ["system-functions", "tree"],
    queryFn: () => systemService.getFunctionTree(true),
    retry: false,
  });
  const tree = treeQuery.data ?? [];
  const selected = selectedId ? findFunction(tree, selectedId) : undefined;
  const flattened = useMemo(() => flattenTree(tree), [tree]);
  const excludedParents = selected ? collectDescendantIds(selected) : new Set<string>();

  useEffect(() => {
    if (isCreating) return;
    if (!selected) {
      setDraft(EMPTY_DRAFT);
      return;
    }
    setDraft({
      code: selected.code,
      name: selected.name,
      moduleCode: selected.moduleCode,
      description: selected.description,
      parentId: selected.parentId,
      sortOrder: selected.sortOrder,
      isAction: selected.isAction,
      isActive: selected.isActive,
      funcUrl: selected.funcUrl,
      iconName: selected.iconName,
      badgeText: selected.badgeText,
      isVisibleInMenu: selected.isVisibleInMenu,
      isView: selected.isView,
      isNew: selected.isNew,
      isEdit: selected.isEdit,
      isDelete: selected.isDelete,
      isExport: selected.isExport,
    });
  }, [isCreating, selected]);

  const refreshTree = () =>
    queryClient.invalidateQueries({ queryKey: ["system-functions", "tree"] });
  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = toSaveRequest(draft);
      return isCreating
        ? systemService.createFunction(payload)
        : systemService.updateFunction(selectedId!, payload);
    },
    onSuccess: async (saved) => {
      await refreshTree();
      setSelectedId(saved.id);
      setIsCreating(false);
      onShowToast("Đã lưu chức năng.", "success");
    },
    onError: (error) => onShowToast(`Không thể lưu chức năng. ${getApiErrorMessage(error)}`, "danger"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => systemService.deleteFunction(id),
    onSuccess: async () => {
      await refreshTree();
      setSelectedId(null);
      setIsCreating(false);
      onShowToast("Đã xóa chức năng.", "success");
    },
    onError: (error) => onShowToast(`Không thể xóa chức năng. ${getApiErrorMessage(error)}`, "danger"),
  });
  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; newParentId: string | null; newSortPriority: number }[]) =>
      systemService.reorderFunctions(items),
    onSuccess: () => void refreshTree(),
    onError: (error) => onShowToast(`Không thể sắp xếp chức năng. ${getApiErrorMessage(error)}`, "danger"),
  });

  const startCreate = () => {
    setSelectedId(null);
    setIsCreating(true);
    setDraft({
      ...EMPTY_DRAFT,
      parentId: selected?.id ?? null,
      moduleCode: selected?.moduleCode ?? "SYSTEM",
      sortOrder: selected ? selected.children.length : tree.length,
    });
  };

  const move = (id: string, offset: -1 | 1) => {
    const result = reorderSibling(tree, id, offset);
    if (!result.changed) return;
    reorderMutation.mutate(flattenTree(result.tree).map((item) => ({
      id: item.id,
      newParentId: item.parentId,
      newSortPriority: item.sortOrder,
    })));
  };

  const renderNode = (item: SysFunction, depth = 0): React.ReactNode => (
    <li key={item.id}>
      <div
        className={`flex min-h-11 items-center gap-1 rounded-lg border px-2 ${
          selectedId === item.id
            ? "border-[#026aa7]/40 bg-[#026aa7]/5"
            : "border-transparent hover:bg-slate-50"
        }`}
        style={{ marginLeft: depth * 14 }}
      >
        <button
          type="button"
          onClick={() => {
            setIsCreating(false);
            setSelectedId(item.id);
          }}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7]"
          aria-current={selectedId === item.id ? "true" : undefined}
        >
          <Folder aria-hidden="true" className="h-4 w-4 shrink-0 text-[#026aa7]" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-slate-800">{item.name}</span>
            <span className="block truncate font-mono text-[10px] text-slate-500">{item.code}</span>
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            item.isVisibleInMenu ? "bg-[#7bc043]/15 text-[#355b12]" : "bg-slate-100 text-slate-600"
          }`}>
            {item.isVisibleInMenu ? "Hiển thị" : "Ẩn"}
          </span>
        </button>
        <button
          type="button"
          aria-label={`Đưa ${item.name} lên`}
          disabled={reorderMutation.isPending}
          onClick={() => move(item.id, -1)}
          className="flex h-9 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:opacity-50"
        >
          <ArrowUp aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={`Đưa ${item.name} xuống`}
          disabled={reorderMutation.isPending}
          onClick={() => move(item.id, 1)}
          className="flex h-9 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:opacity-50"
        >
          <ArrowDown aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      {item.children.length > 0 && (
        <ul className="mt-1 space-y-1">
          {item.children.map((child) => renderNode(child, depth + 1))}
        </ul>
      )}
    </li>
  );

  const updateDraft = <K extends keyof SaveSysFunction>(key: K, value: SaveSysFunction[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const selectedIcon = ICONS[draft.iconName as keyof typeof ICONS] ?? Folder;

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-200 font-sans pb-12">
      <CompactActionBar
        icon={Settings}
        title="Quản lý Danh mục Chức năng & Cấu trúc Mega-Menu"
        subtitle="Tổ chức cây chức năng, liên kết màn hình và điều chỉnh quyền khả dụng."
        badge="FUNCTION STUDIO"
        badgeColor="border-[#026aa7]/20 bg-[#026aa7]/5 text-[#026aa7]"
      >
        <button type="button" onClick={startCreate} className="il-btn il-btn-primary inline-flex items-center gap-2">
          <Plus aria-hidden="true" className="h-4 w-4" />
          Thêm chức năng mới
        </button>
        <button
          type="button"
          onClick={() => void treeQuery.refetch()}
          disabled={treeQuery.isFetching}
          className="il-btn il-btn-secondary inline-flex items-center gap-2"
        >
          <RefreshCw aria-hidden="true" className={`h-4 w-4 ${treeQuery.isFetching ? "animate-spin" : ""}`} />
          Tải lại cây
        </button>
      </CompactActionBar>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]">
        <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5" aria-label="Cây chức năng">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Cây chức năng</h2>
              <p className="mt-1 text-xs text-slate-500">Dùng nút lên/xuống để sắp xếp; chọn chức năng để chỉnh sửa.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {flattened.length} mục
            </span>
          </div>
          {treeQuery.isPending ? (
            <p role="status" className="py-12 text-center text-xs text-slate-500">Đang tải cây chức năng...</p>
          ) : treeQuery.isError ? (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
              Không thể tải cây chức năng. {getApiErrorMessage(treeQuery.error)}
            </div>
          ) : tree.length === 0 ? (
            <div className="py-12 text-center">
              <Folder aria-hidden="true" className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-xs font-semibold text-slate-700">Chưa có chức năng</p>
              <p className="mt-1 text-[11px] text-slate-500">Thêm chức năng đầu tiên để bắt đầu cấu hình menu.</p>
            </div>
          ) : (
            <ul className="space-y-1">{tree.map((item) => renderNode(item))}</ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs sm:p-5" aria-label="Chi tiết chức năng">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                {isCreating ? "Tạo chức năng" : selected ? "Chi tiết chức năng" : "Chọn chức năng"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">Các trường có dấu * là bắt buộc.</p>
            </div>
            {!isCreating && selected && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Xóa chức năng "${selected.name}"?`))
                    deleteMutation.mutate(selected.id);
                }}
                disabled={deleteMutation.isPending}
                aria-label={`Xóa ${selected.name}`}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </div>
          {!isCreating && !selected ? (
            <div className="rounded-lg bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
              Chọn một chức năng trong cây hoặc bấm “Thêm chức năng mới”.
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                saveMutation.mutate();
              }}
            >
              <div className="space-y-1">
                <label htmlFor="function-code" className="text-xs font-semibold text-slate-700">Mã chức năng *</label>
                <input
                  id="function-code"
                  value={draft.code ?? ""}
                  onChange={(event) => updateDraft("code", event.target.value)}
                  disabled={!isCreating}
                  required
                  maxLength={100}
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-800 focus:border-[#026aa7] focus:outline-none focus:ring-2 focus:ring-[#026aa7]/15 disabled:bg-slate-100"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="function-name" className="text-xs font-semibold text-slate-700">Tên chức năng *</label>
                <input
                  id="function-name"
                  value={draft.name}
                  onChange={(event) => updateDraft("name", event.target.value)}
                  required
                  maxLength={200}
                  className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-[#026aa7] focus:outline-none focus:ring-2 focus:ring-[#026aa7]/15"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="function-description" className="text-xs font-semibold text-slate-700">Mô tả</label>
                <textarea
                  id="function-description"
                  value={draft.description ?? ""}
                  onChange={(event) => updateDraft("description", event.target.value || null)}
                  maxLength={500}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#026aa7] focus:outline-none focus:ring-2 focus:ring-[#026aa7]/15"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="function-module" className="text-xs font-semibold text-slate-700">Nhóm Module *</label>
                  <select
                    id="function-module"
                    value={draft.moduleCode}
                    onChange={(event) => updateDraft("moduleCode", event.target.value)}
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-[#026aa7] focus:outline-none focus:ring-2 focus:ring-[#026aa7]/15"
                  >
                    {MODULES.map((module) => <option key={module.code} value={module.code}>{module.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="function-parent" className="text-xs font-semibold text-slate-700">Chức năng cha</label>
                  <select
                    id="function-parent"
                    value={draft.parentId ?? ""}
                    onChange={(event) => updateDraft("parentId", event.target.value || null)}
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-[#026aa7] focus:outline-none focus:ring-2 focus:ring-[#026aa7]/15"
                  >
                    <option value="">Không có (mục cấp cao nhất)</option>
                    {flattened
                      .filter((item) => !excludedParents.has(item.id) && item.id !== selectedId)
                      .map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="function-url" className="text-xs font-semibold text-slate-700">Đường dẫn (URL)</label>
                  <input
                    id="function-url"
                    value={draft.funcUrl ?? ""}
                    onChange={(event) => updateDraft("funcUrl", event.target.value)}
                    placeholder="/admin/students"
                    maxLength={500}
                    className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-[#026aa7] focus:outline-none focus:ring-2 focus:ring-[#026aa7]/15"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="function-icon" className="text-xs font-semibold text-slate-700">Icon Lucide</label>
                  <div className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3">
                    {(() => {
                      const PreviewIcon = selectedIcon;
                      return <PreviewIcon aria-hidden="true" className="h-4 w-4 text-[#026aa7]" />;
                    })()}
                    <select
                      id="function-icon"
                      value={draft.iconName ?? "Folder"}
                      onChange={(event) => updateDraft("iconName", event.target.value)}
                      className="min-h-10 flex-1 bg-transparent text-sm outline-none"
                    >
                      {Object.keys(ICONS).map((icon) => <option key={icon} value={icon}>{icon}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="function-badge" className="text-xs font-semibold text-slate-700">Huy hiệu</label>
                  <input
                    id="function-badge"
                    value={draft.badgeText ?? ""}
                    onChange={(event) => updateDraft("badgeText", event.target.value)}
                    placeholder="Mới, Beta..."
                    maxLength={50}
                    className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-[#026aa7] focus:outline-none focus:ring-2 focus:ring-[#026aa7]/15"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="function-sort" className="text-xs font-semibold text-slate-700">Thứ tự ưu tiên</label>
                  <input
                    id="function-sort"
                    type="number"
                    value={draft.sortOrder}
                    onChange={(event) => updateDraft("sortOrder", Number(event.target.value))}
                    className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-[#026aa7] focus:outline-none focus:ring-2 focus:ring-[#026aa7]/15"
                  />
                </div>
              </div>
              <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3">
                <legend className="px-1 text-xs font-semibold text-slate-700">Quyền khả dụng</legend>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["isView", "Xem"],
                    ["isNew", "Thêm"],
                    ["isEdit", "Sửa"],
                    ["isDelete", "Xóa"],
                    ["isExport", "Xuất dữ liệu"],
                  ] as const).map(([field, label]) => (
                    <label key={field} className="flex min-h-9 items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={draft[field]}
                        onChange={(event) => updateDraft(field, event.target.checked)}
                        className="h-4 w-4 accent-[#026aa7]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  ["isVisibleInMenu", "Hiển thị trên Mega-Menu"],
                  ["isAction", "Là chức năng thao tác"],
                  ["isActive", "Đang hoạt động"],
                ].map(([field, label]) => (
                  <label key={field} className="flex min-h-9 items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={draft[field as keyof SaveSysFunction] as boolean}
                      onChange={(event) => updateDraft(field as keyof SaveSysFunction, event.target.checked)}
                      className="h-4 w-4 accent-[#026aa7]"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="flex justify-end border-t border-slate-100 pt-3">
                <button
                  type="submit"
                  disabled={saveMutation.isPending || treeQuery.isPending}
                  className="il-btn il-btn-primary inline-flex items-center gap-2 disabled:pointer-events-none disabled:opacity-50"
                >
                  <Save aria-hidden="true" className="h-4 w-4" />
                  {saveMutation.isPending ? "Đang lưu..." : "Lưu chức năng"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
