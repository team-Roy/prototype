'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loungeApi } from '@/lib/lounge';
import { useRequireAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { slugify } from '@fandom/shared';
import { AxiosError } from 'axios';

const createLoungeSchema = z.object({
  name: z
    .string()
    .min(2, '라운지 이름은 최소 2자 이상이어야 합니다')
    .max(50, '라운지 이름은 최대 50자까지 가능합니다'),
  slug: z
    .string()
    .min(2, 'slug는 최소 2자 이상이어야 합니다')
    .max(50, 'slug는 최대 50자까지 가능합니다')
    .regex(/^[a-z0-9-]+$/, 'slug는 영문 소문자, 숫자, 하이픈만 사용 가능합니다')
    .optional()
    .or(z.literal('')),
  description: z.string().max(500, '설명은 최대 500자까지 가능합니다').optional(),
});

type CreateLoungeForm = z.infer<typeof createLoungeSchema>;

export default function CreateLoungePage() {
  const router = useRouter();
  const { isLoading: isCheckingAuth } = useRequireAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateLoungeForm>({
    resolver: zodResolver(createLoungeSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
    },
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue('name', value);
    // Auto-generate slug from name
    if (value) {
      setValue('slug', slugify(value));
    }
  };

  const onSubmit = async (data: CreateLoungeForm) => {
    try {
      setError(null);
      setIsLoading(true);
      const lounge = await loungeApi.create({
        name: data.name,
        slug: data.slug || undefined,
        description: data.description || undefined,
      });
      router.push(`/lounge/${lounge.slug}`);
    } catch (err) {
      const axiosError = err as AxiosError<{ error: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || '라운지 생성에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>라운지 만들기</CardTitle>
          <CardDescription>좋아하는 크리에이터를 위한 커뮤니티를 만들어보세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">라운지 이름 *</Label>
              <Input
                id="name"
                placeholder="예: 이세돌 팬덤"
                {...register('name')}
                onChange={handleNameChange}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL 슬러그</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/lounge/</span>
                <Input
                  id="slug"
                  placeholder="isedol-fandom"
                  {...register('slug')}
                  className="flex-1"
                />
              </div>
              {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
              <p className="text-xs text-muted-foreground">
                비워두면 이름을 기반으로 자동 생성됩니다
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <textarea
                id="description"
                placeholder="이 라운지에 대해 설명해주세요"
                {...register('description')}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '생성 중...' : '라운지 만들기'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
