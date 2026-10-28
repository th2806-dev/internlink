import { createContext, useContext, type ReactNode } from "react";
import { useStudentPortalContext } from "../hooks/useStudentPortalContext";
import type { StudentProfile } from "../types/common";
import type { InternshipDto, StudentPortalProfileDto } from "../types/api";

type StudentPortalContextValue = {
  profile: StudentProfile;
  internship: InternshipDto | null;
  internshipId: string | null;
  portalData: StudentPortalProfileDto | null;
  isArchiveReadOnly: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const StudentPortalContext = createContext<StudentPortalContextValue | null>(
  null,
);

export function StudentPortalProvider({ children }: { children: ReactNode }) {
  const value = useStudentPortalContext();
  return (
    <StudentPortalContext.Provider
      value={{
        ...value,
        isArchiveReadOnly: value.isArchiveReadOnly,
      }}
    >
      {children}
    </StudentPortalContext.Provider>
  );
}

export function useStudentPortal() {
  const ctx = useContext(StudentPortalContext);
  if (!ctx) {
    throw new Error("useStudentPortal must be used within StudentPortalProvider");
  }
  return ctx;
}

/** Safe hook — returns mock profile outside provider (e.g. tests). */
export function useStudentPortalOptional() {
  return useContext(StudentPortalContext);
}
