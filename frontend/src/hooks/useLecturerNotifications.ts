import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notification.service';
import { mapNotificationDtoToLecturerUi } from '../lib/portalMappers';
import type { SystemNotificationItem } from '../features/lecturer/pages/NotificationsView';

export interface UseLecturerNotificationsState {
  notifications: SystemNotificationItem[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
}

export const useLecturerNotifications = (): UseLecturerNotificationsState => {
  const [notifications, setNotifications] = useState<SystemNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await notificationService.getMine();
      const mapped: SystemNotificationItem[] = rows.map((n) => {
        const base = mapNotificationDtoToLecturerUi(n);
        return {
          id: base.id,
          title: base.title,
          desc: base.desc,
          type: base.type as SystemNotificationItem['type'],
          category: 'Hệ thống & Admin',
          priority: base.priority as SystemNotificationItem['priority'],
          color: base.color as SystemNotificationItem['color'],
          isUnread: base.isUnread,
          time: base.time,
          createdAt: base.createdAt,
          sender: base.sender,
          receiver: base.receiver,
          content: base.content,
          attachments: base.attachments,
        };
      });
      setNotifications(mapped);
      setError(null);
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to fetch notifications');
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isUnread: false } : n))
    );
    try {
      await notificationService.markAsRead(id);
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return { notifications, loading, error, refetch: fetchNotifications, markAsRead };
};
