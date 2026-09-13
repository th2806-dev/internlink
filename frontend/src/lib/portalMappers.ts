import type {
  EvaluationListItemDto,
  FeedbackDto,
  InternshipDto,
  LecturerStudentListItemDto,
  LecturerCompanySummaryDto,
  NotificationDto,
  SubmissionDto,
  WeeklyReportDto,
  CompanyDetailDto,
} from "../types/api";
import type { Student } from "../types/student";
import type { Submission } from "../types/submission";
import type { Enterprise } from "../types/enterprise";
import type { EnterpriseDetail } from "../types/enterprise";

/** Check if a URL is an external placeholder (Unsplash) or empty. */
function isPlaceholderAvatar(url: string): boolean {
  return !url || url.includes("unsplash.com");
}

const DEFAULT_AVATAR = "";

export function formatViDate(iso?: string | null): string {
  if (!iso) return "—";
  const value = iso.trim();
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const date = new Date(hasTimezone ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return "—";
  const dateLabel = date.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const timeLabel = date.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  return `${dateLabel} ${timeLabel}`;
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function internshipStatusToProgress(status: string): number {
  const map: Record<string, number> = {
    NotStarted: 0,
    InProgress: 55,
    BehindSchedule: 25,
    AwaitingFeedback: 70,
    RequiresRevision: 40,
    Completed: 90,
    Graded: 100,
  };
  return map[status] ?? 50;
}

export function mapInternshipStatusToUi(status: string): string {
  const map: Record<string, string> = {
    NotStarted: "Chưa bắt đầu",
    InProgress: "Đúng tiến độ",
    BehindSchedule: "Quá hạn",
    AwaitingFeedback: "Chờ phản hồi",
    RequiresRevision: "Đang chỉnh sửa",
    Completed: "Hoàn thành",
    Graded: "Hoàn thành",
  };
  return map[status] ?? status;
}

export function mapSubmissionStatusToUi(status: string): string {
  const map: Record<string, string> = {
    Submitted: "Chờ duyệt",
    Reviewed: "Cần nhận xét",
    RevisionRequested: "Yêu cầu sửa",
    Approved: "Đã duyệt",
    Rejected: "Từ chối",
  };
  return map[status] ?? status;
}

export function mapUiSubmissionStatusToApi(uiStatus: string): string {
  const map: Record<string, string> = {
    "Đã duyệt": "Approved",
    "Yêu cầu sửa": "RevisionRequested",
    "Chờ duyệt": "Submitted",
    "Cần nhận xét": "Reviewed",
    "Đã nộp": "Submitted",
  };
  return map[uiStatus] ?? "Reviewed";
}

export function mapWeeklyReportStatusToUi(status: string): string {
  const map: Record<string, string> = {
    Draft: "Bản nháp",
    Submitted: "Đã nộp",
    Reviewed: "Đã xem",
    RevisionRequested: "Cần chỉnh sửa",
    Approved: "Đã hoàn thành",
  };
  return map[status] ?? status;
}

/** Lecturer review action → API WeeklyReportStatus */
export function mapUiWeeklyReportReviewStatusToApi(uiStatus: string): string {
  const map: Record<string, string> = {
    "Đã duyệt": "Approved",
    "Phê duyệt": "Approved",
    "Duyệt": "Approved",
    "Yêu cầu sửa": "RevisionRequested",
    "Cần chỉnh sửa": "RevisionRequested",
    "Đã xem": "Reviewed",
  };
  return map[uiStatus] ?? "Reviewed";
}

export function mapSubmissionTypeToUi(type: string): string {
  const map: Record<string, string> = {
    WeeklyReport: "Báo cáo tuần",
    InternshipLog: "Nhật ký thực tập",
    FinalReport: "Báo cáo cuối kỳ",
    Product: "Sản phẩm",
  };
  return map[type] ?? type;
}

/** Student SubmissionsView category → API SubmissionType. */
export function mapUiProductCategoryToSubmissionType(category: string): string {
  if (category === "User Manual") return "FinalReport";
  return "Product";
}

/** Infer UI product category from API submission metadata. */
export function mapSubmissionToProductCategory(
  type: string,
  fileName?: string | null,
): string {
  if (type === "FinalReport") return "User Manual";
  const ext = fileName?.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "zip" || ext === "rar") return "Source Code";
  if (ext === "pptx" || ext === "ppt") return "Slide";
  if (ext === "mp4" || ext === "mov") return "Video Demo";
  if (ext === "sql") return "Database Backup";
  if (ext === "pdf") return "User Manual";
  return "Source Code";
}

export function inferFileExtensionForCategory(category: string): string {
  switch (category) {
    case "Source Code":
      return "zip";
    case "Slide":
      return "pptx";
    case "Video Demo":
      return "mp4";
    case "User Manual":
      return "pdf";
    case "Database Backup":
      return "sql";
    default:
      return "bin";
  }
}

export function mapInternshipDtoToStudent(
  i: InternshipDto,
  lecturerName = "—",
): Student {
  const student = i.student;
  const company = i.company;
  const uiStatus = mapInternshipStatusToUi(i.status);
  return {
    id: i.id,
    name: student?.fullName ?? "—",
    mssv: student?.studentCode ?? "—",
    class: student?.class ?? "—",
    gpa: 0,
    company: company?.companyName ?? "Chưa có",
    position: i.position ?? "—",
    supervisor: i.supervisorName ?? "—",
    lecturer: lecturerName,
    major: student?.major ?? "—",
    email: student?.email ?? undefined,
    status: uiStatus,
    progress: internshipStatusToProgress(i.status),
    riskFlag:
      i.status === "BehindSchedule" || i.status === "RequiresRevision",
    avatar: DEFAULT_AVATAR,
    lastReportName: "—",
    lastReportDate: "—",
    updatedAt: formatViDate(i.endDate),
    startDate: i.startDate ?? undefined,
    endDate: i.endDate ?? undefined,
    notesCount: 0,
    chatCount: 0,
  };
}

export function mapLecturerStudentDtoToStudent(
  item: LecturerStudentListItemDto,
  lecturerName = "—",
): Student {
  const status = mapInternshipStatusToUi(item.internshipStatus);
  return {
    id: item.internshipId,
    name: item.fullName,
    mssv: item.studentCode,
    class: item.class ?? "—",
    gpa: 0,
    company: item.companyName ?? "Chưa có",
    position: item.position ?? "—",
    supervisor: "—",
    lecturer: lecturerName,
    major: item.major ?? "—",
    status,
    progress: item.progressPercent,
    riskFlag:
      item.internshipStatus === "BehindSchedule" ||
      item.internshipStatus === "RequiresRevision",
    avatar: DEFAULT_AVATAR,
    email: item.email ?? undefined,
    phone: item.phone ?? undefined,
    startDate: item.startDate ?? undefined,
    endDate: item.endDate ?? undefined,
    lastReportName: "—",
    lastReportDate: "—",
    updatedAt: formatViDate(item.endDate),
    notesCount: 0,
    chatCount: 0,
  };
}

export function mapCompanyDetailDtoToEnterpriseDetail(detail: CompanyDetailDto): EnterpriseDetail {
  return {
    id: detail.id,
    name: detail.companyName,
    industry: detail.industry ?? "—",
    contactPerson: detail.contactPerson ?? "—",
    contactEmail: detail.contactEmail ?? "—",
    contactPhone: detail.contactPhone ?? "—",
    address: detail.address ?? "—",
    studentCount: detail.assignedStudentsCount,
    totalSubmissions: detail.totalSubmissions,
    totalWeeklyReports: detail.totalWeeklyReports,
    pendingReviewsCount: detail.pendingReviewsCount,
    internships: detail.internships.map((i) => ({
      id: i.id,
      studentId: i.studentId,
      studentCode: i.studentCode,
      studentName: i.studentName,
      position: i.position ?? "—",
      status: i.status === "NotStarted" && i.submissionCount > 0
        ? "InProgress"
        : i.status,
      startDate: i.startDate ?? undefined,
      endDate: i.endDate ?? undefined,
      submissionCount: i.submissionCount,
    })),
  };
}

export function mapLecturerCompanyDtoToEnterprise(
  company: LecturerCompanySummaryDto,
): Enterprise {
  const shortCode =
    company.companyCode?.trim() ||
    company.companyName
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 3)
      .toUpperCase() ||
    "DN";

  return {
    id: company.id,
    name: company.companyName,
    shortCode,
    badge: "Đang hướng dẫn",
    badgeType: "teal",
    studentCount: company.assignedStudentsCount,
    activeThisWeek: true,
    contactEmail: company.contactEmail ?? "—",
    location: company.address ?? "—",
    status: "Đang hướng dẫn",
    field: company.industry ?? "—",
    contactPerson: company.contactPerson ?? "—",
    contactPhone: company.contactPhone ?? "—",
    website: "—",
    capacity: 0,
    rating: 0,
    hasStipend: false,
    isHiring: false,
    isPriority: false,
  };
}

