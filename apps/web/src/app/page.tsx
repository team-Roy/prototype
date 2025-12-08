'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { user, isAuthenticated, logout, isInitialized } = useAuthStore();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold text-primary">팬덤 라운지</h1>
      <p className="mt-4 text-muted-foreground">소규모 버튜버/크리에이터 팬덤 커뮤니티 플랫폼</p>

      {!isInitialized ? (
        <div className="mt-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : isAuthenticated && user ? (
        <div className="mt-8 text-center">
          <p className="text-lg">
            환영합니다, <span className="font-semibold text-primary">{user.nickname}</span>님!
          </p>
          <Button onClick={logout} variant="outline" className="mt-4">
            로그아웃
          </Button>
        </div>
      ) : (
        <div className="mt-8 flex gap-4">
          <Button asChild>
            <Link href="/login">로그인</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/register">회원가입</Link>
          </Button>
        </div>
      )}
    </main>
  );
}
