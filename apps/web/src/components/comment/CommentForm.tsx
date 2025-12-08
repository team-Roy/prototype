'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/stores/authStore';

interface CommentFormProps {
  onSubmit: (content: string, isAnonymous: boolean) => Promise<void>;
  placeholder?: string;
  buttonText?: string;
  onCancel?: () => void;
  showAnonymous?: boolean;
}

export function CommentForm({
  onSubmit,
  placeholder = '댓글을 입력하세요',
  buttonText = '등록',
  onCancel,
  showAnonymous = true,
}: CommentFormProps) {
  const { isAuthenticated } = useAuthStore();
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSubmit(content.trim(), isAnonymous);
      setContent('');
      setIsAnonymous(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg">
        댓글을 작성하려면 로그인이 필요합니다
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={2000}
        className="resize-none"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showAnonymous && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={isAnonymous}
                onCheckedChange={(checked) => setIsAnonymous(checked === true)}
              />
              익명
            </label>
          )}
          <span className="text-xs text-muted-foreground">{content.length}/2000</span>
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
              취소
            </Button>
          )}
          <Button size="sm" onClick={handleSubmit} disabled={!content.trim() || isSubmitting}>
            {isSubmitting ? '등록 중...' : buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
}
