/**
 * QUERY KEY FACTORY — nguồn duy nhất định danh mọi cache key của TanStack Query.
 *
 * Quy ước đặt key:
 * 1. Namespace gốc phân biệt PHÂN HỆ/VAI TRÒ (`admin`, `lecturer`, `student`...)
 * 2. Mọi key danh sách PHẢI đóng gói `semesterId` (hoặc `userId`, `departmentId`).
 * 3. Filter/pagination đặt trong object params → object khác nhau = key khác nhau.
 */
export type QueryParams = Record<string, unknown>;

/** "all" hoặc GUID — chuẩn hóa scope học kỳ để key không vỡ khi đổi bộ lọc. */
const semesterScope = (semesterId?: string | null): string =>
  semesterId && semesterId !== "all" ? semesterId : "all";

export const queryKeys = {
  /* ── Lát dọc tiên phong: duyệt báo cáo tuần của giảng viên ───────────── */
  lecturerReports: {
    all: ["lecturer", "reports"] as const,
    list: (params: QueryParams) =>
      [...queryKeys.lecturerReports.all, "list", params] as const,
    totals: (semesterId?: string | null, userId?: string | null) => {
      const key = [...queryKeys.lecturerReports.all, "totals", semesterScope(semesterId)] as const;
      return userId ? [...key, userId] as const : key;
    },
  },

  /* ── Portal Giảng viên (dữ liệu tổng hợp) ────────────────────────────── */
  lecturerPortal: {
    all: ["lecturer", "portal"] as const,
    data: (params: QueryParams | string = {}) =>
      [...queryKeys.lecturerPortal.all, "data", typeof params === "string" ? semesterScope(params) : params] as const,
    stats: (params: QueryParams | string = {}) =>
      [...queryKeys.lecturerPortal.all, "stats", typeof params === "string" ? semesterScope(params) : params] as const,
  },

  /* ── Phân hệ Admin ─────────────────────────────────────────────────── */
  admin: {
    all: ["admin"] as const,
    dashboardAll: ["admin", "dashboard"] as const,
    navStatsAll: ["admin", "nav-stats"] as const,
    templatesAll: ["admin", "templates"] as const,
    students: {
      all: ["admin", "students"] as const,
      list: (params: QueryParams) =>
        [...queryKeys.admin.students.all, "list", params] as const,
      counts: (params: QueryParams = {}) =>
        [...queryKeys.admin.students.all, "counts", params] as const,
      options: (params: QueryParams = {}) =>
        [...queryKeys.admin.students.all, "options", params] as const,
    },
    lecturers: {
      all: ["admin", "lecturers"] as const,
      list: (params: QueryParams) =>
        [...queryKeys.admin.lecturers.all, "list", params] as const,
      counts: (params: QueryParams = {}) =>
        [...queryKeys.admin.lecturers.all, "counts", params] as const,
    },
    users: {
      all: ["admin", "users"] as const,
      list: (params: QueryParams) =>
        [...queryKeys.admin.users.all, "list", params] as const,
      counts: (params: QueryParams = {}) =>
        [...queryKeys.admin.users.all, "counts", params] as const,
    },
    companies: {
      all: ["admin", "companies"] as const,
      list: (params: QueryParams) =>
        [...queryKeys.admin.companies.all, "list", params] as const,
    },
    templates: {
      all: ["admin", "templates"] as const,
      list: (params: QueryParams = {}) =>
        [...queryKeys.admin.templates.all, "list", params] as const,
    },
    assignments: {
      all: ["admin", "assignments"] as const,
      matrix: (params: QueryParams = {}) =>
        [...queryKeys.admin.assignments.all, "matrix", params] as const,
    },
    notifications: {
      all: ["admin", "notifications"] as const,
      list: (params: QueryParams = {}) =>
        [...queryKeys.admin.notifications.all, "list", params] as const,
    },
    schoolTerms: {
      all: ["admin", "school-terms"] as const,
      list: () => [...queryKeys.admin.schoolTerms.all, "list"] as const,
    },
    evidenceDeadline: (semesterId?: string | null, userId?: string | null) =>
      [...queryKeys.admin.all, "evidence-deadline", semesterScope(semesterId), userId ?? "mine"] as const,
    accountRequests: {
      all: ["admin", "account-requests"] as const,
      list: (params: QueryParams = {}) =>
        [...queryKeys.admin.accountRequests.all, "list", params] as const,
    },
    attendance: {
      all: ["admin", "attendance"] as const,
      list: (params: QueryParams) =>
        [...queryKeys.admin.attendance.all, "list", params] as const,
      session: (id: string) =>
        [...queryKeys.admin.attendance.all, "session", id] as const,
    },
    reportArchive: {
      all: ["admin", "report-archive"] as const,
      list: (params: QueryParams = {}) =>
        [...queryKeys.admin.reportArchive.all, "list", params] as const,
    },
    departments: {
      all: ["admin", "departments"] as const,
      list: (params: QueryParams = {}) =>
        [...queryKeys.admin.departments.all, "list", params] as const,
    },
    settings: {
      all: ["admin", "settings"] as const,
      data: (params: QueryParams = {}) =>
        [...queryKeys.admin.settings.all, "data", params] as const,
    },
    backups: {
      all: ["admin", "backups"] as const,
      list: (params: QueryParams = {}) =>
        [...queryKeys.admin.backups.all, "list", params] as const,
    },
    dashboard: (params: QueryParams) =>
      [...queryKeys.admin.dashboardAll, params] as const,
    navStats: (params: QueryParams) =>
      [...queryKeys.admin.navStatsAll, params] as const,
    gradingSummary: (params: QueryParams = {}) =>
      [...queryKeys.admin.all, "grading-summary", params] as const,
    summary: (params: QueryParams = {}) =>
      [...queryKeys.admin.all, "summary", params] as const,
    facultySummary: (params: QueryParams = {}) =>
      [...queryKeys.admin.all, "faculty-summary", params] as const,
  },

  semesters: {
    all: ["semester-context", "semesters"] as const,
    list: (params: QueryParams = {}) =>
      [...queryKeys.semesters.all, params] as const,
  },
  departments: {
    all: ["semester-context", "departments"] as const,
    list: (params: QueryParams = {}) =>
      [...queryKeys.departments.all, params] as const,
  },
  auth: {
    all: ["auth"] as const,
    lecturerProfile: (userId?: string | null) =>
      [...queryKeys.auth.all, "lecturer-profile", userId ?? "mine"] as const,
    sessions: (userId?: string | null) =>
      [...queryKeys.auth.all, "sessions", userId ?? "mine"] as const,
    activity: (userId?: string | null, limit = 30) =>
      [...queryKeys.auth.all, "activity", userId ?? "mine", limit] as const,
  },

  /* ── Phân hệ Giảng viên ──────────────────────────────────────────────── */
  lecturer: {
    all: ["lecturer-portal"] as const,
    templatesAll: ["lecturer-portal", "templates"] as const,
    analyticsAll: ["lecturer-portal", "analytics"] as const,
    students: {
      all: ["lecturer-portal", "students"] as const,
      list: (params: QueryParams) =>
        [...queryKeys.lecturer.students.all, "list", params] as const,
    },
    companies: {
      all: ["lecturer-portal", "companies"] as const,
      list: (params: QueryParams) =>
        [...queryKeys.lecturer.companies.all, "list", params] as const,
    },
    evaluations: {
      all: ["lecturer-portal", "evaluations"] as const,
      list: (params: QueryParams = {}) =>
        [...queryKeys.lecturer.evaluations.all, "list", params] as const,
      summary: (params: QueryParams = {}) =>
        [...queryKeys.lecturer.evaluations.all, "summary", params] as const,
    },
    schedules: {
      all: ["lecturer-portal", "schedules"] as const,
      list: (params: QueryParams = {}) =>
        [...queryKeys.lecturer.schedules.all, "list", params] as const,
    },
    internships: {
      all: ["lecturer-portal", "internships"] as const,
      list: (params: QueryParams = {}) =>
        [...queryKeys.lecturer.internships.all, "list", params] as const,
    },
    templateVersions: (id?: string | null, userId?: string | null) =>
      [...queryKeys.lecturer.all, "template-versions", id ?? "all", userId ?? "all"] as const,
    notifications: {
      all: ["lecturer-portal", "notifications"] as const,
      list: (params: QueryParams = {}) =>
        [...queryKeys.lecturer.notifications.all, "list", params] as const,
    },
    submissions: {
      all: ["lecturer-portal", "submissions"] as const,
      list: (semesterId?: string | null) =>
        [...queryKeys.lecturer.submissions.all, "list", semesterScope(semesterId)] as const,
    },
    dashboard: (semesterId?: string | null) =>
      [...queryKeys.lecturer.all, "dashboard", semesterScope(semesterId)] as const,
    history: (semesterId?: string | null, userId?: string | null) =>
      [...queryKeys.lecturer.all, "history", semesterScope(semesterId), userId ?? "mine"] as const,
    assignedSemesters: (lecturerId?: string | null) =>
      [...queryKeys.lecturer.all, "assigned-semesters", lecturerId ?? "mine"] as const,
    attendance: (params: QueryParams = {}) =>
      [...queryKeys.lecturer.all, "attendance", params] as const,
    summary: (params: QueryParams = {}) =>
      [...queryKeys.lecturer.all, "summary", params] as const,
    reportSummary: (params: QueryParams = {}) =>
      [...queryKeys.lecturer.all, "report-summary", params] as const,
    templates: (params: QueryParams = {}) =>
      [...queryKeys.lecturer.all, "templates", params] as const,
    analytics: (semesterId?: string | null, userId?: string | null) =>
      [...queryKeys.lecturer.analyticsAll, "semester", semesterScope(semesterId), userId ?? "mine"] as const,
    analyticsComparison: (userId?: string | null) =>
      [...queryKeys.lecturer.analyticsAll, "comparison", userId ?? "mine"] as const,
  },

  /* ── Phân hệ Sinh viên ───────────────────────────────────────────────── */
  student: {
    all: ["student"] as const,
    dashboardAll: ["student", "dashboard"] as const,
    dashboardExtrasAll: ["student", "dashboard", "extras"] as const,
    profile: (userId?: string | null) =>
      [...queryKeys.student.all, "profile", userId ?? "anonymous"] as const,
    weeklyReports: {
      all: ["student", "weekly-reports"] as const,
      list: (params: QueryParams) =>
        [...queryKeys.student.weeklyReports.all, "list", params] as const,
    },
    submissions: {
      all: ["student", "submissions"] as const,
      list: (params: QueryParams = {}) =>
        [...queryKeys.student.submissions.all, "list", params] as const,
    },
    attendance: {
      all: ["student", "attendance"] as const,
      list: (params: QueryParams = {}) =>
        [...queryKeys.student.attendance.all, "list", params] as const,
    },
    evaluation: {
      all: ["student", "evaluation"] as const,
      detail: (params: QueryParams = {}) =>
        [...queryKeys.student.evaluation.all, "detail", params] as const,
    },
    internship: {
      all: ["student", "internship"] as const,
      detail: (userId?: string | null, semesterId?: string | null) =>
        [...queryKeys.student.internship.all, "detail", userId ?? "mine", semesterScope(semesterId)] as const,
    },
    templates: {
      all: ["student", "templates"] as const,
      list: (params: QueryParams = {}) =>
        [...queryKeys.student.templates.all, "list", params] as const,
    },
    evidenceDeadline: (semesterId?: string | null, userId?: string | null) =>
      [...queryKeys.student.all, "evidence-deadline", semesterScope(semesterId), userId ?? "mine"] as const,
    evidenceAsset: (submissionId: string, assetId: string, userId?: string | null) =>
      [...queryKeys.student.all, "evidence-asset", submissionId, assetId, userId ?? "mine"] as const,
    feedback: {
      all: ["student", "feedback"] as const,
      list: (params: QueryParams = {}) =>
        [...queryKeys.student.feedback.all, "list", params] as const,
    },
    notifications: {
      all: ["student", "notifications"] as const,
      list: (params: QueryParams = {}) =>
        [...queryKeys.student.notifications.all, "list", params] as const,
    },
    dashboard: (semesterId?: string | null, userId?: string | null) => {
      const key = [...queryKeys.student.dashboardAll, semesterScope(semesterId)] as const;
      return userId ? [...key, userId] as const : key;
    },
    dashboardExtras: (params: QueryParams) =>
      [
        ...queryKeys.student.dashboard(
          typeof params.semesterId === "string" ? params.semesterId : null,
          typeof params.userId === "string" ? params.userId : null,
        ),
        "extras",
        typeof params.internshipId === "string" ? params.internshipId : null,
      ] as const,
  },
} as const;

export const queryKeysHelpers = { semesterScope };
