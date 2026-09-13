import { apiRequest, downloadAuthenticatedFile } from "../lib/apiClient";
import type { StudentDto, StudentPortalProfileDto } from "../types/api";

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
