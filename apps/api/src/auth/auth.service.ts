import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ERROR_CODES, TOKEN_EXPIRY } from '@fandom/shared';
import { AuthProvider, User } from '@prisma/client';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

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
  isEmailVerified: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService
  ) {}

  async register(dto: RegisterDto): Promise<AuthUser> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException({
        code: ERROR_CODES.AUTH_EMAIL_EXISTS,
        message: '이미 사용 중인 이메일입니다.',
      });
    }

    const existingNickname = await this.prisma.user.findUnique({
      where: { nickname: dto.nickname },
    });

    if (existingNickname) {
      throw new ConflictException({
        code: ERROR_CODES.AUTH_EMAIL_EXISTS,
        message: '이미 사용 중인 닉네임입니다.',
      });
    }

    const roundsStr = this.configService.get<string>('BCRYPT_ROUNDS');
    const rounds = roundsStr ? parseInt(roundsStr, 10) : 12;
    const hashedPassword = await bcrypt.hash(dto.password, rounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        nickname: dto.nickname,
        provider: AuthProvider.LOCAL,
        isEmailVerified: false,
      },
    });

    // 이메일 인증 토큰 생성 및 발송
    await this.sendVerificationEmail(user.id, user.email);

    return this.sanitizeUser(user);
  }

  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    // 기존 토큰 삭제
    await this.prisma.emailVerificationToken.deleteMany({
      where: { userId },
    });

    // 새 토큰 생성 (24시간 유효)
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    // 이메일 발송
    await this.emailService.sendEmailVerification(email, token);
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: '유효하지 않은 인증 링크입니다.',
      });
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.prisma.emailVerificationToken.delete({
        where: { id: tokenRecord.id },
      });
      throw new BadRequestException({
        code: 'TOKEN_EXPIRED',
        message: '인증 링크가 만료되었습니다. 새로운 인증 이메일을 요청해주세요.',
      });
    }

    if (tokenRecord.usedAt) {
      throw new BadRequestException({
        code: 'TOKEN_USED',
        message: '이미 인증된 이메일입니다.',
      });
    }

    // 이메일 인증 완료 처리
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { isEmailVerified: true },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: '이메일 인증이 완료되었습니다.' };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // 보안: 이메일 존재 여부 노출하지 않음
      return { message: '이메일이 등록되어 있다면 인증 메일이 발송됩니다.' };
    }

    if (user.isEmailVerified) {
      return { message: '이미 인증된 이메일입니다.' };
    }

    if (user.provider !== AuthProvider.LOCAL) {
      return { message: '소셜 로그인 계정은 이메일 인증이 필요하지 않습니다.' };
    }

    await this.sendVerificationEmail(user.id, user.email);

    return { message: '인증 이메일이 발송되었습니다.' };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return null;
    }

    if (!user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(dto: LoginDto): Promise<{ user: AuthUser; tokens: TokenResponse }> {
    const user = await this.validateUser(dto.email, dto.password);

    if (!user) {
      throw new UnauthorizedException({
        code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<{ user: AuthUser; tokens: TokenResponse }> {
    // Verify refresh token exists in DB
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException({
        code: ERROR_CODES.AUTH_REFRESH_TOKEN_INVALID,
        message: '유효하지 않은 리프레시 토큰입니다.',
      });
    }

    if (tokenRecord.expiresAt < new Date()) {
      // Delete expired token
      await this.prisma.refreshToken.delete({
        where: { id: tokenRecord.id },
      });
      throw new UnauthorizedException({
        code: ERROR_CODES.AUTH_TOKEN_EXPIRED,
        message: '리프레시 토큰이 만료되었습니다.',
      });
    }

    if (!tokenRecord.user.isActive) {
      throw new UnauthorizedException({
        code: ERROR_CODES.USER_INACTIVE,
        message: '비활성화된 계정입니다.',
      });
    }

    // Delete old refresh token
    await this.prisma.refreshToken.delete({
      where: { id: tokenRecord.id },
    });

    // Generate new tokens and return with user info
    const tokens = await this.generateTokens(tokenRecord.user);
    return {
      user: this.sanitizeUser(tokenRecord.user),
      tokens,
    };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          token: refreshToken,
        },
      });
    } else {
      // Delete all refresh tokens for user
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }
  }

  async getMe(userId: string): Promise<AuthUser> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        code: ERROR_CODES.USER_NOT_FOUND,
        message: '사용자를 찾을 수 없습니다.',
      });
    }
    return this.sanitizeUser(user);
  }

  private async generateTokens(user: User): Promise<TokenResponse> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    // Store refresh token in DB
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + TOKEN_EXPIRY.REFRESH_TOKEN);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN,
    };
  }

  private sanitizeUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      profileImage: user.profileImage,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // 보안: 이메일이 존재하지 않아도 같은 메시지 반환
    if (!user || user.provider !== AuthProvider.LOCAL) {
      return { message: '이메일이 등록되어 있다면 비밀번호 재설정 링크가 발송됩니다.' };
    }

    // 기존 토큰 삭제
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // 새 토큰 생성 (1시간 유효)
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // 이메일 발송
    await this.emailService.sendPasswordResetEmail(email, token);

    return { message: '이메일이 등록되어 있다면 비밀번호 재설정 링크가 발송됩니다.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: '유효하지 않은 토큰입니다.',
      });
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.prisma.passwordResetToken.delete({
        where: { id: tokenRecord.id },
      });
      throw new BadRequestException({
        code: 'TOKEN_EXPIRED',
        message: '토큰이 만료되었습니다. 다시 비밀번호 재설정을 요청해주세요.',
      });
    }

    if (tokenRecord.usedAt) {
      throw new BadRequestException({
        code: 'TOKEN_USED',
        message: '이미 사용된 토큰입니다.',
      });
    }

    // 비밀번호 해시
    const roundsStr = this.configService.get<string>('BCRYPT_ROUNDS');
    const rounds = roundsStr ? parseInt(roundsStr, 10) : 12;
    const hashedPassword = await bcrypt.hash(newPassword, rounds);

    // 비밀번호 업데이트 및 토큰 사용 처리
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      // 모든 refresh 토큰 무효화 (보안)
      this.prisma.refreshToken.deleteMany({
        where: { userId: tokenRecord.userId },
      }),
    ]);

    return { message: '비밀번호가 성공적으로 변경되었습니다.' };
  }
}
