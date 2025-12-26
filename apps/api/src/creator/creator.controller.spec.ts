import { Test, TestingModule } from '@nestjs/testing';
import { CreatorController } from './creator.controller';
import { CreatorService } from './creator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatorApplicationStatus, UserRole } from '@prisma/client';
import { ReviewAction } from './dto/review-application.dto';

describe('CreatorController', () => {
  let controller: CreatorController;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    nickname: 'testuser',
    role: UserRole.USER,
  };

  const mockAdminUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    nickname: 'admin',
    role: UserRole.ADMIN,
  };

  const mockApplication = {
    id: 'app-1',
    userId: 'user-1',
    creatorName: '테스트 크리에이터',
    channelUrl: 'https://youtube.com/@test',
    channelType: 'youtube',
    followerCount: '10000',
    introduction: '안녕하세요',
    status: CreatorApplicationStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreatorService = {
    applyForCreator: jest.fn(),
    getMyApplications: jest.fn(),
    getApplications: jest.fn(),
    getApplication: jest.fn(),
    reviewApplication: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreatorController],
      providers: [{ provide: CreatorService, useValue: mockCreatorService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CreatorController>(CreatorController);

    jest.clearAllMocks();
  });

  describe('apply', () => {
    const applyDto = {
      creatorName: '테스트 크리에이터',
      channelUrl: 'https://youtube.com/@test',
      channelType: 'youtube',
      followerCount: '10000',
      introduction: '안녕하세요',
    };

    it('should create a creator application', async () => {
      mockCreatorService.applyForCreator.mockResolvedValue(mockApplication);

      const result = await controller.apply(mockUser, applyDto);

      expect(result.application).toEqual(mockApplication);
      expect(result.message).toBe('크리에이터 신청이 완료되었습니다. 심사 후 결과를 알려드립니다.');
      expect(mockCreatorService.applyForCreator).toHaveBeenCalledWith(mockUser.id, applyDto);
    });

    it('should pass user id from authenticated user', async () => {
      mockCreatorService.applyForCreator.mockResolvedValue(mockApplication);

      await controller.apply(mockUser, applyDto);

      expect(mockCreatorService.applyForCreator).toHaveBeenCalledWith('user-1', expect.any(Object));
    });
  });

  describe('getMyApplications', () => {
    it('should return user applications', async () => {
      const applications = [mockApplication];
      mockCreatorService.getMyApplications.mockResolvedValue(applications);

      const result = await controller.getMyApplications(mockUser);

      expect(result).toEqual(applications);
      expect(mockCreatorService.getMyApplications).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return empty array if no applications', async () => {
      mockCreatorService.getMyApplications.mockResolvedValue([]);

      const result = await controller.getMyApplications(mockUser);

      expect(result).toEqual([]);
    });
  });

  describe('getApplications (admin)', () => {
    it('should return all applications without filter', async () => {
      const applications = [mockApplication];
      mockCreatorService.getApplications.mockResolvedValue(applications);

      const result = await controller.getApplications(undefined);

      expect(result).toEqual(applications);
      expect(mockCreatorService.getApplications).toHaveBeenCalledWith(undefined);
    });

    it('should filter by PENDING status', async () => {
      mockCreatorService.getApplications.mockResolvedValue([mockApplication]);

      await controller.getApplications(CreatorApplicationStatus.PENDING);

      expect(mockCreatorService.getApplications).toHaveBeenCalledWith(
        CreatorApplicationStatus.PENDING
      );
    });

    it('should filter by APPROVED status', async () => {
      mockCreatorService.getApplications.mockResolvedValue([]);

      await controller.getApplications(CreatorApplicationStatus.APPROVED);

      expect(mockCreatorService.getApplications).toHaveBeenCalledWith(
        CreatorApplicationStatus.APPROVED
      );
    });

    it('should filter by REJECTED status', async () => {
      mockCreatorService.getApplications.mockResolvedValue([]);

      await controller.getApplications(CreatorApplicationStatus.REJECTED);

      expect(mockCreatorService.getApplications).toHaveBeenCalledWith(
        CreatorApplicationStatus.REJECTED
      );
    });
  });

  describe('getApplication (admin)', () => {
    it('should return application details', async () => {
      mockCreatorService.getApplication.mockResolvedValue(mockApplication);

      const result = await controller.getApplication('app-1');

      expect(result).toEqual(mockApplication);
      expect(mockCreatorService.getApplication).toHaveBeenCalledWith('app-1');
    });
  });

  describe('reviewApplication (admin)', () => {
    it('should approve application', async () => {
      const reviewDto = { action: ReviewAction.APPROVE };
      mockCreatorService.reviewApplication.mockResolvedValue({
        message: '크리에이터 신청이 승인되었습니다.',
      });

      const result = await controller.reviewApplication('app-1', mockAdminUser, reviewDto);

      expect(result.message).toBe('크리에이터 신청이 승인되었습니다.');
      expect(mockCreatorService.reviewApplication).toHaveBeenCalledWith(
        'app-1',
        mockAdminUser.id,
        reviewDto
      );
    });

    it('should reject application with reason', async () => {
      const reviewDto = {
        action: ReviewAction.REJECT,
        rejectionReason: '팔로워 수가 부족합니다.',
      };
      mockCreatorService.reviewApplication.mockResolvedValue({
        message: '크리에이터 신청이 거절되었습니다.',
      });

      const result = await controller.reviewApplication('app-1', mockAdminUser, reviewDto);

      expect(result.message).toBe('크리에이터 신청이 거절되었습니다.');
    });

    it('should pass admin id for audit', async () => {
      const reviewDto = { action: ReviewAction.APPROVE };
      mockCreatorService.reviewApplication.mockResolvedValue({
        message: '크리에이터 신청이 승인되었습니다.',
      });

      await controller.reviewApplication('app-1', mockAdminUser, reviewDto);

      expect(mockCreatorService.reviewApplication).toHaveBeenCalledWith(
        'app-1',
        'admin-1',
        reviewDto
      );
    });
  });
});
