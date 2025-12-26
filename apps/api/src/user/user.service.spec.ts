import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthProvider, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;

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

  const mockGoogleUser = {
    ...mockUser,
    id: 'google-user-1',
    email: 'google@example.com',
    password: null,
    provider: AuthProvider.GOOGLE,
    providerId: 'google-123',
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      deleteMany: jest.fn(),
    },
    passwordResetToken: {
      deleteMany: jest.fn(),
    },
    emailVerificationToken: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<UserService>(UserService);

    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('user-1');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1', deletedAt: null },
      });
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com', deletedAt: null },
      });
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByNickname', () => {
    it('should return user when found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByNickname('testuser');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { nickname: 'testuser', deletedAt: null },
      });
    });
  });

  describe('findByProvider', () => {
    it('should return user when found', async () => {
      const googleUser = {
        ...mockUser,
        provider: AuthProvider.GOOGLE,
        providerId: 'google-123',
      };
      mockPrismaService.user.findFirst.mockResolvedValue(googleUser);

      const result = await service.findByProvider(AuthProvider.GOOGLE, 'google-123');

      expect(result).toEqual(googleUser);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          provider: AuthProvider.GOOGLE,
          providerId: 'google-123',
          deletedAt: null,
        },
      });
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, nickname: 'newname', bio: 'new bio' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('user-1', {
        nickname: 'newname',
        bio: 'new bio',
      });

      expect(result.nickname).toBe('newname');
      expect(result.bio).toBe('new bio');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.updateProfile('nonexistent', { nickname: 'new' })).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('checkNicknameAvailable', () => {
    it('should return true when nickname is available', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      const result = await service.checkNicknameAvailable('newname');

      expect(result).toBe(true);
    });

    it('should return false when nickname is taken', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.checkNicknameAvailable('testuser');

      expect(result).toBe(false);
    });

    it('should exclude current user when checking', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await service.checkNicknameAvailable('testuser', 'user-1');

      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          nickname: 'testuser',
          deletedAt: null,
          NOT: { id: 'user-1' },
        },
      });
    });
  });

  describe('checkEmailAvailable', () => {
    it('should return true when email is available', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.checkEmailAvailable('new@example.com');

      expect(result).toBe(true);
    });

    it('should return false when email is taken', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.checkEmailAvailable('test@example.com');

      expect(result).toBe(false);
    });
  });

  describe('deleteAccount', () => {
    beforeEach(() => {
      mockPrismaService.$transaction.mockImplementation((operations: unknown[]) => {
        return Promise.all(operations);
      });
    });

    describe('Local account deletion', () => {
      it('should delete account with valid password', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}, {}]);

        await expect(service.deleteAccount('user-1', 'password123')).resolves.not.toThrow();

        expect(mockPrismaService.$transaction).toHaveBeenCalled();
      });

      it('should throw NotFoundException if user not found', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        await expect(service.deleteAccount('nonexistent', 'password')).rejects.toThrow(
          NotFoundException
        );
      });

      it('should throw BadRequestException if password not provided for LOCAL account', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

        await expect(service.deleteAccount('user-1')).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if password is invalid', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(service.deleteAccount('user-1', 'wrongpassword')).rejects.toThrow(
          BadRequestException
        );
      });

      it('should verify password using bcrypt', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}, {}]);

        await service.deleteAccount('user-1', 'password123');

        expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.password);
      });
    });

    describe('Social account deletion', () => {
      it('should delete Google account without password', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockGoogleUser);
        mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}, {}]);

        await expect(service.deleteAccount('google-user-1')).resolves.not.toThrow();

        expect(bcrypt.compare).not.toHaveBeenCalled();
      });

      it('should delete social account even if password is provided', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockGoogleUser);
        mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}, {}]);

        await expect(service.deleteAccount('google-user-1', 'somepassword')).resolves.not.toThrow();
      });
    });

    describe('Data anonymization', () => {
      it('should anonymize email with user id', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}, {}]);

        await service.deleteAccount('user-1', 'password123');

        // $transaction 호출 확인
        expect(mockPrismaService.$transaction).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.anything(), // refreshToken.deleteMany
            expect.anything(), // passwordResetToken.deleteMany
            expect.anything(), // emailVerificationToken.deleteMany
            expect.anything(), // user.update
          ])
        );
      });

      it('should set deletedAt timestamp', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}, {}]);

        await service.deleteAccount('user-1', 'password123');

        expect(mockPrismaService.$transaction).toHaveBeenCalled();
      });

      it('should set isActive to false', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}, {}]);

        await service.deleteAccount('user-1', 'password123');

        expect(mockPrismaService.$transaction).toHaveBeenCalled();
      });

      it('should clear sensitive data (password, profileImage, bio, providerId)', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}, {}]);

        await service.deleteAccount('user-1', 'password123');

        expect(mockPrismaService.$transaction).toHaveBeenCalled();
      });
    });

    describe('Token cleanup', () => {
      it('should delete all refresh tokens', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}, {}]);

        await service.deleteAccount('user-1', 'password123');

        expect(mockPrismaService.$transaction).toHaveBeenCalled();
      });

      it('should delete all password reset tokens', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}, {}]);

        await service.deleteAccount('user-1', 'password123');

        expect(mockPrismaService.$transaction).toHaveBeenCalled();
      });

      it('should delete all email verification tokens', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}, {}]);

        await service.deleteAccount('user-1', 'password123');

        expect(mockPrismaService.$transaction).toHaveBeenCalled();
      });
    });

    describe('Already deleted account', () => {
      it('should throw NotFoundException for already deleted account', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        await expect(service.deleteAccount('deleted-user', 'password')).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('Edge cases', () => {
      it('should handle empty password string for LOCAL account', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

        await expect(service.deleteAccount('user-1', '')).rejects.toThrow(BadRequestException);
      });

      it('should handle account with no password (null) for LOCAL provider', async () => {
        const localUserNoPassword = {
          ...mockUser,
          password: null,
        };
        mockPrismaService.user.findUnique.mockResolvedValue(localUserNoPassword);
        mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}, {}]);

        // password가 null이면 비밀번호 확인 스킵
        await expect(service.deleteAccount('user-1')).resolves.not.toThrow();
      });
    });
  });
});
