'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { AxiosError } from 'axios';

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
      .regex(/[A-Za-z]/, '비밀번호에 영문자가 포함되어야 합니다')
      .regex(/[0-9]/, '비밀번호에 숫자가 포함되어야 합니다'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setError('유효하지 않은 링크입니다.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await api.post('/auth/reset-password', {
        token,
        newPassword: data.newPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      const axiosError = err as AxiosError<{ error: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-destructive">
            유효하지 않은 링크
          </CardTitle>
          <CardDescription className="text-center">
            비밀번호 재설정 링크가 유효하지 않습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/forgot-password">
            <Button variant="outline" className="w-full">
              다시 요청하기
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-green-600">
            비밀번호 변경 완료
          </CardTitle>
          <CardDescription className="text-center">
            비밀번호가 성공적으로 변경되었습니다.
            <br />
            잠시 후 로그인 페이지로 이동합니다.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <Link href="/" className="block text-center hover:opacity-80 transition-opacity">
          <CardTitle className="text-2xl font-bold">팬덤 라운지</CardTitle>
        </Link>
        <CardDescription className="text-center">새 비밀번호를 입력하세요</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPassword">새 비밀번호</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="8자 이상, 영문+숫자"
              {...register('newPassword')}
            />
            {errors.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">비밀번호 확인</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="비밀번호 확인"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? '변경 중...' : '비밀번호 변경'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
