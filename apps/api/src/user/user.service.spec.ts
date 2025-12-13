import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { AuthProvider, UserRole } from '@prisma/client';

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

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
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
});
