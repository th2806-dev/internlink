/** MVP feature flags — flip to true when backend/IA ready. */
export const FEATURES = {
  /** Admin Kỳ thực tập */
  adminSemesters: true,
  /** Admin Yêu cầu tài khoản */
  adminAccountRequests: true,
  /** Lecturer Analytics nâng cao */
  lecturerAnalytics: true,
} as const;

export type FeatureFlag = keyof typeof FEATURES;
