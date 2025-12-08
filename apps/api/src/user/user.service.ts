import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, AuthProvider } from '@prisma/client';
import { ERROR_CODES } from '@fandom/shared';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email, deletedAt: null },
    });
  }

  async findByNickname(nickname: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { nickname, deletedAt: null },
    });
  }

  async findByProvider(provider: AuthProvider, providerId: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        provider,
        providerId,
        deletedAt: null,
      },
    });
  }

  async updateProfile(
    userId: string,
    data: { nickname?: string; bio?: string; profileImage?: string }
  ): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException({
        code: ERROR_CODES.USER_NOT_FOUND,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async checkNicknameAvailable(nickname: string, excludeUserId?: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: {
        nickname,
        deletedAt: null,
        ...(excludeUserId && { NOT: { id: excludeUserId } }),
      },
    });
    return !user;
  }

  async checkEmailAvailable(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return !user;
  }
}
