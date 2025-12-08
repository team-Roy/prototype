'use client';

import Link from 'next/link';
import { PostResponse } from '@/lib/post';
import { Card, CardContent } from '@/components/ui/card';
import { formatRelativeTime, formatNumber } from '@fandom/shared';

interface PostCardProps {
  post: PostResponse;
  loungeSlug: string;
}

export function PostCard({ post, loungeSlug: _loungeSlug }: PostCardProps) {
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'IMAGE':
        return '이미지';
      case 'VIDEO':
        return '영상';
      case 'CLIP':
        return '클립';
      case 'FANART':
        return '팬아트';
      default:
        return null;
    }
  };

  const typeLabel = getTypeLabel(post.type);

  return (
    <Link href={`/post/${post.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* Thumbnail */}
            {post.thumbnail && (
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                <img src={post.thumbnail} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Badges */}
              <div className="flex items-center gap-1 mb-1">
                {post.isNotice && (
                  <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                    공지
                  </span>
                )}
                {post.isPinned && !post.isNotice && (
                  <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                    고정
                  </span>
                )}
                {typeLabel && (
                  <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                    {typeLabel}
                  </span>
                )}
              </div>

              {/* Title or Content Preview */}
              <h3 className="font-medium line-clamp-1">
                {post.title || post.content.slice(0, 50)}
              </h3>

              {/* Meta Info */}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>{post.author.nickname}</span>
                <span>·</span>
                <span>{formatRelativeTime(new Date(post.createdAt))}</span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>조회 {formatNumber(post.viewCount)}</span>
                <span>추천 {formatNumber(post.upvoteCount)}</span>
                <span>댓글 {formatNumber(post.commentCount)}</span>
              </div>

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs text-primary hover:underline">
                      #{tag}
                    </span>
                  ))}
                  {post.tags.length > 3 && (
                    <span className="text-xs text-muted-foreground">+{post.tags.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
