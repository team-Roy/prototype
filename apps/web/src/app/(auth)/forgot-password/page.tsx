'use client';

import { useState } from 'react';
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

const forgotPasswordSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setIsLoading(true);
      setError(null);
      await api.post('/auth/forgot-password', { email: data.email });
      setSuccess(true);
    } catch (err) {
      const axiosError = err as AxiosError<{ error: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || '요청 처리에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-green-600">
            이메일 발송 완료
          </CardTitle>
          <CardDescription className="text-center">
            이메일이 등록되어 있다면 비밀번호 재설정 링크가 발송됩니다.
            <br />
            이메일을 확인해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login">
            <Button variant="outline" className="w-full">
              로그인으로 돌아가기
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <Link href="/" className="block text-center hover:opacity-80 transition-opacity">
          <CardTitle className="text-2xl font-bold">팬덤 라운지</CardTitle>
        </Link>
        <CardDescription className="text-center">
          비밀번호를 잊으셨나요? 이메일을 입력하세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" placeholder="name@example.com" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? '발송 중...' : '비밀번호 재설정 링크 받기'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            로그인으로 돌아가기
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
