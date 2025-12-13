import { MessageCircle, Reply, ThumbsUp, AtSign, Megaphone, Bell } from 'lucide-react';
import { api } from './api';

export type NotificationType = 'COMMENT' | 'REPLY' | 'VOTE' | 'MENTION' | 'LOUNGE_NOTICE';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  referenceId: string | null;
  referenceType: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationListParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export const notificationApi = {
  getAll: async (params?: NotificationListParams) => {
    try {
      const response = await api.get<{ data: NotificationListResponse }>('/notifications', {
        params,
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }
  },

  getUnreadCount: async () => {
    try {
      const response = await api.get<{ data: { count: number } }>('/notifications/unread-count');
      return response.data.data.count;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      return 0;
    }
  },

  markAsRead: async (id: string) => {
    const response = await api.post(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.post('/notifications/read-all');
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },

  deleteAll: async () => {
    const response = await api.delete('/notifications');
    return response.data;
  },
};

interface NotificationIconProps {
  type: NotificationType;
  className?: string;
}

export function NotificationIcon({ type, className }: NotificationIconProps) {
  const iconProps = { className };

  switch (type) {
    case 'COMMENT':
      return <MessageCircle {...iconProps} />;
    case 'REPLY':
      return <Reply {...iconProps} />;
    case 'VOTE':
      return <ThumbsUp {...iconProps} />;
    case 'MENTION':
      return <AtSign {...iconProps} />;
    case 'LOUNGE_NOTICE':
      return <Megaphone {...iconProps} />;
    default:
      return <Bell {...iconProps} />;
  }
}

export function getNotificationLink(notification: Notification): string | null {
  if (!notification.referenceId) return null;

  switch (notification.referenceType) {
    case 'post':
      return `/post/${notification.referenceId}`;
    case 'comment':
      return `/post/${notification.referenceId}`;
    case 'lounge':
      return `/lounge/${notification.referenceId}`;
    default:
      return null;
  }
}
