'use client';

import Link from 'next/link';
import { LoungeResponse } from '@/lib/lounge';
import { Card, CardContent } from '@/components/ui/card';
import { formatNumber } from '@fandom/shared';
import { BadgeCheck } from 'lucide-react';

interface LoungeCardProps {
  lounge: LoungeResponse;
}

export function LoungeCard({ lounge }: LoungeCardProps) {
  return (
    <Link href={`/lounge/${lounge.slug}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              {lounge.icon ? (
                <img
                  src={lounge.icon}
                  alt={lounge.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <span className="text-xl font-bold text-primary">
                  {lounge.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold truncate">{lounge.name}</h3>
                {lounge.isOfficial && (
                  <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                )}
              </div>
              {lounge.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {lounge.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>멤버 {formatNumber(lounge.memberCount)}</span>
                <span>게시물 {formatNumber(lounge.postCount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