export function mapSubmissionDtoToRow(
  s: SubmissionDto,
  ctx: {
    studentName?: string;
    mssv?: string;
    company?: string;
    avatar?: string;
  } = {},
): Submission {
  const latestFeedback = s.feedbacks?.[s.feedbacks.length - 1];
  const firstFile = s.assets?.find((asset) => asset.assetType === "file");
  const firstAsset = s.assets?.[0];
  return {
    id: s.id,
    studentName: ctx.studentName ?? "—",
    mssv: ctx.mssv ?? "—",
    avatar: ctx.avatar ?? DEFAULT_AVATAR,
    company: ctx.company ?? "—",
    reportType: mapSubmissionTypeToUi(s.type),
    time: formatViDate(s.submittedAt).split(" ")[1] ?? "—",
    date: formatViDate(s.submittedAt).split(" ")[0] ?? "—",
    status: mapSubmissionStatusToUi(s.status),
    fileName: s.fileName ?? firstFile?.fileName ?? firstAsset?.label ?? "",
    fileUrl: s.fileUrl ?? firstFile?.fileUrl ?? "",
    fileSize: firstFile?.fileSize ? formatFileSize(firstFile.fileSize) : "—",
    summary: s.description ?? s.title ?? "—",
    assetCount: s.assets?.length ?? 0,
    duplicateScore: 0,
    lecturerNote: latestFeedback?.comment ?? "",
    feedbacks: s.feedbacks ?? [],
    assets: s.assets ?? [],
    approvedAt:
      s.status === "Approved" ? formatViDate(s.submittedAt) : undefined,
  };
}

