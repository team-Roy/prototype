'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { SearchBar, SearchResults } from '@/components/search';
import { SearchType, addRecentSearch } from '@/lib/search';
import { useEffect } from 'react';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const type = (searchParams.get('type') as SearchType) || 'all';

  useEffect(() => {
    if (query.trim()) {
      addRecentSearch(query.trim());
    }
  }, [query]);

  const handleTypeChange = (newType: SearchType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', newType);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="container max-w-4xl py-6">
      <h1 className="text-2xl font-bold mb-6">검색</h1>

      <div className="mb-8">
        <SearchBar
          initialQuery={query}
          showSuggestions={false}
          showButton={true}
          className="max-w-xl"
        />
      </div>

      {query && <SearchResults query={query} type={type} onTypeChange={handleTypeChange} />}

      {!query && (
        <div className="text-center py-12 text-muted-foreground">
          라운지, 게시물, 태그를 검색해보세요.
          <br />
          <span className="text-sm">#태그로 시작하면 태그 검색이 됩니다.</span>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container max-w-4xl py-6">로딩 중...</div>}>
      <SearchContent />
    </Suspense>
  );
}
