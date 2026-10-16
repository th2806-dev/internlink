import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { API_URL, TOKEN_STORAGE_KEY } from '../config/env';

export interface RealtimeNotificationPayload {
  id: string;
  userId?: string;
  title: string;
  content: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

type NotificationHandler = (notification: RealtimeNotificationPayload) => void;
type UnreadCountHandler = (unreadCount: number) => void;
type ReportStatusHandler = (reportId: string, status: string, message: string) => void;

class SignalRNotificationService {
  private connection: HubConnection | null = null;
  private notificationHandlers: Set<NotificationHandler> = new Set();
  private unreadCountHandlers: Set<UnreadCountHandler> = new Set();
  private reportStatusHandlers: Set<ReportStatusHandler> = new Set();
  private isConnecting = false;

  public async start(): Promise<void> {
    if (this.connection && this.connection.state === HubConnectionState.Connected) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    const token =
      localStorage.getItem(TOKEN_STORAGE_KEY) ||
      localStorage.getItem('authToken') ||
      '';

    if (!token) {
      return;
    }

    const baseUrl = API_URL.replace(/\/+$/, '');
    const hubUrl = `${baseUrl}/hubs/notifications`;

    try {
      this.isConnecting = true;
      this.connection = new HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () =>
            localStorage.getItem(TOKEN_STORAGE_KEY) ||
            localStorage.getItem('authToken') ||
            '',
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(LogLevel.Warning)
        .build();

      this.registerHandlers(this.connection);
      await this.connection.start();
    } catch (err) {
      console.warn('⚠️ SignalR connection skipped or unavailable (Backend may be in mock/offline mode):', err);
    } finally {
      this.isConnecting = false;
    }
  }

  public async stop(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch (err) {
        console.warn('Error stopping SignalR connection:', err);
      } finally {
        this.connection = null;
      }
    }
  }

  private registerHandlers(conn: HubConnection): void {
    conn.on('ReceiveNotification', (notification: RealtimeNotificationPayload) => {
      this.notificationHandlers.forEach((handler) => {
        try {
          handler(notification);
        } catch (e) {
          console.error('Error in notification handler:', e);
        }
      });
    });

    conn.on('UpdateUnreadCount', (count: number) => {
      this.unreadCountHandlers.forEach((handler) => {
        try {
          handler(count);
        } catch (e) {
          console.error('Error in unread count handler:', e);
        }
      });
    });

    conn.on('ReceiveReportStatusChanged', (reportId: string, status: string, message: string) => {
      this.reportStatusHandlers.forEach((handler) => {
        try {
          handler(reportId, status, message);
        } catch (e) {
          console.error('Error in report status handler:', e);
        }
      });
    });
  }

  public onNotification(handler: NotificationHandler): () => void {
    this.notificationHandlers.add(handler);
    return () => {
      this.notificationHandlers.delete(handler);
    };
  }

  public onUnreadCount(handler: UnreadCountHandler): () => void {
    this.unreadCountHandlers.add(handler);
    return () => {
      this.unreadCountHandlers.delete(handler);
    };
  }

  public onReportStatusChanged(handler: ReportStatusHandler): () => void {
    this.reportStatusHandlers.add(handler);
    return () => {
      this.reportStatusHandlers.delete(handler);
    };
  }

  public isConnected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }
}

export const signalRNotificationService = new SignalRNotificationService();
export default signalRNotificationService;
