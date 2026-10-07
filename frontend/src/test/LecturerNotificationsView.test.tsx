import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationsView } from "../features/lecturer/pages/NotificationsView";
import { notificationService } from "../services/notification.service";
import type { NotificationDto } from "../types/api";

vi.mock("../services/notification.service", () => ({
  notificationService: {
    getMine: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

const getMine = vi.mocked(notificationService.getMine);
const markRead = vi.mocked(notificationService.markRead);
const markAllRead = vi.mocked(notificationService.markAllRead);

const notification: NotificationDto = {
  id: "notification-1",
  userId: "lecturer-1",
  title: "Báo cáo tuần mới",
  content: "Sinh viên vừa nộp báo cáo tuần.",
  senderName: "Nguyễn An",
  isRead: false,
  createdAt: "2026-10-07T08:00:00Z",
};
beforeEach(() => {
  vi.clearAllMocks();
  getMine.mockResolvedValue([notification]);
  markRead.mockResolvedValue();
  markAllRead.mockResolvedValue(1);
});

describe("NotificationsView lecturer", () => {
  it("does not show a banner and renders notification data from API", async () => {
    render(<NotificationsView />);

    expect((await screen.findAllByText("Báo cáo tuần mới")).length).toBeGreaterThan(0);
    expect(screen.queryByText("CỔNG THÔNG TIN GIẢNG VIÊN HƯỚNG DẪN")).not.toBeInTheDocument();
    expect(screen.getAllByText("Sinh viên vừa nộp báo cáo tuần.").length).toBeGreaterThan(0);
    expect(getMine).toHaveBeenCalledOnce();
  });

  it("does not mark a notification read locally when the API fails", async () => {
    const user = userEvent.setup();
    markRead.mockRejectedValueOnce(new Error("Không thể cập nhật"));
    render(<NotificationsView />);

    const item = await screen.findByRole("button", { name: /Báo cáo tuần mới/ });
    await user.click(item);

    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể cập nhật trạng thái thông báo");
    expect(item.querySelector('[aria-label="Chưa đọc"]')).not.toBeNull();
  });

  it("shows an explicit empty state for an empty API response", async () => {
    getMine.mockResolvedValue([]);
    render(<NotificationsView />);

    expect(await screen.findByText("Chưa có thông báo.")).toBeInTheDocument();
    expect(screen.getByText(/sẽ hiển thị tại đây/)).toBeInTheDocument();
  });
});
