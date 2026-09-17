// Enterprise type definitions

export interface Enterprise {
  id: string;
  name: string;
  shortCode: string;
  badge: string;
  badgeType: "primary" | "teal" | "gray" | "warning" | string;
  studentCount: number;
  activeThisWeek: boolean;
  contactEmail: string;
  location: string;
  status: string;
  field: string;
  contactPerson: string;
  contactPhone: string;
  website: string;
  openPositions?: string[];
  openPositionCount?: number;
  capacity: number;
  rating: number;
  hasStipend: boolean;
  isHiring: boolean;
  isPriority: boolean;
  updatedAt?: string;
}

/** Chi tiết doanh nghiệp hiển thị trên trang /lecturer/enterprises/[id] */
export interface EnterpriseDetail {
  id: string;
  name: string;
  industry: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  studentCount: number;
  totalSubmissions: number;
  totalWeeklyReports: number;
  pendingReviewsCount: number;
  positions: {
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
  }[];
  internships: {
    id: string;
    studentId: string;
    studentCode?: string | null;
    studentName: string;
    position: string;
    status: string;
    startDate?: string;
    endDate?: string;
    submissionCount: number;
  }[];
}

