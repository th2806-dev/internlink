// Common shared type definitions

export type UserRole = "admin" | "lecturer" | "student";

export interface AuthenticatedUser {
  username: string;
  name: string;
  role?: UserRole;
}

export interface ActionItem {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  priority?: string;
  count?: number;
  buttonText?: string;
}

export interface Deadline {
  id: string;
  day: string;
  month: string;
  title: string;
  subtitle: string;
  studentCount: number;
  /** ISO date of the deadline (optional, for sorting/overdue computation in the UI). */
  isoDate?: string;
  /** Whole-day difference vs today: > 0 upcoming, <= 0 past due. */
  daysLeft?: number;
  /** True when the deadline is already past due. */
  isOverdue?: boolean;
}

export interface Activity {
  id: string;
  actor: string;
  action: string;
  timeAgo: string;
  type: string;
}

export interface FilterState {
  term: string;
  classGroup: string;
  lecturer: string;
  enterprise: string;
  status: string;
  gpaRange: string;
  major: string;
  searchQuery: string;
}

export interface ToastMessage {
  message: string | null;
  onClose: () => void;
}

// Student portal specific types
export interface StudentTask {
  id: string;
  title: string;
  deadline: string;
  priority: string;
  actionLabel: string;
  completed: boolean;
  category: string;
}

export interface StudentReportDeadline {
  id: string;
  weekName: string;
  deadlineDate: string;
  status: string;
  score?: number;
  urgent: boolean;
}

export interface StudentFeedback {
  id: string;
  senderName: string;
  senderRole: string;
  avatar: string;
  timeAgo: string;
  preview: string;
  detail: string;
  status: string;
  reportRef: string;
}

export interface StudentNotification {
  id: string;
  title: string;
  timeAgo: string;
  unread: boolean;
  type: string;
}

import type { ProgressBreakdownDto } from "./api";

export interface StudentProfile {
  name: string;
  mssv: string;
  class: string;
  semester: string;
  major: string;
  company: string;
  companyLogo: string;
  position: string;
  statusBadge: string;
  overallProgress: number;
  progressBreakdown?: ProgressBreakdownDto | null;
  currentGrade: number;
  reportsSubmitted: number;
  totalReports: number;
  daysLeftForReport: number;
  lecturerName: string;
  supervisorName: string;
  supervisorEmail: string;
  supervisorPhone: string;
  companyAddress: string;
  currentPhase: string;
}
