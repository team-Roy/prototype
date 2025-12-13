'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  notificationApi,
  Notification,
  NotificationIcon,
  getNotificationLink,
} from '@/lib/notification';
import { formatRelativeTime } from '@fandom/shared';

export function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await notificationApi.getAll({ page, limit: 20 });
      setNotifications(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationApi.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((prev) => prev - 1);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('모든 알림을 삭제하시겠습니까?')) return;

    try {
      await notificationApi.deleteAll();
      setNotifications([]);
      setTotal(0);
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
    }
  };

  if (isLoading && notifications.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">로딩 중...</div>;
  }

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="space-y-4">
      {notifications.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          {hasUnread && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              모두 읽음
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDeleteAll}>
            전체 삭제
          </Button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">알림이 없습니다</div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const link = getNotificationLink(notification);

            return (
              <Card
                key={notification.id}
                className={`${!notification.isRead ? 'border-primary/30 bg-primary/5' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <NotificationIcon
                      type={notification.type}
                      className="w-6 h-6 text-muted-foreground"
                    />
                    <div className="flex-1 min-w-0">
                      {link ? (
                        <Link
                          href={link}
                          className="block hover:underline"
                          onClick={() => {
                            if (!notification.isRead) {
                              handleMarkAsRead(notification.id);
                            }
                          }}
                        >
                          <p className="text-sm">{notification.message}</p>
                        </Link>
                      ) : (
                        <p className="text-sm">{notification.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          읽음
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(notification.id)}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-8">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
            이전
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            {page} / {Math.ceil(total / 20)} 페이지
          </span>
          <Button
            variant="outline"
            disabled={page >= Math.ceil(total / 20)}
            onClick={() => setPage(page + 1)}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
