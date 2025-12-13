'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useRequireAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { isLoading } = useRequireAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">내 정보</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>프로필</CardTitle>
          <CardDescription>회원 정보를 확인하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.nickname}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {user.nickname.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user.nickname}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="pt-4 border-t space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">이메일</span>
              <span>{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">닉네임</span>
              <span>{user.nickname}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">역할</span>
              <span>{user.role === 'ADMIN' ? '관리자' : '일반 회원'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>계정 관리</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start" disabled>
            프로필 수정 (준비 중)
          </Button>
          <Button variant="outline" className="w-full justify-start" disabled>
            비밀번호 변경 (준비 중)
          </Button>
          <Button variant="destructive" className="w-full" onClick={handleLogout}>
            로그아웃
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
