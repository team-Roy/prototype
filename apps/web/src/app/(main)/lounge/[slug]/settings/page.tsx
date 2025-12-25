'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loungeApi, LoungeDetailResponse } from '@/lib/lounge';
import { useRequireAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AxiosError } from 'axios';

interface MemberItem {
  user: {
    id: string;
    nickname: string;
    profileImage: string | null;
  };
  role: 'OWNER' | 'MANAGER' | null;
  joinedAt: string;
}

const updateLoungeSchema = z.object({
  name: z
    .string()
    .min(2, '라운지 이름은 최소 2자 이상이어야 합니다')
    .max(50, '라운지 이름은 최대 50자까지 가능합니다')
    .optional(),
  description: z.string().max(500, '설명은 최대 500자까지 가능합니다').optional(),
  rules: z.string().max(5000, '규칙은 최대 5000자까지 가능합니다').optional(),
});

type UpdateLoungeForm = z.infer<typeof updateLoungeSchema>;

export default function LoungeSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { isLoading: isCheckingAuth } = useRequireAuth();

  const [lounge, setLounge] = useState<LoungeDetailResponse | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isManagingManagers, setIsManagingManagers] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateLoungeForm>({
    resolver: zodResolver(updateLoungeSchema),
  });

  const fetchLounge = useCallback(async () => {
    try {
      const data = await loungeApi.getBySlug(slug);

      if (!data.isManager) {
        router.push(`/lounge/${slug}`);
        return;
      }

      setLounge(data);
      reset({
        name: data.name,
        description: data.description || '',
        rules: data.rules || '',
      });

      // Fetch members for manager management
      const membersData = await loungeApi.getMembers(data.id, 1, 100);
      setMembers(membersData.items);
    } catch (err) {
      console.error('Failed to fetch lounge:', err);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  }, [slug, router, reset]);

  const handleAddManager = async (userId: string) => {
    if (!lounge) return;
    try {
      setIsManagingManagers(true);
      await loungeApi.addManager(lounge.id, userId);
      await fetchLounge();
      setSuccess('매니저가 추가되었습니다');
    } catch (err) {
      const axiosError = err as AxiosError<{ error: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || '매니저 추가에 실패했습니다');
    } finally {
      setIsManagingManagers(false);
    }
  };

  const handleRemoveManager = async (userId: string) => {
    if (!lounge) return;
    if (!confirm('정말로 이 매니저를 해제하시겠습니까?')) return;
    try {
      setIsManagingManagers(true);
      await loungeApi.removeManager(lounge.id, userId);
      await fetchLounge();
      setSuccess('매니저가 해제되었습니다');
    } catch (err) {
      const axiosError = err as AxiosError<{ error: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || '매니저 해제에 실패했습니다');
    } finally {
      setIsManagingManagers(false);
    }
  };

  useEffect(() => {
    if (!isCheckingAuth) {
      fetchLounge();
    }
  }, [fetchLounge, isCheckingAuth]);

  const onSubmit = async (data: UpdateLoungeForm) => {
    if (!lounge) return;

    try {
      setError(null);
      setSuccess(null);
      setIsSaving(true);
      await loungeApi.update(lounge.id, data);
      setSuccess('설정이 저장되었습니다');
      fetchLounge();
    } catch (err) {
      const axiosError = err as AxiosError<{ error: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || '설정 저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!lounge) return;
    if (!confirm('정말로 이 라운지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    try {
      setIsDeleting(true);
      await loungeApi.delete(lounge.id);
      router.push('/');
    } catch (err) {
      const axiosError = err as AxiosError<{ error: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || '라운지 삭제에 실패했습니다');
      setIsDeleting(false);
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">라운지 설정</h1>
        <p className="text-muted-foreground">{lounge.name}</p>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
          <CardDescription>라운지의 기본 정보를 수정합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-md bg-green-500/10 text-green-600 text-sm">{success}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">라운지 이름</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <textarea
                id="description"
                {...register('description')}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rules">라운지 규칙</Label>
              <textarea
                id="rules"
                {...register('rules')}
                placeholder="라운지 규칙을 입력하세요 (마크다운 지원)"
                className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {errors.rules && <p className="text-sm text-destructive">{errors.rules.message}</p>}
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Managers */}
      <Card>
        <CardHeader>
          <CardTitle>매니저 관리</CardTitle>
          <CardDescription>라운지 매니저를 관리합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Managers */}
          <div>
            <h4 className="text-sm font-medium mb-2">현재 매니저</h4>
            <ul className="space-y-2">
              {lounge.managers.map((manager) => (
                <li
                  key={manager.user.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{manager.user.nickname}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {manager.role === 'OWNER' ? '소유자' : '매니저'}
                    </span>
                  </div>
                  {lounge.managerRole === 'OWNER' && manager.role !== 'OWNER' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveManager(manager.user.id)}
                      disabled={isManagingManagers}
                      className="text-destructive hover:text-destructive"
                    >
                      해제
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Add Manager from Members */}
          {lounge.managerRole === 'OWNER' && (
            <div>
              <h4 className="text-sm font-medium mb-2">멤버를 매니저로 임명</h4>
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {members
                  .filter((m) => !m.role)
                  .map((member) => (
                    <li
                      key={member.user.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <span>{member.user.nickname}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddManager(member.user.id)}
                        disabled={isManagingManagers}
                      >
                        매니저 임명
                      </Button>
                    </li>
                  ))}
                {members.filter((m) => !m.role).length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">
                    매니저로 임명할 수 있는 멤버가 없습니다.
                  </p>
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {lounge.managerRole === 'OWNER' && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">위험 구역</CardTitle>
            <CardDescription>이 작업은 되돌릴 수 없습니다. 신중하게 진행해주세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? '삭제 중...' : '라운지 삭제'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
