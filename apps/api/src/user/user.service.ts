import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, AuthProvider } from '@prisma/client';
import { ERROR_CODES } from '@fandom/shared';
import * as bcrypt from 'bcrypt';

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

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException({
        code: ERROR_CODES.USER_NOT_FOUND,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    // 소셜 로그인 사용자는 비밀번호 변경 불가
    if (user.provider !== 'LOCAL' || !user.password) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: '소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.',
      });
    }

    // 현재 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException({
        code: ERROR_CODES.INVALID_PASSWORD,
        message: '현재 비밀번호가 일치하지 않습니다.',
      });
    }

    // 새 비밀번호 해싱 및 저장
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async deleteAccount(userId: string, password?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException({
        code: ERROR_CODES.USER_NOT_FOUND,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    // 로컬 계정인 경우 비밀번호 확인
    if (user.provider === 'LOCAL' && user.password) {
      if (!password) {
        throw new BadRequestException({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '비밀번호를 입력해주세요.',
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new BadRequestException({
          code: ERROR_CODES.INVALID_PASSWORD,
          message: '비밀번호가 일치하지 않습니다.',
        });
      }
    }

    // 소프트 삭제 + 개인정보 익명화
    const anonymizedEmail = `deleted_${userId}@deleted.com`;
    const anonymizedNickname = `탈퇴한사용자_${userId.slice(-6)}`;

    await this.prisma.$transaction([
      // 관련 토큰 삭제
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId } }),
      this.prisma.emailVerificationToken.deleteMany({ where: { userId } }),

      // 사용자 소프트 삭제 + 익명화
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          nickname: anonymizedNickname,
          password: null,
          profileImage: null,
          bio: null,
          providerId: null,
          isActive: false,
          deletedAt: new Date(),
        },
      }),
    ]);
  }
}
