'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/search';
import { NotificationDropdown } from '@/components/notification';

export function Header() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <span className="text-primary">팬덤 라운지</span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-md mx-4">
          <SearchBar showSuggestions={true} />
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-2">
          {isAuthenticated && user ? (
            <>
              <Button variant="ghost" asChild>
                <Link href="/lounge/create">라운지 만들기</Link>
              </Button>
              <NotificationDropdown />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{user.nickname}</span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  로그아웃
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">로그인</Link>
              </Button>
              <Button asChild>
                <Link href="/register">회원가입</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
