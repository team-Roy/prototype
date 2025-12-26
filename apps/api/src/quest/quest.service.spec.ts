import { Test, TestingModule } from '@nestjs/testing';
import { QuestService } from './quest.service';
import { PrismaService } from '../prisma/prisma.service';
import { FanScoreService } from '../fan-score/fan-score.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { QuestType, QuestActionType, UserRole } from '@prisma/client';

describe('QuestService', () => {
  let service: QuestService;

  const mockUser = {
    id: 'user-1',
    role: UserRole.CREATOR,
  };

  const mockLounge = {
    id: 'lounge-1',
    creatorId: mockUser.id,
  };

  const mockQuest = {
    id: 'quest-1',
    loungeId: mockLounge.id,
    creatorId: mockUser.id,
    type: QuestType.DAILY,
    actionType: QuestActionType.WRITE_POST,
    title: '오늘의 게시글',
    description: '오늘 게시글 1개 작성하기',
    iconUrl: null,
    targetCount: 1,
    rewardScore: 10,
    rewardBadgeType: null,
    startsAt: new Date(),
    endsAt: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProgress = {
    id: 'progress-1',
    userId: mockUser.id,
    questId: mockQuest.id,
    currentCount: 0,
    isCompleted: false,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    lounge: {
      findUnique: jest.fn(),
    },
    loungeManager: {
      findUnique: jest.fn(),
    },
    quest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    questProgress: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockFanScoreService = {
    addScore: jest.fn(),
    awardBadge: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: FanScoreService,
          useValue: mockFanScoreService,
        },
      ],
    }).compile();

    service = module.get<QuestService>(QuestService);

    jest.clearAllMocks();
  });

  describe('createQuest', () => {
    it('should create a quest for creator', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.quest.create.mockResolvedValue(mockQuest);

      const result = await service.createQuest(mockUser.id, {
        type: QuestType.DAILY,
        actionType: QuestActionType.WRITE_POST,
        title: '오늘의 게시글',
        description: '오늘 게시글 1개 작성하기',
        loungeId: mockLounge.id,
      });

      expect(result).toEqual(mockQuest);
      expect(mockPrismaService.quest.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createQuest('non-existent', {
          type: QuestType.DAILY,
          actionType: QuestActionType.WRITE_POST,
          title: 'Test',
          description: 'Test',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not creator', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: UserRole.USER,
      });

      await expect(
        service.createQuest(mockUser.id, {
          type: QuestType.DAILY,
          actionType: QuestActionType.WRITE_POST,
          title: 'Test',
          description: 'Test',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if lounge not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.loungeManager.findUnique.mockResolvedValue(null);
      mockPrismaService.lounge.findUnique.mockResolvedValue(null);

      await expect(
        service.createQuest(mockUser.id, {
          type: QuestType.DAILY,
          actionType: QuestActionType.WRITE_POST,
          title: 'Test',
          description: 'Test',
          loungeId: 'non-existent',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateQuest', () => {
    it('should update quest', async () => {
      const updatedQuest = { ...mockQuest, title: 'Updated Title' };
      mockPrismaService.quest.findUnique.mockResolvedValue(mockQuest);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.quest.update.mockResolvedValue(updatedQuest);

      const result = await service.updateQuest(mockQuest.id, mockUser.id, {
        title: 'Updated Title',
      });

      expect(result.title).toBe('Updated Title');
    });

    it('should throw NotFoundException if quest not found', async () => {
      mockPrismaService.quest.findUnique.mockResolvedValue(null);

      await expect(
        service.updateQuest('non-existent', mockUser.id, { title: 'Test' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.quest.findUnique.mockResolvedValue(mockQuest);
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        id: 'other-user',
        role: UserRole.USER,
      });

      await expect(
        service.updateQuest(mockQuest.id, 'other-user', { title: 'Test' })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteQuest', () => {
    it('should delete quest', async () => {
      mockPrismaService.quest.findUnique.mockResolvedValue(mockQuest);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.quest.delete.mockResolvedValue(mockQuest);

      await service.deleteQuest(mockQuest.id, mockUser.id);

      expect(mockPrismaService.quest.delete).toHaveBeenCalledWith({
        where: { id: mockQuest.id },
      });
    });

    it('should throw NotFoundException if quest not found', async () => {
      mockPrismaService.quest.findUnique.mockResolvedValue(null);

      await expect(service.deleteQuest('non-existent', mockUser.id)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getQuests', () => {
    it('should return quests with progress', async () => {
      mockPrismaService.quest.findMany.mockResolvedValue([mockQuest]);
      mockPrismaService.quest.count.mockResolvedValue(1);
      mockPrismaService.questProgress.findMany.mockResolvedValue([
        { ...mockProgress, questId: mockQuest.id, currentCount: 0 },
      ]);

      const result = await service.getQuests({}, mockUser.id);

      expect(result.quests).toHaveLength(1);
      expect(result.quests[0].progressPercentage).toBe(0);
    });

    it('should filter by quest type', async () => {
      mockPrismaService.quest.findMany.mockResolvedValue([mockQuest]);
      mockPrismaService.quest.count.mockResolvedValue(1);

      await service.getQuests({ type: QuestType.DAILY });

      expect(mockPrismaService.quest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: QuestType.DAILY,
          }),
        })
      );
    });

    it('should filter completed quests when includeCompleted is false', async () => {
      const completedProgress = { ...mockProgress, isCompleted: true };
      mockPrismaService.quest.findMany.mockResolvedValue([mockQuest]);
      mockPrismaService.quest.count.mockResolvedValue(1);
      mockPrismaService.questProgress.findMany.mockResolvedValue([
        { ...completedProgress, questId: mockQuest.id },
      ]);

      const result = await service.getQuests({ includeCompleted: false }, mockUser.id);

      expect(result.quests).toHaveLength(0);
    });
  });

  describe('getQuest', () => {
    it('should return quest with progress', async () => {
      mockPrismaService.quest.findUnique.mockResolvedValue(mockQuest);
      mockPrismaService.questProgress.findUnique.mockResolvedValue({
        ...mockProgress,
        currentCount: 1,
      });

      const result = await service.getQuest(mockQuest.id, mockUser.id);

      expect(result.id).toBe(mockQuest.id);
      expect(result.currentCount).toBe(1);
      expect(result.progressPercentage).toBe(100);
    });

    it('should throw NotFoundException if quest not found', async () => {
      mockPrismaService.quest.findUnique.mockResolvedValue(null);

      await expect(service.getQuest('non-existent', mockUser.id)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateProgress', () => {
    it('should create new progress if not exists', async () => {
      mockPrismaService.quest.findMany.mockResolvedValue([mockQuest]);
      mockPrismaService.questProgress.findUnique.mockResolvedValue(null);
      mockPrismaService.questProgress.create.mockResolvedValue({
        ...mockProgress,
        currentCount: 1,
      });

      const result = await service.updateProgress(
        mockUser.id,
        QuestActionType.WRITE_POST,
        mockLounge.id
      );

      expect(result).toHaveLength(1);
      expect(mockPrismaService.questProgress.create).toHaveBeenCalled();
    });

    it('should update existing progress', async () => {
      mockPrismaService.quest.findMany.mockResolvedValue([mockQuest]);
      mockPrismaService.questProgress.findUnique.mockResolvedValue(mockProgress);
      mockPrismaService.questProgress.update.mockResolvedValue({
        ...mockProgress,
        currentCount: 1,
      });

      const result = await service.updateProgress(
        mockUser.id,
        QuestActionType.WRITE_POST,
        mockLounge.id
      );

      expect(result).toHaveLength(1);
      expect(mockPrismaService.questProgress.update).toHaveBeenCalled();
    });

    it('should complete quest and grant rewards when target reached', async () => {
      const questWith1Target = { ...mockQuest, targetCount: 1 };
      mockPrismaService.quest.findMany.mockResolvedValue([questWith1Target]);
      mockPrismaService.questProgress.findUnique.mockResolvedValue(null);
      mockPrismaService.questProgress.create.mockResolvedValue({
        ...mockProgress,
        currentCount: 1,
      });
      mockPrismaService.questProgress.update.mockResolvedValue({
        ...mockProgress,
        currentCount: 1,
        isCompleted: true,
        completedAt: new Date(),
      });

      await service.updateProgress(mockUser.id, QuestActionType.WRITE_POST, mockLounge.id);

      expect(mockFanScoreService.addScore).toHaveBeenCalled();
    });

    it('should skip already completed quests', async () => {
      mockPrismaService.quest.findMany.mockResolvedValue([mockQuest]);
      mockPrismaService.questProgress.findUnique.mockResolvedValue({
        ...mockProgress,
        isCompleted: true,
      });

      const result = await service.updateProgress(mockUser.id, QuestActionType.WRITE_POST);

      expect(result).toHaveLength(0);
    });
  });

  describe('getMyProgress', () => {
    it('should return all user progress', async () => {
      mockPrismaService.questProgress.findMany.mockResolvedValue([
        { ...mockProgress, quest: mockQuest },
      ]);

      const result = await service.getMyProgress(mockUser.id);

      expect(result).toHaveLength(1);
    });
  });

  describe('resetDailyQuests', () => {
    it('should reset daily quest progress', async () => {
      mockPrismaService.questProgress.deleteMany.mockResolvedValue({ count: 10 });

      const result = await service.resetDailyQuests();

      expect(result).toBe(10);
      expect(mockPrismaService.questProgress.deleteMany).toHaveBeenCalledWith({
        where: {
          quest: {
            type: QuestType.DAILY,
          },
        },
      });
    });
  });

  describe('resetWeeklyQuests', () => {
    it('should reset weekly quest progress', async () => {
      mockPrismaService.questProgress.deleteMany.mockResolvedValue({ count: 5 });

      const result = await service.resetWeeklyQuests();

      expect(result).toBe(5);
      expect(mockPrismaService.questProgress.deleteMany).toHaveBeenCalledWith({
        where: {
          quest: {
            type: QuestType.WEEKLY,
          },
        },
      });
    });
  });
});
