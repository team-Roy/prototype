import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthProvider, UserRole } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: '$2b$12$hashedpassword',
    nickname: 'testuser',
    profileImage: null,
    bio: null,
    role: UserRole.USER,
    provider: AuthProvider.LOCAL,
    providerId: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockUserService = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string | number> = {
        BCRYPT_ROUNDS: 12,
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'password123',
      nickname: 'newuser',
    };

    it('should successfully register a new user', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(null); // nickname check

      mockPrismaService.user.create.mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
        nickname: registerDto.nickname,
      });

      const result = await service.register(registerDto);

      expect(result.email).toBe(registerDto.email);
      expect(result.nickname).toBe(registerDto.nickname);
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if nickname already exists', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(mockUser); // nickname check

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should hash password before storing', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      await service.register(registerDto);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: registerDto.email,
          password: expect.not.stringMatching(registerDto.password),
        }),
      });
    });

    it('should not store password in plain text', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      await service.register(registerDto);

      const createCall = mockPrismaService.user.create.mock.calls[0][0];
      expect(createCall.data.password).not.toBe(registerDto.password);
    });

    it('should not return password in response', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(result).not.toHaveProperty('password');
    });

    it('should set correct provider for local registration', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      await service.register(registerDto);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: AuthProvider.LOCAL,
        }),
      });
    });
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 12);

      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const result = await service.validateUser(mockUser.email, password);

      expect(result).toBeDefined();
      expect(result?.email).toBe(mockUser.email);
    });

    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null if password is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser(mockUser.email, 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should return null if user is inactive', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const result = await service.validateUser(mockUser.email, 'password123');

      expect(result).toBeNull();
    });

    it('should return null if user has no password (social login)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: null,
        provider: AuthProvider.GOOGLE,
      });

      const result = await service.validateUser(mockUser.email, 'password123');

      expect(result).toBeNull();
    });

    it('should return null for empty password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: '',
      });

      const result = await service.validateUser(mockUser.email, 'password123');

      expect(result).toBeNull();
    });

    it('should be case-sensitive for password', async () => {
      const password = 'Password123';
      const hashedPassword = await bcrypt.hash(password, 12);

      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const result = await service.validateUser(mockUser.email, 'password123');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return user and tokens on successful login', async () => {
      const hashedPassword = await bcrypt.hash(loginDto.password, 12);

      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result.user.email).toBe(loginDto.email);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.login({ ...loginDto, password: 'wrongpassword' })).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const hashedPassword = await bcrypt.hash(loginDto.password, 12);

      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
        isActive: false,
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should update lastLoginAt on successful login', async () => {
      const hashedPassword = await bcrypt.hash(loginDto.password, 12);

      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.login(loginDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should create refresh token on successful login', async () => {
      const hashedPassword = await bcrypt.hash(loginDto.password, 12);

      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.login(loginDto);

      expect(mockPrismaService.refreshToken.create).toHaveBeenCalled();
    });

    it('should not return password in user response', async () => {
      const hashedPassword = await bcrypt.hash(loginDto.password, 12);

      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result.user).not.toHaveProperty('password');
    });

    it('should return expiresIn in tokens', async () => {
      const hashedPassword = await bcrypt.hash(loginDto.password, 12);

      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result.tokens.expiresIn).toBeDefined();
      expect(typeof result.tokens.expiresIn).toBe('number');
    });
  });

  describe('refreshTokens', () => {
    const mockRefreshToken = {
      id: 'token-1',
      token: 'refresh-token',
      userId: mockUser.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      user: mockUser,
    };

    it('should refresh tokens successfully and return user info', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      mockPrismaService.refreshToken.delete.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshTokens('refresh-token');

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000),
      });
      mockPrismaService.refreshToken.delete.mockResolvedValue({});

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should delete expired token when refresh fails', async () => {
      const expiredToken = {
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000),
      };
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(expiredToken);
      mockPrismaService.refreshToken.delete.mockResolvedValue({});

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(UnauthorizedException);

      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: expiredToken.id },
      });
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        user: { ...mockUser, isActive: false },
      });

      await expect(service.refreshTokens('refresh-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should delete old refresh token after generating new one', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      mockPrismaService.refreshToken.delete.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.refreshTokens('refresh-token');

      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: mockRefreshToken.id },
      });
    });
  });

  describe('logout', () => {
    it('should delete specific refresh token if provided', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout('user-1', 'refresh-token');

      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          token: 'refresh-token',
        },
      });
    });

    it('should delete all refresh tokens if no token provided', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 3 });

      await service.logout('user-1');

      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should not throw when no tokens exist', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.logout('user-1')).resolves.not.toThrow();
    });
  });

  describe('getMe', () => {
    it('should return sanitized user', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);

      const result = await service.getMe('user-1');

      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserService.findById.mockResolvedValue(null);

      await expect(service.getMe('nonexistent')).rejects.toThrow(UnauthorizedException);
    });

    it('should return correct user fields', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);

      const result = await service.getMe('user-1');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('nickname');
      expect(result).toHaveProperty('profileImage');
      expect(result).toHaveProperty('role');
    });

    it('should not return sensitive fields', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);

      const result = await service.getMe('user-1');

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('isActive');
      expect(result).not.toHaveProperty('deletedAt');
    });
  });
});
