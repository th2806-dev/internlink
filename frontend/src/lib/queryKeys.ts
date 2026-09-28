/**
 * QUERY KEY FACTORY — nguồn duy nhất định danh mọi cache key của TanStack Query.
 *
 * Quy ước đặt key (bắt buộc với mọi slice mới):
 * 1. Namespace gốc phân biệt PHÂN HỆ/VAI TRÒ (`admin`, `lecturer`, `student`...)
 *    → tránh trùng key giữa các vai trò khác quyền truy cập.
 * 2. Mọi key danh sách PHẢI đóng gói `semesterId` → đổi kỳ thực tập là đổi key,
 *    không bao giờ đọc nhầm dữ liệu của kỳ trước (Cache Isolation - DoD).
 * 3. Filter/pagination đặt trong object params → object khác nhau = key khác nhau,
 *    TanStack tự dedupe request trùng và invalidate theo cấp namespace.
 *
 * Invalidate phạm vi rộng sau mutation: `queryClient.invalidateQueries({ queryKey: queryKeys.x.all })`
 * (invalidate theo TIỀN TỐ → mọi `list`/`counts` con đều được làm mới).
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
    totals: (semesterId?: string | null) =>
      [...queryKeys.lecturerReports.all, "totals", semesterScope(semesterId)] as const,
  },

  /* ── Portal Giảng viên (dữ liệu tổng hợp sẽ chuyển sang query ở GĐ 4) ── */
  lecturerPortal: {
    all: ["lecturer", "portal"] as const,
    data: (semesterId?: string | null) =>
      [...queryKeys.lecturerPortal.all, "data", semesterScope(semesterId)] as const,
    stats: (semesterId?: string | null) =>
      [...queryKeys.lecturerPortal.all, "stats", semesterScope(semesterId)] as const,
  },

  /* ── Phân hệ Admin (Giai đoạn 3) ─────────────────────────────────────── */
  admin: {
    all: ["admin"] as const,
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
      list: (params: QueryParams) =>
        [...queryKeys.admin.templates.all, "list", params] as const,
    },
    accountRequests: {
      all: ["admin", "account-requests"] as const,
      list: (params: QueryParams) =>
        [...queryKeys.admin.accountRequests.all, "list", params] as const,
    },
    dashboard: (semesterId?: string | null) =>
      [...queryKeys.admin.all, "dashboard", semesterScope(semesterId)] as const,
  },

  /* ── Phân hệ Giảng viên (Giai đoạn 3/4) ──────────────────────────────── */
  lecturer: {
    all: ["lecturer-portal"] as const,
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
      list: (params: QueryParams) =>
        [...queryKeys.lecturer.evaluations.all, "list", params] as const,
    },
    notifications: {
      all: ["lecturer-portal", "notifications"] as const,
      list: (params: QueryParams) =>
        [...queryKeys.lecturer.notifications.all, "list", params] as const,
    },
    submissions: {
      all: ["lecturer-portal", "submissions"] as const,
      list: (semesterId?: string | null) =>
        [...queryKeys.lecturer.submissions.all, "list", semesterScope(semesterId)] as const,
    },
    dashboard: (semesterId?: string | null) =>
      [...queryKeys.lecturer.all, "dashboard", semesterScope(semesterId)] as const,
  },

  /* ── Phân hệ Sinh viên (Giai đoạn 3/4) ───────────────────────────────── */
  student: {
    all: ["student"] as const,
    weeklyReports: {
      all: ["student", "weekly-reports"] as const,
      list: (params: QueryParams) =>
        [...queryKeys.student.weeklyReports.all, "list", params] as const,
    },
    submissions: {
      all: ["student", "submissions"] as const,
      list: (params: QueryParams) =>
        [...queryKeys.student.submissions.all, "list", params] as const,
    },
    feedback: {
      all: ["student", "feedback"] as const,
      list: (params: QueryParams) =>
        [...queryKeys.student.feedback.all, "list", params] as const,
    },
    notifications: {
      all: ["student", "notifications"] as const,
      list: (params: QueryParams) =>
        [...queryKeys.student.notifications.all, "list", params] as const,
    },
    dashboard: (semesterId?: string | null) =>
      [...queryKeys.student.all, "dashboard", semesterScope(semesterId)] as const,
  },
} as const;

export const queryKeysHelpers = { semesterScope };
