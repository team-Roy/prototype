'use client';

import { useEffect, useState, useCallback } from 'react';
import { commentApi, CommentResponse, CommentSortBy } from '@/lib/comment';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';
import { Button } from '@/components/ui/button';

interface CommentListProps {
  postId: string;
}

const SORT_OPTIONS: { value: CommentSortBy; label: string }[] = [
  { value: 'recent', label: '최신순' },
  { value: 'popular', label: '인기순' },
];

export function CommentList({ postId }: CommentListProps) {
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<CommentSortBy>('recent');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await commentApi.getList(postId, { sortBy, page: 1, limit: 50 });
      setComments(data.items);
      setHasMore(data.meta.page < data.meta.totalPages);
      setTotal(data.meta.total);
      setPage(1);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [postId, sortBy]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const loadMore = async () => {
    try {
      const nextPage = page + 1;
      const data = await commentApi.getList(postId, { sortBy, page: nextPage, limit: 50 });
      setComments((prev) => [...prev, ...data.items]);
      setHasMore(data.meta.page < data.meta.totalPages);
      setPage(nextPage);
    } catch (error) {
      console.error('Failed to load more comments:', error);
    }
  };

  const handleCreate = async (content: string, isAnonymous: boolean) => {
    try {
      const newComment = await commentApi.create(postId, { content, isAnonymous });
      setComments((prev) => [newComment, ...prev]);
      setTotal((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to create comment:', error);
      throw error;
    }
  };

  const handleReply = async (content: string, isAnonymous: boolean, parentId: string) => {
    try {
      const newReply = await commentApi.create(postId, { content, isAnonymous, parentId });
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === parentId
            ? { ...comment, replies: [...(comment.replies || []), newReply] }
            : comment
        )
      );
      setTotal((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to create reply:', error);
      throw error;
    }
  };

  const handleEdit = async (commentId: string, content: string) => {
    try {
      const updated = await commentApi.update(commentId, { content });
      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id === commentId) {
            return updated;
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map((reply) => (reply.id === commentId ? updated : reply)),
            };
          }
          return comment;
        })
      );
    } catch (error) {
      console.error('Failed to update comment:', error);
      throw error;
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await commentApi.delete(commentId);
      // Refetch to get updated state with "삭제된 댓글입니다" message
      fetchComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">댓글 {total}개</h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as CommentSortBy)}
          className="h-8 px-2 text-sm rounded-md border border-input bg-background"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Comment Form */}
      <div className="mb-6">
        <CommentForm onSubmit={handleCreate} />
      </div>

      {/* Comments */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          아직 댓글이 없습니다. 첫 댓글을 작성해보세요!
        </div>
      ) : (
        <div className="divide-y">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
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
