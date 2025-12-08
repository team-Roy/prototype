'use client';

import { useEffect, useState } from 'react';
import { postApi, PostResponse, PostType, PostSortBy } from '@/lib/post';
import { PostCard } from './PostCard';
import { Button } from '@/components/ui/button';

interface PostListProps {
  loungeId: string;
  loungeSlug: string;
}

const POST_TYPES: { value: PostType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'TEXT', label: '일반' },
  { value: 'IMAGE', label: '이미지' },
  { value: 'CLIP', label: '클립' },
  { value: 'FANART', label: '팬아트' },
];

const SORT_OPTIONS: { value: PostSortBy; label: string }[] = [
  { value: 'recent', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'comments', label: '댓글순' },
];

export function PostList({ loungeId, loungeSlug }: PostListProps) {
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<PostType | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<PostSortBy>('recent');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const data = await postApi.getList(loungeId, {
          type: selectedType === 'ALL' ? undefined : selectedType,
          sortBy,
          page: 1,
          limit: 20,
        });
        setPosts(data.items);
        setHasMore(data.meta.page < data.meta.totalPages);
        setPage(1);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [loungeId, selectedType, sortBy]);

  const loadMore = async () => {
    try {
      const nextPage = page + 1;
      const data = await postApi.getList(loungeId, {
        type: selectedType === 'ALL' ? undefined : selectedType,
        sortBy,
        page: nextPage,
        limit: 20,
      });
      setPosts((prev) => [...prev, ...data.items]);
      setHasMore(data.meta.page < data.meta.totalPages);
      setPage(nextPage);
    } catch (error) {
      console.error('Failed to load more posts:', error);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Type Tabs */}
        <div className="flex gap-1 flex-wrap">
          {POST_TYPES.map((type) => (
            <Button
              key={type.value}
              variant={selectedType === type.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedType(type.value)}
            >
              {type.label}
            </Button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as PostSortBy)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Posts */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">게시물이 없습니다</div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} loungeSlug={loungeSlug} />
          ))}

          {hasMore && (
            <div className="text-center pt-4">
              <Button variant="outline" onClick={loadMore}>
                더 보기
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
