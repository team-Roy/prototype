'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { loungeApi, LoungeDetailResponse } from '@/lib/lounge';
import { LoungeHeader } from '@/components/lounge';
import { Button } from '@/components/ui/button';
export default function LoungePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [lounge, setLounge] = useState<LoungeDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLounge = useCallback(async () => {
    try {
      const data = await loungeApi.getBySlug(slug);
      setLounge(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch lounge:', err);
      setError('라운지를 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchLounge();
  }, [fetchLounge]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !lounge) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{error || '라운지를 찾을 수 없습니다'}</p>
        <Button asChild className="mt-4">
          <Link href="/">홈으로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <LoungeHeader lounge={lounge} onUpdate={fetchLounge} />

      {/* Rules */}
      {lounge.rules && (
        <div className="bg-card rounded-lg p-4 mb-6">
          <h2 className="font-semibold mb-2">라운지 규칙</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lounge.rules}</p>
        </div>
      )}

      {/* Write Post Button */}
      {lounge.isMember && (
        <div className="mb-6">
          <Button asChild>
            <Link href={`/lounge/${lounge.slug}/write`}>게시물 작성</Link>
          </Button>
        </div>
      )}

      {/* Posts Section (placeholder for TASK 8) */}
      <div className="bg-card rounded-lg p-6 text-center text-muted-foreground">
        <p>게시물이 여기에 표시됩니다</p>
        <p className="text-sm mt-1">(게시물 시스템은 다음 태스크에서 구현됩니다)</p>
      </div>
    </div>
  );
}
