import type { AdminNotificationCampaignDto } from "../services/adminNotifications.service";

function formatViDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("vi-VN");
  } catch {
    return iso;
  }
}

const AUDIENCE_LABEL: Record<string, string> = {
  all: "Toàn bộ hệ thống",
  student: "Sinh viên",
  lecturer: "Giảng viên",
};

export function mapCampaignToAdminRow(
  c: AdminNotificationCampaignDto,
  index: number,
) {
  const sentLabel = formatViDate(c.sentAt);
  return {
    id: `TB-${c.sentAt}-${index}`,
    title: c.title,
    content: c.content,
    type: "Thông báo",
    priority: "medium" as const,
    audienceType: (c.audience === "student" || c.audience === "lecturer" ? c.audience : "all") as "all" | "student" | "lecturer",
    audienceLabel: AUDIENCE_LABEL[c.audience] ?? c.audience,
    recipientCount: c.recipientCount,
    sentAt: sentLabel,
    createdAt: sentLabel,
    createdBy: "Quản trị hệ thống",
    status: "sent" as const,
    readCount: c.readCount,
    totalRecipients: c.recipientCount,
    campaignSentAt: c.sentAt,
  };
}
