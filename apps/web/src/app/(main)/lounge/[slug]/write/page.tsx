'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loungeApi, LoungeDetailResponse } from '@/lib/lounge';
import { postApi, PostType } from '@/lib/post';
import { MediaInfo } from '@/lib/media';
import { useRequireAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { MediaUploader } from '@/components/media';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AxiosError } from 'axios';

const createPostSchema = z.object({
  type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'CLIP', 'FANART']),
  title: z.string().max(100, '제목은 최대 100자까지 가능합니다').optional(),
  content: z
    .string()
    .min(1, '내용을 입력해주세요')
    .max(10000, '내용은 최대 10000자까지 가능합니다'),
  isAnonymous: z.boolean().optional(),
  tags: z.string().optional(),
});

type CreatePostForm = z.infer<typeof createPostSchema>;

const POST_TYPES: { value: PostType; label: string; description: string }[] = [
  { value: 'TEXT', label: '일반글', description: '텍스트 위주의 게시물' },
  { value: 'IMAGE', label: '이미지', description: '이미지가 포함된 게시물' },
  { value: 'CLIP', label: '클립', description: 'YouTube 등 영상 클립 공유' },
  { value: 'FANART', label: '팬아트', description: '팬아트 작품 공유' },
];

export default function WritePostPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { isLoading: isCheckingAuth } = useRequireAuth();

  const [lounge, setLounge] = useState<LoungeDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<MediaInfo[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreatePostForm>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      type: 'TEXT',
      isAnonymous: false,
    },
  });

  const selectedType = watch('type');

  useEffect(() => {
    const fetchLounge = async () => {
      try {
        const data = await loungeApi.getBySlug(slug);
        if (!data.isMember) {
          router.push(`/lounge/${slug}`);
          return;
        }
        setLounge(data);
      } catch (err) {
        console.error('Failed to fetch lounge:', err);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    if (!isCheckingAuth) {
      fetchLounge();
    }
  }, [slug, router, isCheckingAuth]);

  const onSubmit = async (data: CreatePostForm) => {
    if (!lounge) return;

    try {
      setError(null);
      setIsSubmitting(true);

      const tags = data.tags
        ? data.tags
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter((t) => t.length > 0)
        : undefined;

      // Format media data for backend (url|type|width|height)
      const mediaIds =
        uploadedMedia.length > 0
          ? uploadedMedia.map((m) => `${m.url}|${m.type}|${m.width || ''}|${m.height || ''}`)
          : undefined;

      const post = await postApi.create(lounge.id, {
        type: data.type,
        title: data.title || undefined,
        content: data.content,
        isAnonymous: data.isAnonymous || false,
        tags,
        mediaIds,
      });

      router.push(`/post/${post.id}`);
    } catch (err) {
      const axiosError = err as AxiosError<{ error: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || '게시물 작성에 실패했습니다');
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

  if (!lounge) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>게시물 작성</CardTitle>
          <p className="text-sm text-muted-foreground">{lounge.name}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Post Type */}
            <div className="space-y-2">
              <Label>게시물 유형</Label>
              <div className="grid grid-cols-2 gap-2">
                {POST_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedType === type.value
                        ? 'border-primary bg-primary/5'
                        : 'border-input hover:bg-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      value={type.value}
                      {...register('type')}
                      className="sr-only"
                    />
                    <span className="font-medium">{type.label}</span>
                    <span className="text-xs text-muted-foreground">{type.description}</span>
                  </label>
                ))}
              </div>
            </div>

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

            {/* Media Upload */}
            {(selectedType === 'IMAGE' || selectedType === 'FANART') && (
              <div className="space-y-2">
                <Label>이미지 업로드</Label>
                <MediaUploader
                  maxFiles={10}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onUploadComplete={(media) => setUploadedMedia((prev) => [...prev, ...media])}
                />
                {uploadedMedia.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {uploadedMedia.map((media, index) => (
                      <div key={index} className="relative aspect-square rounded overflow-hidden">
                        <img src={media.url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() =>
                            setUploadedMedia((prev) => prev.filter((_, i) => i !== index))
                          }
                          className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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

            {/* Anonymous */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAnonymous"
                {...register('isAnonymous')}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="isAnonymous" className="font-normal">
                익명으로 작성
              </Label>
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
                {isSubmitting ? '작성 중...' : '작성하기'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
