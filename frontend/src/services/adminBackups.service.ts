import { apiRequest, downloadAuthenticatedFile } from "../lib/apiClient";

export interface BackupFile {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
}

export const adminBackupsService = {
  getAll(): Promise<BackupFile[]> {
    return apiRequest<BackupFile[]>("/api/SuperAdmin/backups");
  },

  create(): Promise<BackupFile> {
    return apiRequest<BackupFile>("/api/SuperAdmin/backups", { method: "POST" });
  },

  download(fileName: string): Promise<{ blob: Blob; filename: string }> {
    return downloadAuthenticatedFile(
      `/api/SuperAdmin/backups/${encodeURIComponent(fileName)}/download`,
      fileName,
    );
  },

  delete(fileName: string): Promise<void> {
    return apiRequest<void>(`/api/SuperAdmin/backups/${encodeURIComponent(fileName)}`, { method: "DELETE" });
  },

  restore(fileName: string): Promise<void> {
    return apiRequest<void>(
      `/api/SuperAdmin/backups/${encodeURIComponent(fileName)}/restore`,
      { method: "POST", body: { confirmation: "RESTORE" } },
    );
  },
};
