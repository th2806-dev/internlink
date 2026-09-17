import { apiRequest } from "../lib/apiClient";
import type { TestEmailRequestDto } from "../types/api";

export interface SendEmailResultDto {
  success: boolean;
  message?: string | null;
}

export const adminEmailService = {
  testEmail(body: TestEmailRequestDto): Promise<SendEmailResultDto> {
    return apiRequest<SendEmailResultDto>("/api/SuperAdmin/email/test", {
      method: "POST",
      body,
    });
  },
};