export function mapWeeklyReportDtoToUi(r: WeeklyReportDto) {
  const uiStatus = mapWeeklyReportStatusToUi(r.status);
  const stepMap: Record<string, number> = {
    Draft: 1,
    Submitted: 2,
    Reviewed: 3,
    RevisionRequested: 3,
    Approved: 5,
  };
  return {
    id: r.id,
    internshipId: r.internshipId,
    weekNumber: r.weekNumber,
    title: r.title,
    content: r.content,
    deadline: r.dueDate ? formatViDate(r.dueDate).split(" ")[0] : "—",
    submittedAt: r.submittedAt ? formatViDate(r.submittedAt) : "—",
    version: `v${r.version}`,
    versions: r.versions ?? [],
    status: uiStatus,
    fileName: r.fileName ?? undefined,
    fileSize: formatFileSize(r.fileSize),
    feedback: r.lecturerComment ?? "",
    feedbackDate: r.updatedAt ? formatViDate(r.updatedAt).split(" ")[0] : "",
    stepIndex: stepMap[r.status] ?? 1,
  };
}

export function mapEvaluationListItemToUi(e: EvaluationListItemDto) {
  const grade = Number(e.finalGrade);
  let gradeClassification = "Khá";
  if (grade >= 9) gradeClassification = "Xuất sắc";
  else if (grade >= 8) gradeClassification = "Giỏi";
  else if (grade >= 6.5) gradeClassification = "Khá";
  else if (grade < 5) gradeClassification = "Không đạt";

  return {
    id: e.id,
    internshipId: e.internshipId,
    name: e.studentName ?? "—",
    mssv: "—",
    avatar: DEFAULT_AVATAR,
    class: "—",
    major: "—",
    company: e.companyName ?? "—",
    supervisor: "—",
    progress: e.isFinalized ? 100 : 60,
    enterpriseScore: grade,
    lecturerScore: grade,
    presentationScore: grade,
    totalScore: grade,
    status: e.isFinalized ? "Hoàn thành" : "Đang chấm",
    weeklyReportCount: "—",
    finalReportSubmitted: true,
    enterpriseFeedbackSubmitted: true,
    lecturerComments: e.evaluatedBy?.fullName
      ? `Đánh giá bởi ${e.evaluatedBy.fullName}`
      : "—",
    gradeClassification,
  };
}

