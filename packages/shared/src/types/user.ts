export enum AuthProvider {
  LOCAL = 'LOCAL',
  KAKAO = 'KAKAO',
  GOOGLE = 'GOOGLE',
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  email: string;
  nickname: string;
  profileImage: string | null;
  bio: string | null;
  provider: AuthProvider;
  providerId: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PublicUser {
  id: string;
  nickname: string;
  profileImage: string | null;
  bio: string | null;
}
