import type { DocumentListItemDto } from "../types/api";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** UI row shape used by Student TemplatesView. */
export function mapDocumentListItemToStudentTemplate(d: DocumentListItemDto) {
  const ext = d.fileName.split(".").pop()?.toUpperCase() || "FILE";
  const code = d.category?.slice(0, 3).toUpperCase() || ext.slice(0, 3);
  return {
    id: d.id,
    code: `${code}-${d.id.slice(0, 4).toUpperCase()}`,
    name: d.title,
    category: d.category || "Biểu mẫu",
    fileType: ext,
    fileSize: formatFileSize(d.fileSize),
    version: d.version ? `v${d.version}` : "v1.0",
    uploadDate: new Date(d.uploadedAt).toLocaleDateString("vi-VN"),
    uploaderName: d.uploadedBy?.fullName || "Ban Quản lý Khoa",
    uploaderRole: !d.internshipId ? "Khoa / Ban quản lý khoa" : "Giảng viên hướng dẫn",
    isRequired: d.isRequired,
    description: d.description ?? "",
    usageInstructions: "Tải file về máy và làm theo hướng dẫn của giảng viên/khoa.",
    downloadCount: d.downloadCount ?? 0,
    fileName: d.fileName,
    semester: d.semesterName || "Áp dụng chung",
    department: d.department || "Toàn trường",
    isOfficial: !d.internshipId,
  };
}

/** UI row shape used by Lecturer TemplatesView document list. */
export function mapDocumentListItemToUi(d: DocumentListItemDto) {
  const ext = d.fileName.split(".").pop()?.toUpperCase() || "FILE";
  return {
    id: d.id,
    title: d.title,
    category: d.category || "Biểu mẫu",
    fileType: ext,
    fileSize: formatFileSize(d.fileSize),
    version: d.version ? `v${d.version}` : "v1.0",
    isLatest: true,
    updatedAt: new Date(d.uploadedAt).toLocaleDateString("vi-VN"),
    uploader: d.uploadedBy?.fullName || (!d.internshipId ? "Ban Quản lý Khoa" : "—"),
    uploaderRole: !d.internshipId ? "Khoa / Ban quản lý khoa" : "Giảng viên hướng dẫn",
    downloads: d.downloadCount ?? 0,
    semester: d.semesterName || "Áp dụng chung mọi kỳ",
    major: d.department ? `Khoa ${d.department}` : "Toàn trường",
    status: d.isPublished === false ? "Ngưng lưu hành" as const : "Đang lưu hành" as const,
    isPublished: d.isPublished !== false,
    archiveReason: d.archiveReason ?? undefined,
    archivedAt: d.archivedAt ?? undefined,
    archivedBy: d.archivedBy ?? undefined,
    description: d.description ?? "",
    internshipId: d.internshipId,
    isOfficial: !d.internshipId,
    fileName: d.fileName,
    versionHistory: [
      {
        version: d.version ? `v${d.version}` : "v1.0",
        date: new Date(d.uploadedAt).toLocaleDateString("vi-VN"),
        author: d.uploadedBy?.fullName || "Ban Quản lý Khoa",
        note: !d.internshipId ? "Ban hành biểu mẫu chính thức" : "Tải lên hệ thống",
      },
    ],
    archiveLogs: [],
  };
}