export interface StudentNotificationItem {
  id: string;
  title: string;
  description: string;
  fullContent: string;
  senderName: string;
  senderRole: string;
  dateStr: string;
  timeAgo: string;
  category: string;
  priority: string;
  isUnread: boolean;
  relatedModule: string;
  relatedTab: string;
  attachment?: { name: string; size: string; type: string } | undefined;
}

export function mapNotificationDtoToStudentUi(
  n: NotificationDto,
): StudentNotificationItem {
  const text = `${n.title} ${n.content}`.toLowerCase();
  
  let category = "Thông báo Khoa";
  let senderName = "Văn phòng Khoa CNTT";
  let senderRole = "Khoa / Quản trị";

  if (text.includes("giảng viên") || text.includes("gvhd") || text.includes("nhận xét") || text.includes("phê duyệt") || text.includes("báo cáo tuần")) {
    category = "Giảng viên";
    senderName = n.senderName || "Giảng viên hướng dẫn";
    senderRole = "GVHD";
  } else if (text.includes("doanh nghiệp") || text.includes("công ty") || text.includes("mentor") || text.includes("đánh giá giữa kỳ") || text.includes("tiếp nhận")) {
    category = "Doanh nghiệp";
    senderName = n.senderName || "Doanh nghiệp thực tập";
    senderRole = "Doanh nghiệp";
  } else if (text.includes("hạn nộp") || text.includes("deadline") || text.includes("nhắc nhở") || text.includes("hạn chót") || text.includes("khóa cổng")) {
    category = "Deadline";
    senderName = n.senderName || "Hệ thống InternLink";
    senderRole = "Quản trị khoa";
  } else if (n.senderName) {
    senderName = n.senderName;
  }

  let priority = "Bình thường";
  if (text.includes("khẩn") || text.includes("gấp") || text.includes("hạn chót") || text.includes("cảnh báo")) {
    priority = "Khẩn";
  } else if (!n.isRead || text.includes("quan trọng") || text.includes("chú ý") || text.includes("nhắc nhở")) {
    priority = "Quan trọng";
  }

  return {
    id: n.id,
    title: n.title,
    description: n.content.slice(0, 120) + (n.content.length > 120 ? "…" : ""),
    fullContent: n.content,
    senderName,
    senderRole,
    dateStr: formatViDate(n.createdAt),
    timeAgo: formatViDate(n.createdAt),
    category,
    priority,
    isUnread: !n.isRead,
    relatedModule: n.link ?? "—",
    relatedTab: n.link ?? "",
    attachment: undefined as
      | { name: string; size: string; type: string }
      | undefined,
  };
}

