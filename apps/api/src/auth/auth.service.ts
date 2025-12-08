import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
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
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService
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

    const rounds = this.configService.get<number>('BCRYPT_ROUNDS') || 12;
    const hashedPassword = await bcrypt.hash(dto.password, rounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        nickname: dto.nickname,
        provider: AuthProvider.LOCAL,
      },
    });

    return this.sanitizeUser(user);
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

  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
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

    // Generate new tokens
    return this.generateTokens(tokenRecord.user);
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
    };
  }
}
