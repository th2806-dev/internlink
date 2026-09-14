import type {
  CompanyDto,
  LecturerAssignmentItemDto,
  LecturerCompanySummaryDto,
  LecturerDto,
  StudentDto,
  UserDto,
} from "../types/api";
import type { Enterprise } from "../types/enterprise";
import type { AdminUser } from "../types/user";
import { mapBackendRoleToAdminUserRole } from "./roleMap";
import { formatDateTimeVi } from "./formatDateTimeVi";

function mapInternshipStatusFromApi(status?: string | null): string {
  switch (status) {
    case "InProgress":
    case "BehindSchedule":
    case "AwaitingFeedback":
    case "RequiresRevision":
      return "interning";
    case "Completed":
    case "Graded":
      return "completed";
    case "NotStarted":
      return "preparing";
    default:
      return "registered";
  }
}

export function mapStudentDtoToRow(
  s: StudentDto,
  context?: {
    assignment?: {
      lecturerName: string;
      companyName?: string | null;
      status?: string | null;
    };
    user?: Pick<UserDto, "isActive" | "lastLoginAt"> | null;
  },
) {
  const hasUser = Boolean(s.userId);
  let accountStatus: "active" | "pending" | "locked" = hasUser
    ? "active"
    : "pending";
  if (hasUser && context?.user && !context.user.isActive) {
    accountStatus = "locked";
  }

  const companyName =
    context?.assignment?.companyName?.trim() || "Chưa có DN";
  const assignedLecturer =
    context?.assignment?.lecturerName?.trim() || "Chưa phân công";

  // Mirror the HỌ | TÊN columns of the import Excel: họ = all words except the
  // last (surname + middle names), tên = the last word (given name).
  const nameParts = s.fullName.trim().split(/\s+/).filter(Boolean);
  const ho = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : "";
  const ten = nameParts.length > 0 ? nameParts[nameParts.length - 1] : s.fullName.trim();

  return {
    id: s.id,
    userId: s.userId ?? null,
    mssv: s.studentCode,
    fullName: s.fullName,
    ho,
    ten,
    gender: "—",
    dateOfBirth: "—",
    classCode: s.class ?? "—",
    major: s.major ?? "—",
    faculty: s.department ?? "—",
    cohort: "—",
    email: s.email ?? "—",
    phone: s.phone ?? "—",
    department: s.department ?? "—",
    desiredPosition: s.desiredPosition ?? "",
    alternativePosition: s.alternativePosition ?? "",
    desiredLocation: s.desiredLocation ?? "",
    workPreference: s.workPreference ?? "",
    preferredIndustry: s.preferredIndustry ?? "",
    skills: s.skills ?? "",
    resumeUrl: s.resumeUrl ?? "",
    assignedLecturer,
    companyName,
    accountStatus,
    internshipStatus: mapInternshipStatusFromApi(context?.assignment?.status),
    lastLogin: context?.user?.lastLoginAt
      ? new Date(context.user.lastLoginAt).toLocaleString("vi-VN")
      : hasUser
        ? "—"
        : "Chưa cấp tài khoản",
    gpa: 0,
  };
}

export function mapLecturerDtoToRow(l: LecturerDto, assignedCount = 0) {
  return {
    id: l.id,
    userId: l.userId ?? null,
    employeeId: l.staffCode,
    fullName: l.fullName,
    academicDegree: "—",
    faculty: l.department ?? "—",
    department: l.department ?? "—",
    email: l.email ?? "—",
    phone: l.phone ?? "—",
    currentCount: assignedCount,
    maxCapacity: 40,
    accountStatus: l.userId ? "active" : "pending",
    guidanceStatus: "available",
    lastLogin: "—",
    assignedStudents: [],
  };
}

export function mapCompanyDtoToEnterprise(c: CompanyDto): Enterprise {
  const short =
    c.companyCode ||
    c.companyName
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 3)
      .toUpperCase() ||
    "DN";
  const semesterUnlinked = c.isSemesterLinked === false;
  return {
    id: c.id,
    name: c.companyName,
    shortCode: short,
    badge: semesterUnlinked
      ? "Ngưng liên kết"
      : c.isActive
        ? "Đang hợp tác"
        : "Tạm ngưng",
    badgeType: semesterUnlinked ? "gray" : c.isActive ? "teal" : "gray",
    studentCount: c.studentCount ?? 0,
    activeThisWeek: c.isActive && !semesterUnlinked,
    contactEmail: c.contactEmail ?? "—",
    location: c.address ?? "—",
    status: semesterUnlinked
      ? "Ngưng liên kết"
      : c.isActive
        ? "Đang hợp tác"
        : "Tạm ngưng",
    field: c.industry ?? "—",
    contactPerson: c.contactPerson ?? "—",
    contactPhone: c.contactPhone ?? "—",
    website: c.website ?? "—",
    capacity: c.capacity ?? 0,
    openPositionCount: c.openPositionCount ?? 0,
    rating: 0,
    hasStipend: false,
    isHiring: c.isActive,
    isPriority: false,
    updatedAt: c.updatedAt ?? c.createdAt,
  };
}