/** UI row for Lecturer NotificationsView inbox. */
export function mapNotificationDtoToLecturerUi(n: NotificationDto) {
  const isUnread = !n.isRead;
  const text = `${n.title} ${n.content}`.toLowerCase();

  let category: "Hệ thống & Admin" | "Tiến độ Deadline" | "Phản hồi SV" | "Doanh nghiệp" = "Hệ thống & Admin";
  let sender = n.senderName || "Hệ thống InternLink";

  if (text.includes("sinh viên") || text.includes("báo cáo") || text.includes("nộp") || text.includes("phản hồi") || text.includes("nhận xét")) {
    category = "Phản hồi SV";
    sender = n.senderName || "Sinh viên thực tập";
  } else if (text.includes("deadline") || text.includes("hạn") || text.includes("nhắc nhở") || text.includes("khóa sổ") || text.includes("hết hạn")) {
    category = "Tiến độ Deadline";
    sender = "Ban Quản lý đào tạo"; // fallback hiển thị, không phải role hệ thống
  } else if (text.includes("doanh nghiệp") || text.includes("công ty") || text.includes("đối tác") || text.includes("tiếp nhận")) {
    category = "Doanh nghiệp";
    sender = n.senderName || "Doanh nghiệp đối tác";
  }

  let priority: "Thông thường" | "Quan trọng" | "Khẩn cấp" = "Thông thường";
  let type: "system" | "deadline" | "feedback" | "urgent" = "system";
  let color: "blue" | "amber" | "rose" | "emerald" = "blue";

  if (text.includes("khẩn") || text.includes("gấp") || text.includes("cảnh báo")) {
    priority = "Khẩn cấp";
    type = "urgent";
    color = "rose";
  } else if (isUnread || text.includes("quan trọng") || text.includes("deadline")) {
    priority = "Quan trọng";
    type = category === "Tiến độ Deadline" ? "deadline" : "urgent";
    color = "amber";
  } else if (category === "Phản hồi SV") {
    type = "feedback";
    color = "blue";
  }

  return {
    id: n.id,
    title: n.title,
    desc: n.content.slice(0, 90) + (n.content.length > 90 ? "…" : ""),
    type,
    category,
    priority,
    color,
    isUnread,
    time: formatViDate(n.createdAt),
    sender,
    receiver: "Giảng viên",
    content: n.content,
    attachments: [] as string[],
  };
}

function mapSubmissionFeedbackStatus(status: string): string {
  if (status === "RevisionRequested") return "Cần chỉnh sửa";
  if (status === "Approved") return "Đã hoàn thành";
  if (status === "Rejected" || status === "Reviewed") return "Đã xem";
  return "Chưa xem";
}

function submissionToWorkflowStep(status: string): number {
  const map: Record<string, number> = {
    Submitted: 2,
    Reviewed: 3,
    RevisionRequested: 4,
    Approved: 5,
    Rejected: 5,
  };
  return map[status] ?? 3;
}

export type StudentFeedbackUiItem = {
  id: string;
  submissionId?: string;
  reportId?: string;
  sourceType: "submission" | "weeklyReport";
  senderName: string;
  senderRole: string;
  avatar: string;
  timeAgo: string;
  dateStr: string;
  sortKey: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  detail: string;
  attachments: { name: string; size: string; type: string }[];
  currentWorkflowStep: number;
  conversation: {
    id: string;
    sender: string;
    senderName: string;
    avatar: string;
    time: string;
    text: string;
    attachments: unknown[];
  }[];
  revisions: {
    version: string;
    submissionTime: string;
    description: string;
    status: string;
    fileName: string;
    fileSize: string;
  }[];
};

export function mapFeedbackDtoToStudentUi(
  f: FeedbackDto,
  submission: SubmissionDto,
  threadFeedbacks: FeedbackDto[] = [f],
): StudentFeedbackUiItem {
  const orderedFeedbacks = [...threadFeedbacks].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const latestLecturerFeedback = [...orderedFeedbacks]
    .reverse()
    .find((feedback) => feedback.authorRole === "Lecturer") ?? f;
  const hasUnreadLecturerFeedback = orderedFeedbacks.some(
    (feedback) => feedback.authorRole === "Lecturer" && !feedback.studentReadAt,
  );

  return {
    id: `submission-thread-${submission.id}`,
    submissionId: submission.id,
    sourceType: "submission",
    senderName: latestLecturerFeedback.lecturerName ?? "Giảng viên hướng dẫn",
    senderRole: "Giảng viên hướng dẫn",
    avatar: DEFAULT_AVATAR,
    timeAgo: formatViDate(latestLecturerFeedback.createdAt),
    dateStr: formatViDate(latestLecturerFeedback.createdAt),
    sortKey: latestLecturerFeedback.createdAt,
    title: submission.title ?? mapSubmissionTypeToUi(submission.type),
    category: mapSubmissionTypeToUi(submission.type),
    priority: submission.status === "RevisionRequested" ? "Khẩn" : "Thường",
    status: hasUnreadLecturerFeedback ? "Chưa xem" : mapSubmissionFeedbackStatus(submission.status),
    detail: latestLecturerFeedback.comment,
    attachments: [],
    currentWorkflowStep: submissionToWorkflowStep(submission.status),
    conversation: orderedFeedbacks.map((feedback) => ({
      id: feedback.id,
      sender: feedback.authorRole === "Lecturer" ? "lecturer" : "student",
      senderName: feedback.authorRole === "Lecturer"
        ? feedback.lecturerName ?? "Giảng viên"
        : "Sinh viên",
      avatar: DEFAULT_AVATAR,
      time: formatViDate(feedback.createdAt),
      text: feedback.comment,
      attachments: [],
    })),
    revisions: [
      {
        version: `v${submission.version}`,
        submissionTime: formatViDate(submission.submittedAt),
        description: submission.description ?? "Bản nộp gốc",
        status: mapSubmissionStatusToUi(submission.status),
        fileName: submission.fileName ?? "—",
        fileSize: "—",
      },
    ],
  };
}

