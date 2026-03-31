export type NotificationType =
  | 'pod_joined'
  | 'pod_full'
  | 'pod_started'
  | 'pod_completed'
  | 'message'
  | 'rating'
  | 'system';

export interface Notification {
  notificationId: string;
  notificationType: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  relatedId: string | null;
  createdAt: string;
}

export interface NotificationSetting {
  notificationType: NotificationType;
  isEnabled: boolean;
}
