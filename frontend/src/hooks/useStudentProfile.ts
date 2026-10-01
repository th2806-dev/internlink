import { useBackendData } from './useBackendData';

/**
 * Hook for fetching student profile from StudentPortal API
 * Replaces hardcoded STUDENT_PROFILE mockdata
 */

interface StudentPortalProfileResponse {
  name: string;
  mssv: string;
  class: string;
  semester: string;
  major: string;
  company: string;
  companyLogo?: string;
  position: string;
  statusBadge: string;
  overallProgress: number;
  currentGrade?: number;
  reportsSubmitted?: number;
  totalReports?: number;
  lecturerName: string;
  supervisorName: string;
  supervisorEmail?: string;
  supervisorPhone?: string;
  companyAddress?: string;
  currentPhase?: string;
}

interface UseStudentProfileState {
  profile: StudentPortalProfileResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const useStudentProfile = (): UseStudentProfileState => {
  // Fetch student profile from backend
  const { data: profile, loading, error, refetch } = useBackendData<StudentPortalProfileResponse>(
    '/StudentPortal/profile'
  );

  return { profile, loading, error, refetch };
};