export function mapWeeklyReportFeedbackToStudentUi(
  r: WeeklyReportDto,
  lecturerName?: string | null,
): StudentFeedbackUiItem {
  const stepMap: Record<string, number> = {
    Draft: 1,
    Submitted: 2,
    Reviewed: 3,
    RevisionRequested: 4,
    Approved: 5,
  };
  let feedbackStatus = "Chưa xem";
  if (r.status === "RevisionRequested") feedbackStatus = "Cần chỉnh sửa";
  else if (r.status === "Approved") feedbackStatus = "Đã hoàn thành";
  else if (r.status === "Reviewed") feedbackStatus = "Đã xem";
  if ((r.feedbacks ?? []).some((feedback) => feedback.authorRole === "Lecturer" && !feedback.studentReadAt)) {
    feedbackStatus = "Chưa xem";
  }

  const when = r.updatedAt ?? r.createdAt;

  return {
    id: `wr-${r.id}`,
    reportId: r.id,
    sourceType: "weeklyReport",
    senderName: lecturerName ?? "Giảng viên hướng dẫn",
    senderRole: "Giảng viên hướng dẫn",
    avatar: DEFAULT_AVATAR,
    timeAgo: formatViDate(when),
    dateStr: formatViDate(when),
    sortKey: when,
    title: r.title || `Báo cáo tuần ${r.weekNumber}`,
    category: "Báo cáo tuần",
    priority: r.status === "RevisionRequested" ? "Khẩn" : "Thường",
    status: feedbackStatus,
    detail: r.lecturerComment ?? "",
    attachments: [],
    currentWorkflowStep: stepMap[r.status] ?? 3,
    conversation: [
      ...(r.lecturerComment && !(r.feedbacks ?? []).some((feedback) => feedback.authorRole === "Lecturer")
        ? [{
            id: `wr-msg-${r.id}`,
            sender: "lecturer",
            senderName: lecturerName ?? "Giảng viên hướng dẫn",
            avatar: DEFAULT_AVATAR,
            time: formatViDate(when),
            text: r.lecturerComment,
            attachments: [],
          }]
        : []),
      ...(r.feedbacks ?? []).map((f) => ({
        id: f.id,
        sender: f.authorRole === "Lecturer" ? "lecturer" : "student",
        senderName: f.authorRole === "Lecturer"
          ? f.lecturerName ?? "Giảng viên"
          : "Sinh viên",
        avatar: DEFAULT_AVATAR,
        time: formatViDate(f.createdAt),
        text: f.comment,
        attachments: [],
      })),
    ],
    revisions: [],
  };
}

export function mapStudentSubmissionToUpload(s: SubmissionDto) {
  const assets = s.assets ?? [];
  const firstAsset = assets[0];
  return {
    id: s.id,
    title: s.title ?? mapSubmissionTypeToUi(s.type),
    category: s.type === "FinalReport" ? "Báo cáo tốt nghiệp" : "Sản phẩm thực tế",
    fileType: assets.length > 0 ? `${assets.length} tài nguyên` : "—",
    assetId: firstAsset?.id,
    size: "—",
    version: `v${s.version}`,
    uploadDate: formatViDate(s.submittedAt),
    status: mapSubmissionStatusToUi(s.status),
    notes: s.description ?? "",
    fileUrl: firstAsset?.fileUrl ?? s.fileUrl ?? "#",
  };
}
