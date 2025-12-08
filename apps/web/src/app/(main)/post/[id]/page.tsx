'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { postApi, PostDetailResponse } from '@/lib/post';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CommentList } from '@/components/comment';
import { formatRelativeTime, formatNumber } from '@fandom/shared';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuthStore();
  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPost = useCallback(async () => {
    try {
      const data = await postApi.getById(id);
      setPost(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch post:', err);
      setError('게시물을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleDelete = async () => {
    if (!post || !confirm('정말로 이 게시물을 삭제하시겠습니까?')) return;

    try {
      setIsDeleting(true);
      await postApi.delete(post.id);
      router.push(`/lounge/${post.lounge.slug}`);
    } catch (err) {
      console.error('Failed to delete post:', err);
      setIsDeleting(false);
    }
  };

  const isAuthor = user && post && !post.isAnonymous && post.author.id === user.id;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{error || '게시물을 찾을 수 없습니다'}</p>
        <Button asChild className="mt-4">
          <Link href="/">홈으로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Lounge Link */}
      <div className="mb-4">
        <Link
          href={`/lounge/${post.lounge.slug}`}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          ← {post.lounge.name}
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Header */}
          <div className="mb-4">
            {/* Badges */}
            <div className="flex items-center gap-1 mb-2">
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
            </div>

            {/* Title */}
            {post.title && <h1 className="text-2xl font-bold mb-2">{post.title}</h1>}

            {/* Author & Meta */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{post.author.nickname}</span>
                <span>·</span>
                <span>{formatRelativeTime(new Date(post.createdAt))}</span>
              </div>
              <span>조회 {formatNumber(post.viewCount)}</span>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-sm max-w-none mb-6">
            <p className="whitespace-pre-wrap">{post.content}</p>
          </div>

          {/* Media Gallery */}
          {post.media.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-6">
              {post.media.map((media) => (
                <div key={media.id} className="rounded-lg overflow-hidden bg-muted">
                  {media.type === 'IMAGE' ? (
                    <img src={media.url} alt="" className="w-full h-auto" />
                  ) : (
                    <video src={media.url} controls className="w-full" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Clip Embed */}
          {post.clipInfo && post.clipInfo.platform === 'YOUTUBE' && (
            <div className="aspect-video mb-6">
              <iframe
                src={`https://www.youtube.com/embed/${post.clipInfo.videoId}${
                  post.clipInfo.startTime ? `?start=${post.clipInfo.startTime}` : ''
                }`}
                className="w-full h-full rounded-lg"
                allowFullScreen
              />
            </div>
          )}

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-6">
              {post.tags.map((tag) => (
                <span key={tag} className="text-sm text-primary bg-primary/10 px-2 py-0.5 rounded">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats & Actions */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-4">
              {/* Vote Buttons (placeholder - will be implemented in TASK 11) */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                  👍 {formatNumber(post.upvoteCount)}
                </Button>
                <Button variant="outline" size="sm" disabled>
                  👎 {formatNumber(post.downvoteCount)}
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">
                댓글 {formatNumber(post.commentCount)}
              </span>
            </div>

            {/* Author Actions */}
            {isAuthor && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/post/${post.id}/edit`}>수정</Link>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? '삭제 중...' : '삭제'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card className="mt-4">
        <CardContent className="p-6">
          <CommentList postId={post.id} />
        </CardContent>
      </Card>
    </div>
  );
}
