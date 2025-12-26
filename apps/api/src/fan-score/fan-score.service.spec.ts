import { Test, TestingModule } from '@nestjs/testing';
import { FanScoreService } from './fan-score.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { BadgeType } from '@prisma/client';
import { ScoreActionType, SCORE_CONFIG } from './dto/fan-score.dto';

describe('FanScoreService', () => {
  let service: FanScoreService;

  const mockUser = {
    id: 'user-1',
    nickname: 'TestUser',
    profileImage: 'https://example.com/profile.jpg',
  };

  const mockLounge = {
    id: 'lounge-1',
    name: 'Test Lounge',
    slug: 'test-lounge',
  };

  const mockFanScore = {
    id: 'fan-score-1',
    userId: mockUser.id,
    loungeId: mockLounge.id,
    totalScore: 100,
    monthlyScore: 50,
    postScore: 50,
    commentScore: 30,
    voteScore: 10,
    questScore: 10,
    rank: 1,
    previousRank: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    fanScore: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    fanBadge: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    lounge: {
      findUnique: jest.fn(),
    },
    $executeRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FanScoreService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FanScoreService>(FanScoreService);

    jest.clearAllMocks();
  });

  describe('getOrCreateFanScore', () => {
    it('should return existing fan score', async () => {
      mockPrismaService.fanScore.findUnique.mockResolvedValue(mockFanScore);

      const result = await service.getOrCreateFanScore(mockUser.id, mockLounge.id);

      expect(result).toEqual(mockFanScore);
      expect(mockPrismaService.fanScore.findUnique).toHaveBeenCalledWith({
        where: {
          userId_loungeId: { userId: mockUser.id, loungeId: mockLounge.id },
        },
      });
    });

    it('should create new fan score if not exists', async () => {
      mockPrismaService.fanScore.findUnique.mockResolvedValue(null);
      mockPrismaService.fanScore.create.mockResolvedValue(mockFanScore);

      const result = await service.getOrCreateFanScore(mockUser.id, mockLounge.id);

      expect(result).toEqual(mockFanScore);
      expect(mockPrismaService.fanScore.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          loungeId: mockLounge.id,
        },
      });
    });
  });

  describe('addScore', () => {
    it('should add POST_CREATED score', async () => {
      const updatedScore = {
        ...mockFanScore,
        totalScore: mockFanScore.totalScore + SCORE_CONFIG.POST_CREATED,
        postScore: mockFanScore.postScore + SCORE_CONFIG.POST_CREATED,
      };
      mockPrismaService.fanScore.upsert.mockResolvedValue(updatedScore);

      const result = await service.addScore(
        mockUser.id,
        mockLounge.id,
        ScoreActionType.POST_CREATED
      );

      expect(result.totalScore).toBe(updatedScore.totalScore);
      expect(mockPrismaService.fanScore.upsert).toHaveBeenCalled();
    });

    it('should add COMMENT_CREATED score', async () => {
      const updatedScore = {
        ...mockFanScore,
        totalScore: mockFanScore.totalScore + SCORE_CONFIG.COMMENT_CREATED,
        commentScore: mockFanScore.commentScore + SCORE_CONFIG.COMMENT_CREATED,
      };
      mockPrismaService.fanScore.upsert.mockResolvedValue(updatedScore);

      const result = await service.addScore(
        mockUser.id,
        mockLounge.id,
        ScoreActionType.COMMENT_CREATED
      );

      expect(result).toEqual(updatedScore);
    });

    it('should add VOTE_RECEIVED score', async () => {
      const updatedScore = {
        ...mockFanScore,
        totalScore: mockFanScore.totalScore + SCORE_CONFIG.VOTE_RECEIVED,
        voteScore: mockFanScore.voteScore + SCORE_CONFIG.VOTE_RECEIVED,
      };
      mockPrismaService.fanScore.upsert.mockResolvedValue(updatedScore);

      const result = await service.addScore(
        mockUser.id,
        mockLounge.id,
        ScoreActionType.VOTE_RECEIVED
      );

      expect(result).toEqual(updatedScore);
    });

    it('should add QUEST_COMPLETED score with custom score', async () => {
      const customScore = 50;
      const updatedScore = {
        ...mockFanScore,
        totalScore: mockFanScore.totalScore + customScore,
        questScore: mockFanScore.questScore + customScore,
      };
      mockPrismaService.fanScore.upsert.mockResolvedValue(updatedScore);

      const result = await service.addScore(
        mockUser.id,
        mockLounge.id,
        ScoreActionType.QUEST_COMPLETED,
        customScore
      );

      expect(result).toEqual(updatedScore);
    });

    it('should award ACTIVE_COMMENTER badge when comment score reaches 200', async () => {
      const highCommentScore = {
        ...mockFanScore,
        commentScore: 200,
      };
      mockPrismaService.fanScore.upsert.mockResolvedValue(highCommentScore);
      mockPrismaService.fanBadge.upsert.mockResolvedValue({
        id: 'badge-1',
        type: BadgeType.ACTIVE_COMMENTER,
      });

      await service.addScore(mockUser.id, mockLounge.id, ScoreActionType.COMMENT_CREATED);

      expect(mockPrismaService.fanBadge.upsert).toHaveBeenCalled();
    });

    it('should award CONTENT_CREATOR badge when post score reaches 500', async () => {
      const highPostScore = {
        ...mockFanScore,
        postScore: 500,
      };
      mockPrismaService.fanScore.upsert.mockResolvedValue(highPostScore);
      mockPrismaService.fanBadge.upsert.mockResolvedValue({
        id: 'badge-1',
        type: BadgeType.CONTENT_CREATOR,
      });

      await service.addScore(mockUser.id, mockLounge.id, ScoreActionType.POST_CREATED);

      expect(mockPrismaService.fanBadge.upsert).toHaveBeenCalled();
    });
  });

  describe('getFanRanking', () => {
    const mockFanScoresWithUsers = [
      {
        ...mockFanScore,
        user: mockUser,
      },
      {
        ...mockFanScore,
        id: 'fan-score-2',
        userId: 'user-2',
        totalScore: 80,
        user: { ...mockUser, id: 'user-2', nickname: 'User2' },
      },
    ];

    it('should return fan ranking by total score', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.fanScore.findMany.mockResolvedValue(mockFanScoresWithUsers);
      mockPrismaService.fanScore.count.mockResolvedValue(2);

      const result = await service.getFanRanking(mockLounge.id, { sortBy: 'total' });

      expect(result.rankings).toHaveLength(2);
      expect(result.rankings[0].rank).toBe(1);
      expect(result.rankings[1].rank).toBe(2);
      expect(result.totalCount).toBe(2);
    });

    it('should return fan ranking by monthly score', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.fanScore.findMany.mockResolvedValue(mockFanScoresWithUsers);
      mockPrismaService.fanScore.count.mockResolvedValue(2);

      const result = await service.getFanRanking(mockLounge.id, { sortBy: 'monthly' });

      expect(result.rankings).toHaveLength(2);
    });

    it('should include myRanking when currentUserId is provided', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.fanScore.findMany.mockResolvedValue(mockFanScoresWithUsers);
      mockPrismaService.fanScore.count
        .mockResolvedValueOnce(2) // total count
        .mockResolvedValueOnce(0); // my rank (first place)
      mockPrismaService.fanScore.findUnique.mockResolvedValue({
        ...mockFanScore,
        user: mockUser,
      });

      const result = await service.getFanRanking(mockLounge.id, {}, mockUser.id);

      expect(result.myRanking).toBeDefined();
      expect(result.myRanking?.rank).toBe(1);
    });

    it('should throw NotFoundException if lounge does not exist', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(null);

      await expect(service.getFanRanking('non-existent', {})).rejects.toThrow(NotFoundException);
    });

    it('should handle pagination correctly', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.fanScore.findMany.mockResolvedValue([mockFanScoresWithUsers[1]]);
      mockPrismaService.fanScore.count.mockResolvedValue(2);

      const result = await service.getFanRanking(mockLounge.id, { page: 2, limit: 1 });

      expect(result.rankings[0].rank).toBe(2);
      expect(mockPrismaService.fanScore.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          take: 1,
        })
      );
    });
  });

  describe('getUserScore', () => {
    it('should return user score for lounge', async () => {
      mockPrismaService.fanScore.findUnique.mockResolvedValue(mockFanScore);

      const result = await service.getUserScore(mockUser.id, mockLounge.id);

      expect(result).toEqual(mockFanScore);
    });

    it('should return null if score does not exist', async () => {
      mockPrismaService.fanScore.findUnique.mockResolvedValue(null);

      const result = await service.getUserScore(mockUser.id, mockLounge.id);

      expect(result).toBeNull();
    });
  });

  describe('getUserAllScores', () => {
    it('should return all scores for user', async () => {
      const mockScores = [
        { ...mockFanScore, lounge: mockLounge },
        {
          ...mockFanScore,
          id: 'score-2',
          loungeId: 'lounge-2',
          lounge: { ...mockLounge, id: 'lounge-2' },
        },
      ];
      mockPrismaService.fanScore.findMany.mockResolvedValue(mockScores);

      const result = await service.getUserAllScores(mockUser.id);

      expect(result).toHaveLength(2);
    });
  });

  describe('awardBadge', () => {
    it('should award a badge to user', async () => {
      const mockBadge = {
        id: 'badge-1',
        userId: mockUser.id,
        loungeId: mockLounge.id,
        type: BadgeType.TOP_FAN,
        name: '톱 팬',
        description: '월간 최고 기여자',
        awardedAt: new Date(),
      };
      mockPrismaService.fanBadge.upsert.mockResolvedValue(mockBadge);

      const result = await service.awardBadge(mockUser.id, mockLounge.id, BadgeType.TOP_FAN);

      expect(result.type).toBe(BadgeType.TOP_FAN);
    });

    it('should award a global badge (loungeId is null)', async () => {
      const mockBadge = {
        id: 'badge-1',
        userId: mockUser.id,
        loungeId: null,
        type: BadgeType.SUPER_FAN,
        name: '슈퍼팬',
        awardedAt: new Date(),
      };
      mockPrismaService.fanBadge.upsert.mockResolvedValue(mockBadge);

      const result = await service.awardBadge(mockUser.id, null, BadgeType.SUPER_FAN);

      expect(result.loungeId).toBeNull();
    });

    it('should award badge with expiration date', async () => {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const mockBadge = {
        id: 'badge-1',
        userId: mockUser.id,
        loungeId: mockLounge.id,
        type: BadgeType.TOP_FAN,
        expiresAt,
        awardedAt: new Date(),
      };
      mockPrismaService.fanBadge.upsert.mockResolvedValue(mockBadge);

      const result = await service.awardBadge(
        mockUser.id,
        mockLounge.id,
        BadgeType.TOP_FAN,
        expiresAt
      );

      expect(result.expiresAt).toEqual(expiresAt);
    });
  });

  describe('getUserBadges', () => {
    const mockBadges = [
      {
        id: 'badge-1',
        userId: mockUser.id,
        loungeId: mockLounge.id,
        type: BadgeType.TOP_FAN,
        name: '톱 팬',
        awardedAt: new Date(),
      },
      {
        id: 'badge-2',
        userId: mockUser.id,
        loungeId: null,
        type: BadgeType.SUPER_FAN,
        name: '슈퍼팬',
        awardedAt: new Date(),
      },
    ];

    it('should return all user badges', async () => {
      mockPrismaService.fanBadge.findMany.mockResolvedValue(mockBadges);

      const result = await service.getUserBadges(mockUser.id);

      expect(result).toHaveLength(2);
    });

    it('should filter badges by loungeId', async () => {
      mockPrismaService.fanBadge.findMany.mockResolvedValue([mockBadges[0]]);

      const result = await service.getUserBadges(mockUser.id, mockLounge.id);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.fanBadge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUser.id,
          }),
        })
      );
    });
  });

  describe('resetMonthlyScores', () => {
    it('should reset all monthly scores', async () => {
      mockPrismaService.$executeRaw.mockResolvedValue(undefined);
      mockPrismaService.fanScore.updateMany.mockResolvedValue({ count: 100 });

      const result = await service.resetMonthlyScores();

      expect(result).toBe(100);
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
      expect(mockPrismaService.fanScore.updateMany).toHaveBeenCalledWith({
        data: { monthlyScore: 0 },
      });
    });
  });

  describe('updateRankings', () => {
    it('should update rankings for lounge', async () => {
      const mockScores = [{ id: 'score-1' }, { id: 'score-2' }, { id: 'score-3' }];
      mockPrismaService.fanScore.findMany.mockResolvedValue(mockScores);
      mockPrismaService.fanScore.update.mockResolvedValue({});

      await service.updateRankings(mockLounge.id);

      expect(mockPrismaService.fanScore.update).toHaveBeenCalledTimes(3);
      expect(mockPrismaService.fanScore.update).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { id: 'score-1' },
          data: { rank: 1 },
        })
      );
    });
  });

  describe('awardTopFanBadge', () => {
    it('should award TOP_FAN badge to monthly top scorer', async () => {
      const topFanScore = {
        ...mockFanScore,
        monthlyScore: 1000,
      };
      mockPrismaService.fanScore.findFirst.mockResolvedValue(topFanScore);
      mockPrismaService.fanBadge.upsert.mockResolvedValue({
        type: BadgeType.TOP_FAN,
      });

      await service.awardTopFanBadge(mockLounge.id);

      expect(mockPrismaService.fanBadge.upsert).toHaveBeenCalled();
    });

    it('should not award badge if no scores exist', async () => {
      mockPrismaService.fanScore.findFirst.mockResolvedValue(null);

      await service.awardTopFanBadge(mockLounge.id);

      expect(mockPrismaService.fanBadge.upsert).not.toHaveBeenCalled();
    });

    it('should not award badge if top score is 0', async () => {
      mockPrismaService.fanScore.findFirst.mockResolvedValue({
        ...mockFanScore,
        monthlyScore: 0,
      });

      await service.awardTopFanBadge(mockLounge.id);

      expect(mockPrismaService.fanBadge.upsert).not.toHaveBeenCalled();
    });
  });
});
