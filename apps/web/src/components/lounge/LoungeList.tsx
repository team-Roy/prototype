'use client';

import { LoungeResponse } from '@/lib/lounge';
import { LoungeCard } from './LoungeCard';

interface LoungeListProps {
  lounges: LoungeResponse[];
  emptyMessage?: string;
}

export function LoungeList({ lounges, emptyMessage = '라운지가 없습니다' }: LoungeListProps) {
  if (lounges.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {lounges.map((lounge) => (
        <LoungeCard key={lounge.id} lounge={lounge} />
      ))}
    </div>
  );
}
