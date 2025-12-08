'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loungeApi, LoungeResponse } from '@/lib/lounge';
import { LoungeList } from '@/components/lounge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const [popularLounges, setPopularLounges] = useState<LoungeResponse[]>([]);
  const [recentLounges, setRecentLounges] = useState<LoungeResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLounges = async () => {
      try {
        const [popular, recent] = await Promise.all([
          loungeApi.getPopular(6),
          loungeApi.getList({ sortBy: 'recent', limit: 6 }),
        ]);
        setPopularLounges(popular);
        setRecentLounges(recent.items);
      } catch (error) {
        console.error('Failed to fetch lounges:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLounges();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="text-center py-8 bg-gradient-to-b from-primary/10 to-transparent rounded-xl">
        <h1 className="text-3xl font-bold text-primary mb-2">팬덤 라운지</h1>
        <p className="text-muted-foreground mb-4">소규모 버튜버/크리에이터 팬덤 커뮤니티 플랫폼</p>
        {isAuthenticated ? (
          <Button asChild>
            <Link href="/lounge/create">라운지 만들기</Link>
          </Button>
        ) : (
          <div className="flex justify-center gap-2">
            <Button asChild>
              <Link href="/login">로그인</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/register">회원가입</Link>
            </Button>
          </div>
        )}
      </section>

      {/* Popular Lounges */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">인기 라운지</h2>
          <Link href="/lounges?sortBy=popular" className="text-sm text-primary hover:underline">
            더보기
          </Link>
        </div>
        <LoungeList lounges={popularLounges} emptyMessage="아직 라운지가 없습니다" />
      </section>

      {/* Recent Lounges */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">최신 라운지</h2>
          <Link href="/lounges?sortBy=recent" className="text-sm text-primary hover:underline">
            더보기
          </Link>
        </div>
        <LoungeList lounges={recentLounges} emptyMessage="아직 라운지가 없습니다" />
      </section>
    </div>
  );
}
