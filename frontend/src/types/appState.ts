import type { Submission } from "./submission";
import type { WeeklyReportDto } from "./api";

export interface ActionItem {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  buttonText?: string;
}

export interface Deadline {
  id: string;
  title: string;
  day: string;
  month: string;
  subtitle: string;
  studentCount: number;
}

export interface Stats {
  total: number;
  interning: number;
  assignedCompanyCount: number;
  pending: number;
  overdue: number;
  completed: number;
  avgProg: number;
  statusDistribution?: Record<string, number>;
}

export interface LecturerProfileData {
  staffCode: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
}

export interface AppState {
  currentLecturer: string;
  lecturerProfile?: LecturerProfileData | null;
  assignedStudents: any[];
  assignedSubmissions: Submission[];
  dynamicActionItems: ActionItem[];
  deadlines: Deadline[];
  stats: Stats;
  weeklyReports: WeeklyReportDto[];
  weeklyReportPage: { total: number; skip: number; take: number };
  weeklyReportQuery: { status: string; searchTerm: string; skip: number };
  weeklyReportTotals: { total: number; pending: number; revision: number; approved: number };
  queryWeeklyReports: (query: { status: string; searchTerm: string; skip: number }) => void;
  isLecturerLoading: boolean;
  lecturerError: string | null;
  weeklyTrendData: {
    label: string;
    value: number;
    target: number;
    rate: number;
    late: number;
    missing: number;
    pending: number;
  }[];
  lecturerEnterprises?: any[];
  handleUpdateSubmissionStatus: (submissionId: string, status: string) => void;
  handleReviewWeeklyReport: (reportId: string, status: string, feedback: string) => void;
  refresh?: () => Promise<void>;
}
