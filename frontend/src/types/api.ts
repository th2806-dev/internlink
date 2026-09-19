export interface ApiErrorBody {
  title?: string;
  detail?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorBody;
}

export interface LoginRequestDto {
  username: string;
  password: string;
}

export interface LoginResponseDto {
  token: string;
  expiresAt: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
  role: string;
  mustChangePassword: boolean;
  departmentId?: string | null;
}

export interface RefreshTokenRequestDto {
  accessToken: string;
  refreshToken: string;
}

export interface RevokeTokenRequestDto {
  refreshToken: string;
}

export interface CurrentUserDto {
  id: string;
  username: string;
  fullName?: string | null;
  email?: string | null;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  departmentId?: string | null;
}

export interface AuthSessionDto {
  id: string;
  device: string;
  browser: string;
  ip?: string | null;
  location: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface AuthActivityDto {
  id: string;
  module: string;
  action: string;
  ip?: string | null;
  time: string;
}

export interface ChangePasswordRequestDto {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequestDto {
  email: string;
}

export interface ResetPasswordRequestDto {
  token: string;
  newPassword: string;
}

export interface StudentDto {
  id: string;
  userId?: string | null;
  studentCode: string;
  fullName: string;
  class?: string | null;
  major?: string | null;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  desiredPosition?: string | null;
  alternativePosition?: string | null;
  desiredLocation?: string | null;
  workPreference?: string | null;
  preferredIndustry?: string | null;
  skills?: string | null;
  resumeUrl?: string | null;
  /** Department this student belongs to (null = global/unassigned). */
  departmentId?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface LecturerDto {
  id: string;
  userId?: string | null;
  staffCode: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  /** Department this lecturer belongs to (null = global/unassigned). */
  departmentId?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CompanyDto {
  id: string;
  companyCode?: string | null;
  companyName: string;
  address?: string | null;
  website?: string | null;
  industry?: string | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  capacity?: number | null;
  isActive: boolean;
  studentCount?: number;
  openPositionCount?: number;
  /** Link status for the requested semester: false = "ngưng liên kết". */
  isSemesterLinked?: boolean | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CompanyPositionDto {
  id: string;
  companyId: string;
  companyName?: string | null;
  semesterId?: string | null;
  positionCode?: string | null;
  title: string;
  description?: string | null;
  requiredMajor?: string | null;
  requiredSkills?: string | null;
  location?: string | null;
  slots: number;
  filledSlots: number;
  stipend?: number | null;
  isOpen: boolean;
  createdAt: string;
}

export interface CreateCompanyPositionRequest {
  semesterId?: string | null;
  title: string;
  description?: string | null;
  requiredMajor?: string | null;
  requiredSkills?: string | null;
  location?: string | null;
  slots?: number;
  stipend?: number | null;
  isOpen?: boolean;
}

export interface UpdateCompanyPositionRequest {
  semesterId?: string | null;
  title: string;
  description?: string | null;
  requiredMajor?: string | null;
  requiredSkills?: string | null;
  location?: string | null;
  slots?: number;
  stipend?: number | null;
  isOpen?: boolean;
}

export interface CompanySuggestionDto {
  companyId: string;
  companyName: string;
  industry?: string | null;
  address?: string | null;
  capacity: number;
  currentStudentCount: number;
  availableSlots: number;
  matchScore: number;
  matchReason: string;
  openPositions: CompanyPositionDto[];
}

export interface CompanySuggestionRequest {
  semesterId: string;
  studentId?: string;
  preferredIndustry?: string;
  preferredLocation?: string;
  maxResults?: number;
}


export interface UserDto {
  id: string;
  username: string;
  fullName?: string | null;
  email?: string | null;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  linkedStudentCode?: string | null;
  linkedStaffCode?: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  take: number;
  totalPages?: number;
  currentPage?: number;
}

export interface BulkAssignRequestDto {
  lecturerId: string;
  semesterId?: string;
  studentIds: string[];
  note?: string;
}

export interface BulkAssignResultDto {
  assignedCount: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  errors: { studentId: string; message: string }[];
}

export interface LecturerAssignmentItemDto {
  internshipId: string;
  lecturerId: string;
  lecturerName?: string | null;
  studentId: string;
  studentCode: string;
  studentName: string;
  class?: string | null;
  major?: string | null;
  status: string;
  companyId: string;
  companyName?: string | null;
  companyAssigned: boolean;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
}

export interface AssignmentHistoryItemDto {
  id: string;
  lecturerName: string;
  studentCount: number;
  timestamp: string;
  classGroups: string[];
  assignedBy: string;
}

export interface AutoAssignRequestDto {
  strategy: "department" | "even" | "random";
  semesterId?: string;
}

export interface AutoAssignResultDto {
  totalAssigned: number;
  totalFailed: number;
  lecturersUsed: number;
}

export interface CompanyAllocationItemDto {
  internshipId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  class?: string | null;
  major?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  lecturerId?: string | null;
  lecturerName?: string | null;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface CompanyAllocationImportErrorDto {
  rowNumber: number;
  studentCode?: string | null;
  studentName?: string | null;
  className?: string | null;
  companyName?: string | null;
  message: string;
}

export interface CompanyAllocationImportResultDto {
  totalRows: number;
  successCount: number;
  failedCount: number;
  errors: CompanyAllocationImportErrorDto[];
  updatedAllocations: CompanyAllocationItemDto[];
}

export interface LecturerAssignmentImportErrorDto {
  rowNumber: number;
  studentCode?: string | null;
  studentName?: string | null;
  staffCode?: string | null;
  lecturerName?: string | null;
  message: string;
}

export interface LecturerAssignmentImportResultDto {
  totalRows: number;
  successCount: number;
  failedCount: number;
  errors: LecturerAssignmentImportErrorDto[];
}

export interface ProgressBreakdownDto {
  accountPercent: number;
  profilePercent: number;
  companyPercent: number;
  reportPercent: number;
  evaluationPercent: number;
  totalPercent: number;
  submittedReportsCount: number;
  requiredWeeksCount: number;
  summaryText: string;
}

export interface StudentPortalProfileDto {
  student: StudentDto;
  internship?: InternshipDto | null;
  lecturerName?: string | null;
  progressPercent?: number | null;
  progressBreakdown?: ProgressBreakdownDto | null;
}

// --- Portal DTOs (Lecturer / Student) ---

export interface StudentSummaryDto {
  id: string;
  studentCode: string;
  fullName: string;
  class?: string | null;
  major?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface CompanySummaryDto {
  id: string;
  companyName: string;
  industry?: string | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface LecturerStudentListItemDto {
  studentId: string;
  internshipId: string;
  studentCode: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  class?: string | null;
  major?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  position?: string | null;
  internshipStatus: string;
  startDate?: string | null;
  endDate?: string | null;
  weeklyReportCount: number;
  pendingReportCount: number;
  submissionCount: number;
  notes?: string | null;
  finalGrade?: number | null;
  hasEvaluation: boolean;
  isEvaluationFinalized: boolean;
  progressPercent: number;
  progressBreakdown?: ProgressBreakdownDto | null;
}

export interface CompanyDetailDto {
  id: string;
  companyName: string;
  industry?: string | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  assignedStudentsCount: number;
  totalSubmissions: number;
  totalWeeklyReports: number;
  pendingReviewsCount: number;
  positions?: CompanyPositionDto[];
  internships: InternshipListItemDto[];
}

export interface LecturerCompanySummaryDto {
  id: string;
  companyCode?: string | null;
  companyName: string;
  industry?: string | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  assignedStudentsCount: number;
}

export interface LecturerDashboardStatsDto {
  totalStudents: number;
  assignedCompanyCount: number;
  interningCount: number;
  averageProgress: number;
  pendingReviewsCount: number;
  completedCount: number;
  overdueReportsCount: number;
  averageGrade: number;
  evaluatedCount: number;
  statusDistribution: Record<string, number>;
}

export interface LecturerWeeklyTrendDto {
  weekNumber: number;
  label: string;
  onTimeCount: number;
  lateCount: number;
  missingCount: number;
  totalStudents: number;
  complianceRate: number;
}

export interface LecturerGradeDistributionDto {
  excellentCount: number;
  goodCount: number;
  fairCount: number;
  averageCount: number;
  failCount: number;
  notYetGradedCount: number;
  overallAverage: number;
  totalStudents: number;
}

export interface LecturerCompanyStatDto {
  companyName: string;
  studentCount: number;
  positions: string;
  averageGrade: number;
  partnershipLevel: string;
}

export interface LecturerActivityStatsDto {
  reviewedReportsCount: number;
  pendingReportsCount: number;
  completedStudentsCount: number;
  totalStudentsCount: number;
  averageResponseDays: number;
  complianceRate: number;
}

export interface InternshipDto {
  id: string;
  studentId: string;
  companyId: string;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  position?: string | null;
  supervisorName?: string | null;
  notes?: string | null;
  student?: StudentSummaryDto | null;
  company?: CompanySummaryDto | null;
}

export interface InternshipDetailDto extends InternshipDto {
  submissions?: SubmissionDto[];
}

export interface FeedbackDto {
  id: string;
  submissionId?: string | null;
  weeklyReportId?: string | null;
  lecturerId?: string | null;
  lecturerName?: string | null;
  authorRole: "Lecturer" | "Student";
  studentReadAt?: string | null;
  lecturerReadAt?: string | null;
  comment: string;
  isPublic: boolean;
  createdAt: string;
}

export interface SubmissionDto {
  id: string;
  internshipId: string;
  type: string;
  status: string;
  version: number;
  title?: string | null;
  description?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  submittedAt: string;
  assets?: SubmissionAssetDto[];
  feedbacks?: FeedbackDto[];
}

export interface SubmissionAssetDto {
  id: string;
  label?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  assetType: "file" | "link" | string;
  fileSize?: number | null;
  mimeType?: string | null;
  uploadedAt: string;
}

export interface WeeklyReportDto {
  id: string;
  internshipId: string;
  weekNumber: number;
  version: number;
  title: string;
  content: string;
  fileName?: string | null;
  fileUrl?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  status: string;
  submittedAt?: string | null;
  lecturerComment?: string | null;
  feedbacks?: FeedbackDto[];
  createdAt: string;
  updatedAt?: string | null;
  dueDate?: string | null;
  versions?: WeeklyReportVersionDto[];
}

export interface WeeklyReportVersionDto {
  id: string;
  version: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface CreateWeeklyReportRequestDto {
  internshipId: string;
  weekNumber: number;
  title: string;
  content: string;
}

export interface UpdateWeeklyReportRequestDto {
  title?: string;
  content?: string;
}

export interface UpdateEvaluationRequestDto {
  technicalScore?: number;
  communicationScore?: number;
  teamworkScore?: number;
  initiativeScore?: number;
  comments?: string;
  strengths?: string;
  areasForImprovement?: string;
  isFinalized?: boolean;
}

export interface CreateEvaluationRequestDto {
  internshipId: string;
  technicalScore: number;
  communicationScore: number;
  teamworkScore: number;
  initiativeScore: number;
  comments?: string;
  strengths?: string;
  areasForImprovement?: string;
  isFinalized?: boolean;
}

export interface CreateSubmissionRequestDto {
  internshipId: string;
  type: string;
  title?: string;
  description?: string;
  fileName?: string;
  fileUrl?: string;
}

export interface ResubmitSubmissionRequestDto {
  title?: string;
  description?: string;
  fileName?: string;
  fileUrl?: string;
}

export interface TestEmailRequestDto {
  toEmail: string;
  fullName?: string;
  role?: "Student" | "Lecturer";
}

export interface CreateFeedbackRequestDto {
  comment: string;
  isPublic?: boolean;
  newStatus?: string;
}

export interface UpdateSubmissionStatusRequestDto {
  status: string;
}

export interface EvaluationListItemDto {
  id: string;
  internshipId: string;
  studentName?: string | null;
  companyName?: string | null;
  finalGrade: number;
  evaluatedAt: string;
  isFinalized: boolean;
  evaluatedBy?: { id: string; fullName?: string | null; email?: string | null } | null;
}

export interface EvaluationDetailDto {
  id: string;
  internshipId: string;
  technicalScore: number;
  communicationScore: number;
  teamworkScore: number;
  initiativeScore: number;
  finalGrade: number;
  comments?: string | null;
  strengths?: string | null;
  areasForImprovement?: string | null;
  evaluatedAt: string;
  updatedAt?: string | null;
  isFinalized: boolean;
  defenseDate?: string | null;
  defenseStatus: "NotScheduled" | "Scheduled" | "Completed";
  defenseCouncilName?: string | null;
  defenseExaminerName?: string | null;
  criteriaScores?: Array<{
    criterionId?: string | null;
    criterionName: string;
    maxScore: number;
    score: number;
    comment?: string | null;
  }>;
  evaluatedBy?: { id: string; fullName?: string | null; email?: string | null } | null;
  internship?: {
    id: string;
    studentName?: string | null;
    companyName?: string | null;
    position?: string | null;
    status: string;
  } | null;
}

export interface NotificationDto {
  id: string;
  userId: string;
  title: string;
  content: string;
  link?: string | null;
  senderName?: string | null;
  senderRole?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface InternshipStatsDto {
  total: number;
  notStarted: number;
  inProgress: number;
  behindSchedule: number;
  awaitingFeedback: number;
  requiresRevision: number;
  completed: number;
  graded: number;
}

export interface DocumentListItemDto {
  id: string;
  internshipId?: string | null;
  semesterId?: string | null;
  semesterName?: string | null;
  department?: string | null;
  version: string;
  publishedAt?: string | null;
  title: string;
  description?: string | null;
  fileName: string;
  fileSize: number;
  downloadCount: number;
  isPublished: boolean;
  archiveReason?: string | null;
  archivedAt?: string | null;
  archivedBy?: string | null;
  mimeType: string;
  uploadedAt: string;
  category?: string | null;
  isRequired: boolean;
  uploadedBy?: { id: string; fullName?: string | null; email?: string | null } | null;
}

export interface DocumentDetailDto extends DocumentListItemDto {
  filePath: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface TemplateStatsDto {
  totalTemplates: number;
  publishedCount: number;
  archivedCount: number;
  totalDownloads: number;
}

export interface CreateTemplatePayload {
  semesterId?: string;
  department?: string;
  title: string;
  description?: string;
  category?: string;
  version?: string;
  isPublished?: boolean;
  isRequired?: boolean;
  file: File;
}

export interface UpdateTemplatePayload {
  semesterId?: string;
  department?: string;
  title?: string;
  description?: string;
  category?: string;
  version?: string;
  isPublished?: boolean;
  isRequired?: boolean;
  archiveReason?: string;
  file?: File;
}

export interface StudentImportResultDto {
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedDuplicateCount: number;
  emailSentCount: number;
  emailFailedCount: number;
  defaultPassword: string;
  createdStudents: StudentDto[];
  errors?: StudentImportErrorDto[];
  emailErrors?: StudentImportErrorDto[];
}

export interface StudentImportErrorDto {
  rowNumber: number;
  studentCode?: string | null;
  username?: string | null;
  message: string;
}

export interface AdminCompanyDetailDto {
  company: CompanyDto;
  internships: InternshipListItemDto[];
}

export interface InternshipListItemDto {
  id: string;
  studentId: string;
  studentName?: string;
  studentCode?: string;
  companyId?: string;
  companyName?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  position?: string;
  submissionCount: number;
  createdAt: string;
}

export interface LecturerImportResultDto {
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedDuplicateCount: number;
  emailSentCount: number;
  emailFailedCount: number;
  defaultPassword: string;
  createdLecturers: LecturerDto[];
  errors?: LecturerImportErrorDto[];
  emailErrors?: LecturerImportErrorDto[];
}

export interface LecturerImportErrorDto {
  rowNumber: number;
  staffCode?: string | null;
  username?: string | null;
  message: string;
}

export interface CompanyImportResultDto {
  totalRows: number;
  successCount: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  skippedDuplicateCount: number;
  positionsCreatedCount?: number;
  positionsUpdatedCount?: number;
  createdCompanies: CompanyDto[];
  updatedCompanies: CompanyDto[];
  errors?: CompanyImportErrorDto[];
}

export interface CompanyImportErrorDto {
  rowNumber: number;
  companyCode?: string | null;
  companyName?: string | null;
  message: string;
}

export interface SemesterReportScheduleDto {
  id: string;
  semesterId: string;
  weekNumber: number;
  title: string;
  dueDate: string;
  allowLateSubmission: boolean;
  description?: string | null;
}

export interface UpdateReportScheduleRequest {
  title?: string;
  dueDate?: string;
  allowLateSubmission?: boolean;
  description?: string;
}

// ==========================================
// ATTENDANCE & MEETING SESSIONS (GIAI ĐOẠN 8)
// ==========================================

export type AttendanceStatus = "Present" | "Absent";
export type AttendanceSessionStatus = "Scheduled" | "Completed" | "Cancelled";

export interface AttendanceRecordDto {
  id: string;
  attendanceSessionId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  class?: string | null;
  major?: string | null;
  internshipId?: string | null;
  companyName?: string | null;
  status: AttendanceStatus;
  notes?: string | null;
  markedAt?: string | null;
  markedBy?: string | null;
}

export interface AttendanceSessionDto {
  id: string;
  semesterId: string;
  semesterName: string;
  lecturerId: string;
  lecturerName: string;
  weekNumber: number;
  title: string;
  description?: string | null;
  meetingDate: string;
  durationMinutes?: number | null;
  location?: string | null;
  status: AttendanceSessionStatus;
  isLecturerOnly: boolean;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
  createdAt: string;
}

export interface AttendanceSessionDetailDto extends AttendanceSessionDto {
  records: AttendanceRecordDto[];
}

export interface CreateAttendanceSessionDto {
  semesterId: string;
  weekNumber: number;
  title: string;
  description?: string | null;
  meetingDate: string;
  durationMinutes?: number;
  location?: string | null;
  studentIds?: string[] | null;
  isLecturerOnly?: boolean;
}

export interface UpdateAttendanceSessionDto {
  title?: string;
  description?: string | null;
  meetingDate?: string;
  durationMinutes?: number;
  location?: string | null;
  status?: AttendanceSessionStatus;
  isLecturerOnly?: boolean;
}

export interface MarkStudentAttendanceItemDto {
  studentId: string;
  status: AttendanceStatus;
  notes?: string | null;
}

export interface MarkAttendanceDto {
  records: MarkStudentAttendanceItemDto[];
}

export interface StudentAttendanceItemDto {
  sessionId: string;
  weekNumber: number;
  title: string;
  description?: string | null;
  meetingDate: string;
  durationMinutes?: number | null;
  location?: string | null;
  lecturerName: string;
  status: AttendanceStatus;
  notes?: string | null;
  markedAt?: string | null;
}

export interface StudentAttendanceOverviewDto {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
  sessions: StudentAttendanceItemDto[];
}

export interface StudentAbsentSummaryDto {
  studentId: string;
  studentName: string;
  studentCode: string;
  class?: string | null;
  lecturerName?: string | null;
  totalSessions: number;
  absentCount: number;
  absentRate: number;
}

export interface AdminAttendanceReportDto {
  semesterId: string;
  semesterName: string;
  totalSessions: number;
  totalStudents: number;
  overallAttendanceRate: number;
  highAbsentStudentsCount: number;
  topAbsentees: StudentAbsentSummaryDto[];
  sessions: AttendanceSessionDto[];
}

