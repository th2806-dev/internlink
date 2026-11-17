import { apiRequest, downloadAuthenticatedFile } from "../lib/apiClient";
import type {
  StudentDashboardProgressDto,
  StudentDto,
  StudentIntroductionLetterDto,
  StudentPortalProfileDto,
} from "../types/api";

export interface UpdateStudentProfilePayload {
  fullName: string;
  email?: string;
  phone?: string;
  department?: string;
  desiredPosition?: string;
  alternativePosition?: string;
  desiredLocation?: string;
  workPreference?: string;
  preferredIndustry?: string;
  skills?: string;
  resumeUrl?: string;
}

export const studentPortalService = {
  getMe(): Promise<StudentPortalProfileDto> {
    return apiRequest<StudentPortalProfileDto>("/api/StudentPortal/me");
  },

  getDashboardProgress(): Promise<StudentDashboardProgressDto> {
    return apiRequest<StudentDashboardProgressDto>("/api/v1/student/dashboard-progress");
  },

  getIntroductionLetter(): Promise<StudentIntroductionLetterDto> {
    return apiRequest<StudentIntroductionLetterDto>("/api/v1/student/introduction-letter");
  },

  updateMe(payload: UpdateStudentProfilePayload): Promise<StudentDto> {
    return apiRequest<StudentDto>("/api/StudentPortal/me", {
      method: "PUT",
      body: payload,
    });
  },

  downloadCertificate() {
    return downloadAuthenticatedFile(
      "/api/StudentPortal/internship-certificate",
      "Phieu-Thuc-Tap.pdf",
    );
  },
};
