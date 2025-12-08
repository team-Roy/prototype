import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  password: z
    .string()
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
    .regex(/[A-Za-z]/, '비밀번호에 영문자가 포함되어야 합니다')
    .regex(/[0-9]/, '비밀번호에 숫자가 포함되어야 합니다'),
  nickname: z
    .string()
    .min(2, '닉네임은 최소 2자 이상이어야 합니다')
    .max(20, '닉네임은 최대 20자까지 가능합니다')
    .regex(/^[가-힣a-zA-Z0-9_]+$/, '닉네임은 한글, 영문, 숫자, 밑줄만 사용 가능합니다'),
});

export const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh Token이 필요합니다'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  nickname: string;
  profileImage: string | null;
  role: string;
}
