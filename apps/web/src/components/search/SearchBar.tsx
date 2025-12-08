'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchApi, getRecentSearches, addRecentSearch, clearRecentSearches } from '@/lib/search';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchBarProps {
  initialQuery?: string;
  showSuggestions?: boolean;
  showButton?: boolean;
  className?: string;
}

export function SearchBar({
  initialQuery = '',
  showSuggestions = true,
  showButton = false,
  className = '',
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    const fetchTags = async () => {
      if (!debouncedQuery.startsWith('#') || debouncedQuery.length < 2) {
        setTagSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const tagQuery = debouncedQuery.slice(1);
        const tags = await searchApi.getTags(tagQuery);
        setTagSuggestions(tags);
      } catch (error) {
        console.error('Failed to fetch tags:', error);
        setTagSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback(
    (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) return;

      addRecentSearch(trimmed);
      setRecentSearches(getRecentSearches());
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [router]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const handleFocus = () => {
    if (showSuggestions) {
      setIsOpen(true);
    }
  };

  const showDropdown =
    isOpen && showSuggestions && (recentSearches.length > 0 || tagSuggestions.length > 0);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className={showButton ? 'flex gap-2' : ''}>
        <Input
          ref={inputRef}
          type="search"
          placeholder="라운지, 게시물, #태그 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          className={showButton ? 'flex-1' : 'w-full'}
        />
        {showButton && (
          <Button type="submit" disabled={!query.trim()}>
            검색
          </Button>
        )}
      </form>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Tag suggestions */}
          {tagSuggestions.length > 0 && (
            <div className="p-2 border-b">
              <div className="text-xs text-muted-foreground px-2 py-1">태그</div>
              {tagSuggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="w-full text-left px-2 py-1.5 hover:bg-accent rounded text-sm"
                  onClick={() => handleSearch(`#${tag}`)}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Recent searches */}
          {recentSearches.length > 0 && !query.startsWith('#') && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs text-muted-foreground">최근 검색어</span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleClearRecent}
                >
                  전체 삭제
                </button>
              </div>
              {recentSearches.slice(0, 5).map((search) => (
                <button
                  key={search}
                  type="button"
                  className="w-full text-left px-2 py-1.5 hover:bg-accent rounded text-sm"
                  onClick={() => handleSearch(search)}
                >
                  {search}
                </button>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="p-4 text-center text-sm text-muted-foreground">검색 중...</div>
          )}
        </div>
      )}
    </div>
  );
}
