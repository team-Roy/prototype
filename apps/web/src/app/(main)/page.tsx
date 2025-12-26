'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loungeApi, LoungeResponse } from '@/lib/lounge';
import { LoungeList } from '@/components/lounge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { Search, Plus, TrendingUp, Clock, Users } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [popularLounges, setPopularLounges] = useState<LoungeResponse[]>([]);
  const [recentLounges, setRecentLounges] = useState<LoungeResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero - 검색 중심으로 변경 */}
      <section className="text-center py-10 bg-gradient-to-b from-primary/10 to-transparent rounded-xl">
        <h1 className="text-3xl font-bold text-primary mb-2">팬덤 라운지</h1>
        <p className="text-muted-foreground mb-6">좋아하는 크리에이터의 팬덤에 참여하세요</p>

        {/* 검색창 */}
        <form onSubmit={handleSearch} className="max-w-md mx-auto mb-6 px-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="크리에이터, 라운지 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
        </form>

        {/* 빠른 액션 버튼들 */}
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/lounges">
              <Users className="w-4 h-4 mr-1" />
              모든 라운지
            </Link>
          </Button>
          {isAuthenticated && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/lounge/create">
                <Plus className="w-4 h-4 mr-1" />
                라운지 만들기
              </Link>
            </Button>
          )}
          {!isAuthenticated && (
            <>
              <Button size="sm" asChild>
                <Link href="/login">로그인</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/register">회원가입</Link>
              </Button>
            </>
          )}
        </div>
      </section>

      {/* 인기 라운지 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            인기 라운지
          </h2>
          <Link href="/lounges?sortBy=popular" className="text-sm text-primary hover:underline">
            더보기
          </Link>
        </div>
        <LoungeList lounges={popularLounges} emptyMessage="아직 라운지가 없습니다" />
      </section>

      {/* 최신 라운지 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            최신 라운지
          </h2>
          <Link href="/lounges?sortBy=recent" className="text-sm text-primary hover:underline">
            더보기
          </Link>
        </div>
        <LoungeList lounges={recentLounges} emptyMessage="아직 라운지가 없습니다" />
      </section>

      {/* 크리에이터 안내 배너 - 로그인한 일반 사용자에게만 */}
      {isAuthenticated && user?.role === 'USER' && (
        <section className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">크리에이터이신가요?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            크리에이터로 인증하고 공식 라운지를 운영해보세요
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/profile">크리에이터 신청하기</Link>
          </Button>
        </section>
      )}
    </div>
  );
}
