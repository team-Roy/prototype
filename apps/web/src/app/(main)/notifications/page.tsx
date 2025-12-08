'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NotificationList } from '@/components/notification';
import { useAuthStore } from '@/stores/authStore';

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/notifications');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-6">
        <div className="text-center text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container max-w-2xl py-6">
      <h1 className="text-2xl font-bold mb-6">알림</h1>
      <NotificationList />
    </div>
  );
}
