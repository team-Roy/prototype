'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/search';
import { NotificationDropdown } from '@/components/notification';
import { ThemeToggle } from '@/components/ThemeToggle';
import { RoleBadge } from '@/components/ui/role-badge';

export function Header() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center gap-2 sm:gap-4">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 font-bold text-lg sm:text-xl">
          <span className="text-primary hidden sm:inline">팬덤 라운지</span>
          <span className="text-primary sm:hidden">FL</span>
        </Link>

        {/* Search - hidden on mobile, shown via MobileNav */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4 hidden sm:block">
          <SearchBar showSuggestions={true} />
        </div>

        {/* Spacer for mobile */}
        <div className="flex-1 sm:hidden" />

        {/* User Menu */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <ThemeToggle />
          {isAuthenticated && user ? (
            <>
              {user.role === 'ADMIN' && (
                <Button variant="ghost" size="sm" className="hidden md:flex" asChild>
                  <Link href="/admin">관리자</Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" className="hidden md:flex" asChild>
                <Link href="/lounge/create">라운지 만들기</Link>
              </Button>
              <NotificationDropdown />
              <Link
                href="/profile"
                className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent transition-colors"
              >
                <span
                  className={`text-sm font-medium truncate max-w-[100px] ${
                    user.role === 'ADMIN'
                      ? 'text-red-500'
                      : user.role === 'CREATOR'
                        ? 'text-purple-500'
                        : ''
                  }`}
                >
                  {user.nickname}
                </span>
                <RoleBadge role={user.role} size="sm" />
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout} className="hidden sm:flex">
                로그아웃
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">로그인</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">회원가입</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
