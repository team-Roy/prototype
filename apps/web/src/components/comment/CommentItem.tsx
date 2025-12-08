'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { CommentResponse } from '@/lib/comment';
import { CommentForm } from './CommentForm';
import { formatRelativeTime } from '@fandom/shared';

interface CommentItemProps {
  comment: CommentResponse;
  onReply?: (content: string, isAnonymous: boolean, parentId: string) => Promise<void>;
  onEdit?: (commentId: string, content: string) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
  isReply?: boolean;
}

export function CommentItem({
  comment,
  onReply,
  onEdit,
  onDelete,
  isReply = false,
}: CommentItemProps) {
  const { user } = useAuthStore();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isAuthor = user && !comment.isAnonymous && comment.author.id === user.id;

  const handleReply = async (content: string, isAnonymous: boolean) => {
    if (onReply) {
      await onReply(content, isAnonymous, comment.id);
      setShowReplyForm(false);
    }
  };

  const handleEdit = async (content: string) => {
    if (onEdit) {
      await onEdit(comment.id, content);
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말로 이 댓글을 삭제하시겠습니까?')) return;
    if (onDelete) {
      await onDelete(comment.id);
    }
  };

  return (
    <div className={`${isReply ? 'ml-8 pl-4 border-l-2 border-muted' : ''}`}>
      <div className="py-3">
        {/* Author & Meta */}
        <div className="flex items-center gap-2 mb-2">
          {comment.author.profileImage ? (
            <img
              src={comment.author.profileImage}
              alt=""
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
              {comment.author.nickname[0]}
            </div>
          )}
          <span className="text-sm font-medium">{comment.author.nickname}</span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(new Date(comment.createdAt))}
          </span>
          {comment.updatedAt !== comment.createdAt && !comment.isDeleted && (
            <span className="text-xs text-muted-foreground">(수정됨)</span>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="mt-2">
            <CommentForm
              onSubmit={handleEdit}
              placeholder="댓글을 수정하세요"
              buttonText="수정"
              onCancel={() => setIsEditing(false)}
              showAnonymous={false}
            />
          </div>
        ) : (
          <p
            className={`text-sm whitespace-pre-wrap ${comment.isDeleted ? 'text-muted-foreground italic' : ''}`}
          >
            {comment.content}
          </p>
        )}

        {/* Actions */}
        {!comment.isDeleted && !isEditing && (
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Button variant="ghost" size="sm" className="h-6 px-2" disabled>
                👍 {comment.upvoteCount}
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-2" disabled>
                👎 {comment.downvoteCount}
              </Button>
            </div>
            {!isReply && onReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                답글
              </Button>
            )}
            {isAuthor && (
              <>
                {!comment.isAnonymous && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setIsEditing(true)}
                  >
                    수정
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={handleDelete}
                >
                  삭제
                </Button>
              </>
            )}
          </div>
        )}

        {/* Reply Form */}
        {showReplyForm && (
          <div className="mt-3">
            <CommentForm
              onSubmit={(content, isAnonymous) => handleReply(content, isAnonymous)}
              placeholder="답글을 입력하세요"
              buttonText="답글 등록"
              onCancel={() => setShowReplyForm(false)}
            />
          </div>
        )}
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-1">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onEdit={onEdit}
              onDelete={onDelete}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}
