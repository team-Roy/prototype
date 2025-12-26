'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AxiosError } from 'axios';
import { LoungeDetailResponse, loungeApi } from '@/lib/lounge';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@fandom/shared';
import { BadgeCheck, Star } from 'lucide-react';

interface LoungeHeaderProps {
  lounge: LoungeDetailResponse;
  onUpdate: () => void;
}

export function LoungeHeader({ lounge, onUpdate }: LoungeHeaderProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinLeave = async () => {
    if (!isAuthenticated) {
      router.push(`/login?returnUrl=/lounge/${lounge.slug}`);
      return;
    }

    setIsLoading(true);
    try {
      if (lounge.isMember) {
        await loungeApi.leave(lounge.id);
      } else {
        await loungeApi.join(lounge.id);
      }
      onUpdate();
    } catch (error: unknown) {
      console.error('Failed to join/leave lounge:', error);
      let errorMessage = '라운지 처리 중 오류가 발생했습니다.';
      if (error instanceof AxiosError && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-lg p-6 mb-6">
      {/* Cover Image */}
      {lounge.coverImage && (
        <div className="h-32 -mx-6 -mt-6 mb-4 rounded-t-lg overflow-hidden">
          <img
            src={lounge.coverImage}
            alt={`${lounge.name} 커버`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          {lounge.icon ? (
            <img
              src={lounge.icon}
              alt={lounge.name}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <span className="text-2xl font-bold text-primary">
              {lounge.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{lounge.name}</h1>
            {lounge.isOfficial && (
              <span className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full border border-blue-500/30">
                <BadgeCheck className="w-3 h-3" />
                공식
              </span>
            )}
          </div>
          {lounge.description && <p className="text-muted-foreground mt-1">{lounge.description}</p>}

          {/* 공식 크리에이터 정보 */}
          {lounge.isOfficial && lounge.officialCreator && (
            <div className="flex items-center gap-2 mt-2 text-sm">
              <Star className="w-4 h-4 text-purple-500" />
              <span className="text-purple-500 font-medium">
                {lounge.officialCreator.creatorName || lounge.officialCreator.nickname}
              </span>
              <span className="text-muted-foreground">의 공식 라운지</span>
            </div>
          )}

          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span>멤버 {formatNumber(lounge.memberCount)}</span>
            <span>게시물 {formatNumber(lounge.postCount)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {lounge.isManager && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/lounge/${lounge.slug}/manage`}>관리</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/lounge/${lounge.slug}/settings`}>설정</Link>
              </Button>
            </>
          )}
          <Button
            onClick={handleJoinLeave}
            disabled={isLoading}
            variant={lounge.isMember ? 'outline' : 'default'}
          >
            {isLoading ? '처리 중...' : lounge.isMember ? '탈퇴' : '가입'}
          </Button>
        </div>
      </div>
    </div>
  );
}
