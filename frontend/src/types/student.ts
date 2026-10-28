// Student type definitions

export interface Student {
  id: string;
  name: string;
  mssv: string;
  class: string;
  gpa: number;
  company: string;
  position: string;
  supervisor: string;
  lecturer: string;
  major: string;
  status: string;
  progress: number;
  riskFlag: boolean;
  avatar: string;
  email?: string;
  phone?: string;
  studentId?: string;
  absentCount?: number;
  hasFinalReport?: boolean;
  /** Internship period (ISO dates), when known. */
  startDate?: string;
  endDate?: string;
  lastReportName: string;
  lastReportDate: string;
  updatedAt: string;
  notesCount: number;
  chatCount: number;
}

export type StudentStatus =
  | "Đúng tiến độ"
  | "Chờ phản hồi"
  | "Đang chỉnh sửa"
  | "Quá hạn"
  | "Hoàn thành"
  | "Chưa có doanh nghiệp";
