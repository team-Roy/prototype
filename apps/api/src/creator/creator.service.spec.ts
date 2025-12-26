import { Test, TestingModule } from '@nestjs/testing';
import { CreatorService } from './creator.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreatorApplicationStatus, UserRole, AuthProvider } from '@prisma/client';
import { ReviewAction } from './dto/review-application.dto';

describe('CreatorService', () => {
  let service: CreatorService;

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
    emailVerified: false,
    lastLoginAt: null,
    creatorName: null,
    channelUrl: null,
    isVerifiedCreator: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockCreatorUser = {
    ...mockUser,
    id: 'creator-1',
    role: UserRole.CREATOR,
    creatorName: '테스트 크리에이터',
    channelUrl: 'https://youtube.com/@test',
  };

  const mockAdminUser = {
    ...mockUser,
    id: 'admin-1',
    role: UserRole.ADMIN,
  };

  const mockApplication = {
    id: 'app-1',
    userId: 'user-1',
    creatorName: '테스트 크리에이터',
    channelUrl: 'https://youtube.com/@testcreator',
    channelType: 'youtube',
    followerCount: '10000',
    introduction: '안녕하세요, 테스트 크리에이터입니다.',
    status: CreatorApplicationStatus.PENDING,
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUser,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    creatorApplication: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CreatorService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<CreatorService>(CreatorService);

    jest.clearAllMocks();
  });

  describe('applyForCreator', () => {
    const applyDto = {
      creatorName: '테스트 크리에이터',
      channelUrl: 'https://youtube.com/@testcreator',
      channelType: 'youtube',
      followerCount: '10000',
      introduction: '안녕하세요, 테스트 크리에이터입니다.',
    };

    it('should successfully create a creator application', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.creatorApplication.findFirst.mockResolvedValue(null);
      mockPrismaService.creatorApplication.create.mockResolvedValue(mockApplication);

      const result = await service.applyForCreator('user-1', applyDto);

      expect(result).toEqual(mockApplication);
      expect(mockPrismaService.creatorApplication.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          creatorName: applyDto.creatorName,
          channelUrl: applyDto.channelUrl,
          channelType: applyDto.channelType,
          followerCount: applyDto.followerCount,
          introduction: applyDto.introduction,
        },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.applyForCreator('nonexistent', applyDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if user is already a creator', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockCreatorUser);

      await expect(service.applyForCreator('creator-1', applyDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if user is admin', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser);

      await expect(service.applyForCreator('admin-1', applyDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if pending application exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.creatorApplication.findFirst.mockResolvedValue(mockApplication);

      await expect(service.applyForCreator('user-1', applyDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should allow reapply after rejection (no pending application)', async () => {
      // 거절된 신청이 있더라도 PENDING 상태인 신청이 없으면 재신청 가능
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.creatorApplication.findFirst.mockResolvedValue(null); // no pending
      mockPrismaService.creatorApplication.create.mockResolvedValue(mockApplication);

      const result = await service.applyForCreator('user-1', applyDto);

      expect(result).toEqual(mockApplication);
    });

    it('should include all required fields in application', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.creatorApplication.findFirst.mockResolvedValue(null);
      mockPrismaService.creatorApplication.create.mockResolvedValue(mockApplication);

      await service.applyForCreator('user-1', applyDto);

      const createCall = mockPrismaService.creatorApplication.create.mock.calls[0][0];
      expect(createCall.data).toHaveProperty('creatorName');
      expect(createCall.data).toHaveProperty('channelUrl');
      expect(createCall.data).toHaveProperty('channelType');
      expect(createCall.data).toHaveProperty('introduction');
    });

    it('should handle optional followerCount', async () => {
      const dtoWithoutFollowerCount = {
        creatorName: '테스트 크리에이터',
        channelUrl: 'https://youtube.com/@testcreator',
        channelType: 'youtube',
        introduction: '안녕하세요',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.creatorApplication.findFirst.mockResolvedValue(null);
      mockPrismaService.creatorApplication.create.mockResolvedValue({
        ...mockApplication,
        followerCount: null,
      });

      const result = await service.applyForCreator('user-1', dtoWithoutFollowerCount);

      expect(result.followerCount).toBeNull();
    });
  });

  describe('getMyApplications', () => {
    it('should return user applications ordered by createdAt desc', async () => {
      const applications = [
        { ...mockApplication, createdAt: new Date('2024-02-01') },
        { ...mockApplication, id: 'app-2', createdAt: new Date('2024-01-01') },
      ];
      mockPrismaService.creatorApplication.findMany.mockResolvedValue(applications);

      const result = await service.getMyApplications('user-1');

      expect(result).toEqual(applications);
      expect(mockPrismaService.creatorApplication.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if no applications', async () => {
      mockPrismaService.creatorApplication.findMany.mockResolvedValue([]);

      const result = await service.getMyApplications('user-1');

      expect(result).toEqual([]);
    });

    it('should return all applications regardless of status', async () => {
      const applications = [
        { ...mockApplication, status: CreatorApplicationStatus.PENDING },
        { ...mockApplication, id: 'app-2', status: CreatorApplicationStatus.APPROVED },
        { ...mockApplication, id: 'app-3', status: CreatorApplicationStatus.REJECTED },
      ];
      mockPrismaService.creatorApplication.findMany.mockResolvedValue(applications);

      const result = await service.getMyApplications('user-1');

      expect(result).toHaveLength(3);
    });
  });

  describe('getApplications (admin)', () => {
    it('should return all applications with user info', async () => {
      const applications = [mockApplication];
      mockPrismaService.creatorApplication.findMany.mockResolvedValue(applications);

      const result = await service.getApplications();

      expect(result).toEqual(applications);
      expect(mockPrismaService.creatorApplication.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nickname: true,
              profileImage: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by status when provided', async () => {
      mockPrismaService.creatorApplication.findMany.mockResolvedValue([mockApplication]);

      await service.getApplications(CreatorApplicationStatus.PENDING);

      expect(mockPrismaService.creatorApplication.findMany).toHaveBeenCalledWith({
        where: { status: CreatorApplicationStatus.PENDING },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by APPROVED status', async () => {
      mockPrismaService.creatorApplication.findMany.mockResolvedValue([]);

      await service.getApplications(CreatorApplicationStatus.APPROVED);

      expect(mockPrismaService.creatorApplication.findMany).toHaveBeenCalledWith({
        where: { status: CreatorApplicationStatus.APPROVED },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by REJECTED status', async () => {
      mockPrismaService.creatorApplication.findMany.mockResolvedValue([]);

      await service.getApplications(CreatorApplicationStatus.REJECTED);

      expect(mockPrismaService.creatorApplication.findMany).toHaveBeenCalledWith({
        where: { status: CreatorApplicationStatus.REJECTED },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getApplication (admin)', () => {
    it('should return application with detailed user info', async () => {
      mockPrismaService.creatorApplication.findUnique.mockResolvedValue(mockApplication);

      const result = await service.getApplication('app-1');

      expect(result).toEqual(mockApplication);
      expect(mockPrismaService.creatorApplication.findUnique).toHaveBeenCalledWith({
        where: { id: 'app-1' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nickname: true,
              profileImage: true,
              bio: true,
              createdAt: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if application not found', async () => {
      mockPrismaService.creatorApplication.findUnique.mockResolvedValue(null);

      await expect(service.getApplication('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reviewApplication', () => {
    describe('APPROVE action', () => {
      it('should approve application and update user role', async () => {
        mockPrismaService.creatorApplication.findUnique.mockResolvedValue(mockApplication);
        mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

        const result = await service.reviewApplication('app-1', 'admin-1', {
          action: ReviewAction.APPROVE,
        });

        expect(result.message).toBe('크리에이터 신청이 승인되었습니다.');
        expect(mockPrismaService.$transaction).toHaveBeenCalled();
      });

      it('should update user with creator info on approval', async () => {
        mockPrismaService.creatorApplication.findUnique.mockResolvedValue(mockApplication);
        mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

        await service.reviewApplication('app-1', 'admin-1', {
          action: ReviewAction.APPROVE,
        });

        const transactionCall = mockPrismaService.$transaction.mock.calls[0][0];
        // Transaction 배열에 user.update와 creatorApplication.update가 포함되어야 함
        expect(transactionCall).toHaveLength(2);
      });

      it('should throw NotFoundException if application not found', async () => {
        mockPrismaService.creatorApplication.findUnique.mockResolvedValue(null);

        await expect(
          service.reviewApplication('nonexistent', 'admin-1', {
            action: ReviewAction.APPROVE,
          })
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw BadRequestException if already processed', async () => {
        const approvedApplication = {
          ...mockApplication,
          status: CreatorApplicationStatus.APPROVED,
        };
        mockPrismaService.creatorApplication.findUnique.mockResolvedValue(approvedApplication);

        await expect(
          service.reviewApplication('app-1', 'admin-1', {
            action: ReviewAction.APPROVE,
          })
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if already rejected', async () => {
        const rejectedApplication = {
          ...mockApplication,
          status: CreatorApplicationStatus.REJECTED,
        };
        mockPrismaService.creatorApplication.findUnique.mockResolvedValue(rejectedApplication);

        await expect(
          service.reviewApplication('app-1', 'admin-1', {
            action: ReviewAction.APPROVE,
          })
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('REJECT action', () => {
      it('should reject application with reason', async () => {
        mockPrismaService.creatorApplication.findUnique.mockResolvedValue(mockApplication);
        mockPrismaService.creatorApplication.update.mockResolvedValue({
          ...mockApplication,
          status: CreatorApplicationStatus.REJECTED,
          rejectionReason: '채널 팔로워 수가 부족합니다.',
        });

        const result = await service.reviewApplication('app-1', 'admin-1', {
          action: ReviewAction.REJECT,
          rejectionReason: '채널 팔로워 수가 부족합니다.',
        });

        expect(result.message).toBe('크리에이터 신청이 거절되었습니다.');
      });

      it('should throw BadRequestException if rejection reason not provided', async () => {
        mockPrismaService.creatorApplication.findUnique.mockResolvedValue(mockApplication);

        await expect(
          service.reviewApplication('app-1', 'admin-1', {
            action: ReviewAction.REJECT,
          })
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if rejection reason is empty', async () => {
        mockPrismaService.creatorApplication.findUnique.mockResolvedValue(mockApplication);

        await expect(
          service.reviewApplication('app-1', 'admin-1', {
            action: ReviewAction.REJECT,
            rejectionReason: '',
          })
        ).rejects.toThrow(BadRequestException);
      });

      it('should update application with rejection details', async () => {
        mockPrismaService.creatorApplication.findUnique.mockResolvedValue(mockApplication);
        mockPrismaService.creatorApplication.update.mockResolvedValue({
          ...mockApplication,
          status: CreatorApplicationStatus.REJECTED,
        });

        await service.reviewApplication('app-1', 'admin-1', {
          action: ReviewAction.REJECT,
          rejectionReason: '거절 사유',
        });

        expect(mockPrismaService.creatorApplication.update).toHaveBeenCalledWith({
          where: { id: 'app-1' },
          data: {
            status: CreatorApplicationStatus.REJECTED,
            reviewedAt: expect.any(Date),
            reviewedBy: 'admin-1',
            rejectionReason: '거절 사유',
          },
        });
      });

      it('should not update user role on rejection', async () => {
        mockPrismaService.creatorApplication.findUnique.mockResolvedValue(mockApplication);
        mockPrismaService.creatorApplication.update.mockResolvedValue(mockApplication);

        await service.reviewApplication('app-1', 'admin-1', {
          action: ReviewAction.REJECT,
          rejectionReason: '거절 사유',
        });

        expect(mockPrismaService.user.update).not.toHaveBeenCalled();
        expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      });
    });
  });
});
