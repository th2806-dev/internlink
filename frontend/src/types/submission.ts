// Submission type definitions

import type { FeedbackDto, SubmissionAssetDto } from "./api";

export interface Submission {
  id: string;
  internshipId?: string;
  studentName: string;
  mssv: string;
  avatar: string;
  company: string;
  reportType: string;
  time: string;
  date: string;
  status: string;
  fileName?: string;
  fileUrl: string;
  fileSize: string;
  submittedAt?: string;
  assetId?: string;
  summary: string;
  assetCount?: number;
  duplicateScore: number;
  lecturerNote: string;
  approvedAt?: string;
  gradeScore?: number;
  sourceType?: "submission" | "weeklyReport";
  sourceId?: string;
  feedbacks?: FeedbackDto[];
  assets?: SubmissionAssetDto[];
}

export type SubmissionStatus = "Đã duyệt" | "Chờ duyệt" | "Yêu cầu sửa";
