'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { useRedirectIfAuthenticated } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AxiosError } from 'axios';

const registerSchema = z
  .object({
    email: z.string().email('올바른 이메일 형식이 아닙니다'),
    nickname: z
      .string()
      .min(2, '닉네임은 최소 2자 이상이어야 합니다')
      .max(20, '닉네임은 최대 20자까지 가능합니다')
      .regex(/^[가-힣a-zA-Z0-9_]+$/, '닉네임은 한글, 영문, 숫자, 밑줄만 사용 가능합니다'),
    password: z
      .string()
      .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
      .regex(/[A-Za-z]/, '비밀번호에 영문자가 포함되어야 합니다')
      .regex(/[0-9]/, '비밀번호에 숫자가 포함되어야 합니다'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { isLoading: isCheckingAuth } = useRedirectIfAuthenticated('/');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError(null);
      await registerUser(data.email, data.password, data.nickname);
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      const axiosError = err as AxiosError<{ error: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || '회원가입에 실패했습니다.');
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (success) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-green-600">
            회원가입 완료!
          </CardTitle>
          <CardDescription className="text-center">로그인 페이지로 이동합니다...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">팬덤 라운지</CardTitle>
        <CardDescription className="text-center">새 계정을 만드세요</CardDescription>
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

          <div className="space-y-2">
            <Label htmlFor="nickname">닉네임</Label>
            <Input id="nickname" type="text" placeholder="닉네임" {...register('nickname')} />
            {errors.nickname && (
              <p className="text-sm text-destructive">{errors.nickname.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="8자 이상, 영문+숫자"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
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
            {isLoading ? '가입 중...' : '회원가입'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-primary hover:underline">
            로그인
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
