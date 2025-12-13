'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loungeApi, LoungeResponse, LoungeSortBy } from '@/lib/lounge';
import { LoungeCard } from '@/components/lounge/LoungeCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

function LoungesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [lounges, setLounges] = useState<LoungeResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  const sortBy = (searchParams.get('sortBy') as LoungeSortBy) || 'popular';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const q = searchParams.get('q') || '';

  useEffect(() => {
    setSearchQuery(q);
  }, [q]);

  useEffect(() => {
    const fetchLounges = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await loungeApi.getList({
          sortBy,
          page,
          limit: 20,
          q: q || undefined,
        });
        setLounges(response.items);
        setMeta(response.meta);
      } catch (err) {
        console.error('Failed to fetch lounges:', err);
        setError('라운지 목록을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLounges();
  }, [sortBy, page, q]);

  const handleSortChange = (newSort: LoungeSortBy) => {
    const params = new URLSearchParams();
    params.set('sortBy', newSort);
    if (q) params.set('q', q);
    router.push(`/lounges?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('sortBy', sortBy);
    if (searchQuery) params.set('q', searchQuery);
    router.push(`/lounges?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    params.set('sortBy', sortBy);
    params.set('page', newPage.toString());
    if (q) params.set('q', q);
    router.push(`/lounges?${params.toString()}`);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">라운지 탐색</h1>
        <Link href="/lounge/create">
          <Button>라운지 만들기</Button>
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="라운지 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="secondary">
              검색
            </Button>
          </div>
        </form>

        <div className="flex gap-2">
          <Button
            variant={sortBy === 'popular' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSortChange('popular')}
          >
            인기순
          </Button>
          <Button
            variant={sortBy === 'recent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSortChange('recent')}
          >
            최신순
          </Button>
          <Button
            variant={sortBy === 'name' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSortChange('name')}
          >
            이름순
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            다시 시도
          </Button>
        </div>
      ) : lounges.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {q ? `"${q}" 검색 결과가 없습니다.` : '아직 라운지가 없습니다.'}
          </p>
          <Link href="/lounge/create">
            <Button className="mt-4">첫 라운지 만들기</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lounges.map((lounge) => (
              <LoungeCard key={lounge.id} lounge={lounge} />
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                이전
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                {page} / {meta.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= meta.totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function LoungesPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="h-8 w-32 bg-muted animate-pulse rounded mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <LoungesContent />
    </Suspense>
  );
}
