'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { postApi, PostDetailResponse } from '@/lib/post';
import { useRequireAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AxiosError } from 'axios';

const updatePostSchema = z.object({
  title: z.string().max(100, '제목은 최대 100자까지 가능합니다').optional(),
  content: z
    .string()
    .min(1, '내용을 입력해주세요')
    .max(10000, '내용은 최대 10000자까지 가능합니다'),
  tags: z.string().optional(),
});

type UpdatePostForm = z.infer<typeof updatePostSchema>;

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { isLoading: isCheckingAuth } = useRequireAuth();
  const { user } = useAuthStore();

  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdatePostForm>({
    resolver: zodResolver(updatePostSchema),
  });

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await postApi.getById(id);

        // Check if user is the author
        if (data.isAnonymous || data.author.id !== user?.id) {
          router.push(`/post/${id}`);
          return;
        }

        setPost(data);
        reset({
          title: data.title || '',
          content: data.content,
          tags: data.tags.join(', '),
        });
      } catch (err) {
        console.error('Failed to fetch post:', err);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    if (!isCheckingAuth && user) {
      fetchPost();
    }
  }, [id, router, isCheckingAuth, user, reset]);

  const onSubmit = async (data: UpdatePostForm) => {
    if (!post) return;

    try {
      setError(null);
      setIsSubmitting(true);

      const tags = data.tags
        ? data.tags
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter((t) => t.length > 0)
        : [];

      await postApi.update(post.id, {
        title: data.title || undefined,
        content: data.content,
        tags,
      });

      router.push(`/post/${post.id}`);
    } catch (err) {
      const axiosError = err as AxiosError<{ error: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || '게시물 수정에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingAuth || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>게시물 수정</CardTitle>
          <p className="text-sm text-muted-foreground">{post.lounge.name}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">제목 (선택)</Label>
              <Input id="title" placeholder="제목을 입력하세요" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">내용 *</Label>
              <textarea
                id="content"
                placeholder="내용을 입력하세요"
                {...register('content')}
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {errors.content && (
                <p className="text-sm text-destructive">{errors.content.message}</p>
              )}
            </div>

            {/* Existing Media */}
            {post.media.length > 0 && (
              <div className="space-y-2">
                <Label>첨부된 이미지</Label>
                <div className="grid grid-cols-4 gap-2">
                  {post.media.map((media) => (
                    <div key={media.id} className="relative aspect-square rounded overflow-hidden">
                      {media.type === 'IMAGE' ? (
                        <img src={media.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <video src={media.url} className="w-full h-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  기존 이미지는 수정할 수 없습니다. 이미지를 변경하려면 게시물을 새로 작성해주세요.
                </p>
              </div>
            )}

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">태그</Label>
              <Input
                id="tags"
                placeholder="태그1, 태그2, 태그3 (쉼표로 구분)"
                {...register('tags')}
              />
              <p className="text-xs text-muted-foreground">
                쉼표로 구분하여 입력하세요 (최대 10개)
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? '수정 중...' : '수정하기'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
