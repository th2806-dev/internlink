import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArchiveRestore,
  Clock3,
  DatabaseBackup,
  Download,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Panel } from "../../../components/common/Panel";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { getApiErrorMessage } from "../../../lib/apiClient";
import { adminBackupsService, type BackupFile } from "../../../services/adminBackups.service";
import type { ToastType } from "../../../contexts/ToastContext";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} ${units[unitIndex]}`;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Không rõ thời gian"
    : date.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
}

export function BackupsView({
  onShowToast,
}: {
  onShowToast: (message: string, type?: ToastType) => void;
}) {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [busyFile, setBusyFile] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BackupFile | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupFile | null>(null);
  const [restoreConfirmation, setRestoreConfirmation] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setBackups(await adminBackupsService.getAll());
    } catch (error) {
      const message = getApiErrorMessage(error);
      setLoadError(message);
      onShowToast(`Không thể tải danh sách bản sao lưu: ${message}`, "danger");
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createBackup = async () => {
    setIsCreating(true);
    try {
      const backup = await adminBackupsService.create();
      onShowToast(`Đã tạo bản sao lưu ${backup.fileName}.`, "success");
      await refresh();
    } catch (error) {
      onShowToast(`Tạo bản sao lưu thất bại: ${getApiErrorMessage(error)}`, "danger");
    } finally {
      setIsCreating(false);
    }
  };

  const downloadBackup = async (backup: BackupFile) => {
    setBusyFile(backup.fileName);
    try {
      await adminBackupsService.download(backup.fileName);
    } catch (error) {
      onShowToast(`Tải bản sao lưu thất bại: ${getApiErrorMessage(error)}`, "danger");
    } finally {
      setBusyFile(null);
    }
  };

  const deleteBackup = async () => {
    if (!deleteTarget) return;
    setBusyFile(deleteTarget.fileName);
    try {
      await adminBackupsService.delete(deleteTarget.fileName);
      onShowToast(`Đã xóa bản sao lưu ${deleteTarget.fileName}.`, "success");
      setDeleteTarget(null);
      await refresh();
    } catch (error) {
      onShowToast(`Xóa bản sao lưu thất bại: ${getApiErrorMessage(error)}`, "danger");
    } finally {
      setBusyFile(null);
    }
  };

  const restoreBackup = async () => {
    if (!restoreTarget || restoreConfirmation !== "RESTORE") return;
    setBusyFile(restoreTarget.fileName);
    try {
      await adminBackupsService.restore(restoreTarget.fileName);
      onShowToast(
        `Đã khôi phục database từ ${restoreTarget.fileName}. Hệ thống đã lưu một bản dự phòng trước khi khôi phục.`,
        "success",
      );
      setRestoreTarget(null);
      setRestoreConfirmation("");
      await refresh();
    } catch (error) {
      onShowToast(`Khôi phục thất bại: ${getApiErrorMessage(error)}`, "danger");
    } finally {
      setBusyFile(null);
    }
  };

  const renderBackupActions = (backup: BackupFile) => {
    const isBusy = busyFile === backup.fileName;
    return (
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => void downloadBackup(backup)}
          disabled={isBusy || isCreating}
          aria-label={`Tải xuống ${backup.fileName}`}
          title="Tải xuống"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-[#026aa7]/5 hover:text-[#026aa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:opacity-50"
        >
          {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => {
            setRestoreTarget(backup);
            setRestoreConfirmation("");
          }}
          disabled={isBusy || isCreating}
          aria-label={`Khôi phục từ ${backup.fileName}`}
          title="Khôi phục database"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-amber-700 transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:opacity-50"
        >
          <ArchiveRestore className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setDeleteTarget(backup)}
          disabled={isBusy || isCreating}
          aria-label={`Xóa ${backup.fileName}`}
          title="Xóa bản sao lưu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 pb-12">
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#026aa7] px-4 py-3 text-white">
          <div className="flex min-w-0 items-center gap-2">
            <DatabaseBackup className="h-5 w-5 shrink-0 text-white/90" aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-wide">Sao lưu &amp; Khôi phục</h1>
              <p className="mt-0.5 text-xs text-white/80">
                Quản lý các tệp sao lưu database toàn hệ thống
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={isLoading}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
              Làm mới
            </button>
            <button
              type="button"
              onClick={() => void createBackup()}
              disabled={isCreating || isLoading}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white px-3 text-xs font-bold text-[#026aa7] transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <DatabaseBackup className="h-4 w-4" aria-hidden="true" />}
              {isCreating ? "Đang sao lưu…" : "Tạo bản sao lưu"}
            </button>
          </div>
        </div>
      </section>

      <Panel padding="none" className="overflow-hidden rounded-xl border-slate-200/90 shadow-2xs">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-900">Danh sách bản sao lưu</h2>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {isLoading ? "…" : backups.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isLoading}
            className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#026aa7] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Tải lại
          </button>
        </div>

        {loadError && (
          <div role="alert" className="flex flex-col gap-2 border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
            <span>{loadError}</span>
            <button type="button" onClick={() => void refresh()} disabled={isLoading} className="inline-flex min-h-9 items-center justify-center rounded-md border border-rose-300 bg-white px-3 font-semibold transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto">
              Thử lại
            </button>
          </div>
        )}

        <div className="divide-y divide-slate-100 md:hidden">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">Đang tải danh sách…</p>
          ) : loadError ? null : backups.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <DatabaseBackup className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-700">Chưa có bản sao lưu</p>
              <p className="mt-1 text-xs text-slate-500">Tạo bản sao lưu đầu tiên để có thể khôi phục dữ liệu khi cần.</p>
            </div>
          ) : backups.map((backup) => (
            <article key={backup.fileName} className="space-y-2 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-all text-sm font-semibold text-slate-900">{backup.fileName}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock3 className="h-3.5 w-3.5 shrink-0" /> {formatTimestamp(backup.createdAt)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{formatBytes(backup.sizeBytes)}</p>
                </div>
                {renderBackupActions(backup)}
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Tên tệp</th>
                <th className="px-4 py-3">Thời gian tạo</th>
                <th className="px-4 py-3 text-right">Dung lượng</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Đang tải danh sách…</td></tr>
              ) : loadError ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Không thể hiển thị dữ liệu khi tải thất bại.</td></tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <DatabaseBackup className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-700">Chưa có bản sao lưu</p>
                    <p className="mt-1 text-xs text-slate-500">Tạo bản sao lưu đầu tiên để có thể khôi phục dữ liệu khi cần.</p>
                  </td>
                </tr>
              ) : backups.map((backup) => (
                <tr key={backup.fileName}>
                  <td className="max-w-[360px] break-all px-4 py-3 font-medium text-slate-800">{backup.fileName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatTimestamp(backup.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-slate-600">{formatBytes(backup.sizeBytes)}</td>
                  <td className="px-4 py-2">{renderBackupActions(backup)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel padding="sm" className="flex items-start gap-3 rounded-xl border-slate-200/90 shadow-2xs">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div className="text-xs leading-relaxed text-amber-900">
          <p className="font-semibold">Lưu ý khi khôi phục</p>
          <p className="mt-1">
            Khôi phục sẽ thay thế dữ liệu hiện tại. Hệ thống tự tạo một bản sao lưu dự phòng ngay trước thao tác; hãy tải bản sao lưu xuống và lưu ở nơi an toàn.
          </p>
        </div>
      </Panel>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Xóa bản sao lưu?"
        description={
          <span>
            Tệp <strong className="break-all">{deleteTarget?.fileName}</strong> sẽ bị xóa vĩnh viễn và không thể dùng để khôi phục.
          </span>
        }
        confirmLabel="Xóa tệp"
        variant="danger"
        loading={deleteTarget !== null && busyFile === deleteTarget.fileName}
        onConfirm={() => void deleteBackup()}
        onCancel={() => setDeleteTarget(null)}
      />

      {restoreTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="restore-backup-title"
            className="w-full max-w-lg overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-start gap-3 border-b border-rose-100 bg-rose-50 px-5 py-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
              <div className="min-w-0">
                <h2 id="restore-backup-title" className="font-bold text-rose-900">Xác nhận khôi phục database</h2>
                <p className="mt-1 break-all text-xs text-rose-800">{restoreTarget.fileName}</p>
              </div>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm text-slate-700">
              <p className="font-semibold text-rose-800">
                Dữ liệu hiện tại sẽ bị thay thế. Những thay đổi phát sinh sau thời điểm sao lưu sẽ mất.
              </p>
              <p>
                Trước khi khôi phục, hệ thống sẽ tự tạo thêm bản sao lưu dự phòng của database hiện tại.
              </p>
              <label className="block text-xs font-semibold text-slate-700" htmlFor="restore-confirmation">
                Nhập <code className="rounded bg-slate-100 px-1.5 py-0.5">RESTORE</code> để xác nhận
              </label>
              <input
                id="restore-confirmation"
                autoComplete="off"
                value={restoreConfirmation}
                onChange={(event) => setRestoreConfirmation(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                placeholder="RESTORE"
              />
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setRestoreTarget(null);
                  setRestoreConfirmation("");
                }}
                disabled={busyFile === restoreTarget.fileName}
                className="il-btn il-btn-secondary justify-center"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void restoreBackup()}
                disabled={restoreConfirmation !== "RESTORE" || busyFile === restoreTarget.fileName}
                className="il-btn inline-flex items-center justify-center gap-2 bg-rose-700 text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyFile === restoreTarget.fileName
                  ? <LoaderCircle className="h-4 w-4 animate-spin" />
                  : <ArchiveRestore className="h-4 w-4" />}
                Khôi phục dữ liệu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