export function mapLecturerCompanySummaryToEnterprise(c: LecturerCompanySummaryDto): Enterprise {
  const short =
    c.companyCode ||
    c.companyName
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 3)
      .toUpperCase() ||
    "DN";
  return {
    id: c.id,
    name: c.companyName,
    shortCode: short,
    badge: "Đang hướng dẫn",
    badgeType: "teal",
    studentCount: c.assignedStudentsCount ?? 0,
    activeThisWeek: true,
    contactEmail: c.contactEmail ?? "—",
    location: c.address ?? "—",
    status: "Đang hướng dẫn",
    field: c.industry ?? "—",
    contactPerson: c.contactPerson ?? "—",
    contactPhone: c.contactPhone ?? "—",
    website: "—",
    capacity: c.assignedStudentsCount ?? 0,
    rating: 0,
    hasStipend: false,
    isHiring: true,
    isPriority: false,
    updatedAt: new Date().toISOString(),
  };
}

export function mapUserDtoToAdminUser(u: UserDto): AdminUser {
  const feRole = mapBackendRoleToAdminUserRole(u.role);
  return {
    id: u.id,
    code: u.linkedStudentCode ?? u.linkedStaffCode ?? u.username,
    fullName: u.fullName?.trim() || u.username,
    email: u.email ?? "—",
    role: feRole ?? "student",
    status: u.isActive ? "active" : "locked",
    departmentOrClass: u.linkedStudentCode
      ? `SV ${u.linkedStudentCode}`
      : u.linkedStaffCode
        ? `GV ${u.linkedStaffCode}`
        : "—",
    lastLogin: u.lastLoginAt
      ? formatDateTimeVi(u.lastLoginAt)
      : "—",
    mustChangePassword: u.mustChangePassword,
  };
}

/** Row shape used by AssignmentsView matrix. */
export function mapLecturerDtoToAssignmentRow(l: LecturerDto, currentCount = 0) {
  return {
    id: l.id,
    employeeId: l.staffCode,
    fullName: l.fullName,
    title: "Giảng viên",
    department: l.department ?? "—",
    currentCount,
    maxCapacity: 40,
    email: l.email ?? "—",
    phone: l.phone ?? "—",
  };
}

export function mapStudentDtoToAssignmentRow(
  s: StudentDto,
  assignment?: {
    lecturerId: string;
    lecturerName: string;
    assignedDate: string;
    companyName?: string | null;
  },
) {
  return {
    id: s.id,
    studentId: s.studentCode,
    fullName: s.fullName,
    classCode: s.class ?? "—",
    major: s.major ?? "—",
    companyName: assignment?.companyName ?? "Chưa có DN",
    assignmentStatus: assignment ? "assigned" : "unassigned",
    assignedLecturerId: assignment?.lecturerId,
    assignedLecturerName: assignment?.lecturerName,
    assignedDate: assignment?.assignedDate,
    gpa: 0,
  };
}

export function buildAssignmentMaps(
  lecturers: LecturerDto[],
  assignments: LecturerAssignmentItemDto[][] | LecturerAssignmentItemDto[],
) {
  const studentAssignment = new Map<
    string,
    {
      lecturerId: string;
      lecturerName: string;
      assignedDate: string;
      companyName?: string | null;
      status?: string | null;
    }
  >();
  const lecturerCounts = new Map<string, number>();

  lecturers.forEach((l) => {
    lecturerCounts.set(l.id, 0);
  });

  const lecturerNameById = new Map(lecturers.map((l) => [l.id, l.fullName]));

  const flatItems: LecturerAssignmentItemDto[] =
    assignments.length > 0 && Array.isArray(assignments[0])
      ? (assignments as LecturerAssignmentItemDto[][]).flat()
      : (assignments as LecturerAssignmentItemDto[]);

  for (const item of flatItems) {
    lecturerCounts.set(
      item.lecturerId,
      (lecturerCounts.get(item.lecturerId) ?? 0) + 1,
    );
    studentAssignment.set(item.studentId, {
      lecturerId: item.lecturerId,
      lecturerName:
        item.lecturerName || lecturerNameById.get(item.lecturerId) || "Giảng viên",
      assignedDate: new Date(item.createdAt).toLocaleDateString("vi-VN"),
      companyName: item.companyName,
      status: item.status,
    });
  }

  return { studentAssignment, lecturerCounts };
}

/** Map StudentDto → Student (lecturer portal shape). */
export function mapStudentDtoToStudent(s: StudentDto) {
  return {
    id: s.id,
    name: s.fullName,
    mssv: s.studentCode,
    class: s.class ?? "—",
    gpa: 0,
    company: "Chưa có",
    position: "—",
    supervisor: "—",
    lecturer: "—",
    major: s.major ?? "—",
    status: "Đúng tiến độ",
    progress: 0,
    riskFlag: false,
    avatar: "",
    lastReportName: "—",
    lastReportDate: "—",
    updatedAt: new Date().toISOString(),
    notesCount: 0,
    chatCount: 0,
  };
}
