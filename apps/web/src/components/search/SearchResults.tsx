'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { searchApi, SearchResponse, SearchType } from '@/lib/search';
import { formatNumber, formatRelativeTime } from '@fandom/shared';

interface SearchResultsProps {
  query: string;
  type: SearchType;
  onTypeChange: (type: SearchType) => void;
}

export function SearchResults({ query, type, onTypeChange }: SearchResultsProps) {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await searchApi.search({ q: query, type, page, limit: 20 });
        setResults(data);
      } catch (err) {
        setError('검색 중 오류가 발생했습니다.');
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query, type, page]);

  useEffect(() => {
    setPage(1);
  }, [query, type]);

  if (!query.trim()) {
    return <div className="text-center py-12 text-muted-foreground">검색어를 입력해주세요.</div>;
  }

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">검색 중...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-destructive">{error}</div>;
  }

  if (!results) {
    return null;
  }

  const { lounges, posts } = results.results;
  const totalResults = lounges.total + posts.total;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <TabButton active={type === 'all'} onClick={() => onTypeChange('all')}>
          전체 ({totalResults})
        </TabButton>
        <TabButton active={type === 'lounge'} onClick={() => onTypeChange('lounge')}>
          라운지 ({lounges.total})
        </TabButton>
        <TabButton active={type === 'post'} onClick={() => onTypeChange('post')}>
          게시물 ({posts.total})
        </TabButton>
      </div>

      {/* Results */}
      {totalResults === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          &quot;{query}&quot;에 대한 검색 결과가 없습니다.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Lounges */}
          {(type === 'all' || type === 'lounge') && lounges.items.length > 0 && (
            <section>
              {type === 'all' && (
                <h2 className="text-lg font-semibold mb-4">라운지 ({lounges.total})</h2>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {lounges.items.map((lounge) => (
                  <Link key={lounge.id} href={`/lounge/${lounge.slug}`}>
                    <Card className="hover:bg-accent transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                            {lounge.icon || lounge.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold truncate">{lounge.name}</h3>
                              {lounge.isOfficial && (
                                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                  공식
                                </span>
                              )}
                            </div>
                            {lounge.description && (
                              <p className="text-sm text-muted-foreground truncate">
                                {lounge.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              멤버 {formatNumber(lounge.memberCount)}명
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              {type === 'all' && lounges.total > lounges.items.length && (
                <Button
                  variant="ghost"
                  className="mt-4 w-full"
                  onClick={() => onTypeChange('lounge')}
                >
                  라운지 더보기 ({lounges.total - lounges.items.length}개)
                </Button>
              )}
            </section>
          )}

          {/* Posts */}
          {(type === 'all' || type === 'post') && posts.items.length > 0 && (
            <section>
              {type === 'all' && (
                <h2 className="text-lg font-semibold mb-4">게시물 ({posts.total})</h2>
              )}
              <div className="space-y-3">
                {posts.items.map((post) => (
                  <Link key={post.id} href={`/post/${post.id}`}>
                    <Card className="hover:bg-accent transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                              <Link
                                href={`/lounge/${post.lounge.slug}`}
                                className="hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {post.lounge.name}
                              </Link>
                              <span>·</span>
                              <span>{post.author.nickname}</span>
                              <span>·</span>
                              <span>{formatRelativeTime(post.createdAt)}</span>
                            </div>
                            <h3 className="font-semibold mb-1 line-clamp-1">
                              {post.title || post.content.slice(0, 50)}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {post.content}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground whitespace-nowrap">
                            <span>👍 {formatNumber(post.upvoteCount)}</span>
                            <span>💬 {formatNumber(post.commentCount)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              {type === 'all' && posts.total > posts.items.length && (
                <Button
                  variant="ghost"
                  className="mt-4 w-full"
                  onClick={() => onTypeChange('post')}
                >
                  게시물 더보기 ({posts.total - posts.items.length}개)
                </Button>
              )}
            </section>
          )}
        </div>
      )}

      {/* Pagination for filtered views */}
      {type !== 'all' && (
        <div className="flex justify-center gap-2 mt-8">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
            이전
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            {page} 페이지
          </span>
          <Button
            variant="outline"
            disabled={
              (type === 'lounge' && lounges.items.length < 20) ||
              (type === 'post' && posts.items.length < 20)
            }
            onClick={() => setPage(page + 1)}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
