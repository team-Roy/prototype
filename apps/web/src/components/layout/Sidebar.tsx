'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { loungeApi, LoungeResponse } from '@/lib/lounge';

export function Sidebar() {
  const { isAuthenticated } = useAuthStore();
  const [myLounges, setMyLounges] = useState<(LoungeResponse & { joinedAt: string })[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(true);
      loungeApi
        .getMyLounges()
        .then(setMyLounges)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setMyLounges([]);
    }
  }, [isAuthenticated]);

  return (
    <aside className="hidden lg:block w-64 border-r min-h-[calc(100vh-3.5rem)] p-4">
      <div className="sticky top-[4.5rem]">
        <h2 className="font-semibold text-sm text-muted-foreground mb-3">내 라운지</h2>

        {!isAuthenticated ? (
          <p className="text-sm text-muted-foreground">
            로그인하면 가입한 라운지를 볼 수 있습니다.
          </p>
        ) : isLoading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        ) : myLounges.length === 0 ? (
          <p className="text-sm text-muted-foreground">가입한 라운지가 없습니다.</p>
        ) : (
          <ul className="space-y-1">
            {myLounges.map((lounge) => (
              <li key={lounge.id}>
                <Link
                  href={`/lounge/${lounge.slug}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {lounge.icon ? (
                      <img
                        src={lounge.icon}
                        alt={lounge.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <span className="text-sm font-bold text-primary">
                        {lounge.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-sm truncate">{lounge.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
