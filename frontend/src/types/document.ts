export type DocumentStatus = "Đang lưu hành" | "Ngưng lưu hành" | "Bản nháp";

export interface ArchiveLogEntry {
  id: string;
  timestamp: string;
  date: string;
  action: "CIRCULATING" | "ARCHIVED" | "DRAFT" | "UPDATED_VERSION";
  actionLabel: string;
  performedBy: string;
  performedRole: string;
  reason?: string;
  note?: string;
  previousStatus?: DocumentStatus;
  newStatus: DocumentStatus;
}

export interface DocumentVersion {
  version: string;
  date: string;
  author: string;
  note: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  fileType: string;
  fileSize: string;
  version: string;
  isLatest: boolean;
  updatedAt: string;
  uploader: string;
  uploaderRole: string;
  downloads: number;
  semester: string;
  major: string;
  status: DocumentStatus;
  isPublished: boolean;
  isRequired?: boolean;
  description: string;
  archiveReason?: string;
  archivedAt?: string;
  archivedBy?: string;
  fileName?: string;
  internshipId?: string;
  versionHistory: DocumentVersion[];
  archiveLogs: ArchiveLogEntry[];
}
