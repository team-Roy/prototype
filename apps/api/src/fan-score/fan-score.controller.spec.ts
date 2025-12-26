import { Test, TestingModule } from '@nestjs/testing';
import { FanScoreController } from './fan-score.controller';
import { FanScoreService } from './fan-score.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BadgeType } from '@prisma/client';

describe('FanScoreController', () => {
  let controller: FanScoreController;

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

  const mockFanScoreService = {
    getFanRanking: jest.fn(),
    getOrCreateFanScore: jest.fn(),
    getUserAllScores: jest.fn(),
    getUserScore: jest.fn(),
    getUserBadges: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FanScoreController],
      providers: [
        {
          provide: FanScoreService,
          useValue: mockFanScoreService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FanScoreController>(FanScoreController);

    jest.clearAllMocks();
  });

  describe('getLoungeRanking', () => {
    it('should return lounge ranking', async () => {
      const mockRanking = {
        rankings: [
          {
            rank: 1,
            userId: mockUser.id,
            nickname: mockUser.nickname,
            totalScore: 100,
            monthlyScore: 50,
          },
        ],
        totalCount: 1,
      };
      mockFanScoreService.getFanRanking.mockResolvedValue(mockRanking);

      const result = await controller.getLoungeRanking(
        mockLounge.id,
        { sortBy: 'total' },
        { user: undefined }
      );

      expect(result).toEqual(mockRanking);
      expect(mockFanScoreService.getFanRanking).toHaveBeenCalledWith(
        mockLounge.id,
        { sortBy: 'total' },
        undefined
      );
    });

    it('should include myRanking when user is authenticated', async () => {
      const mockRanking = {
        rankings: [],
        totalCount: 0,
        myRanking: {
          rank: 1,
          userId: mockUser.id,
          nickname: mockUser.nickname,
          totalScore: 100,
          monthlyScore: 50,
        },
      };
      mockFanScoreService.getFanRanking.mockResolvedValue(mockRanking);

      const result = await controller.getLoungeRanking(
        mockLounge.id,
        {},
        { user: { id: mockUser.id } }
      );

      expect(result.myRanking).toBeDefined();
      expect(mockFanScoreService.getFanRanking).toHaveBeenCalledWith(
        mockLounge.id,
        {},
        mockUser.id
      );
    });
  });

  describe('getMyLoungeScore', () => {
    it('should return my score for specific lounge', async () => {
      mockFanScoreService.getOrCreateFanScore.mockResolvedValue(mockFanScore);

      const result = await controller.getMyLoungeScore(mockLounge.id, {
        user: { id: mockUser.id },
      });

      expect(result).toEqual(mockFanScore);
      expect(mockFanScoreService.getOrCreateFanScore).toHaveBeenCalledWith(
        mockUser.id,
        mockLounge.id
      );
    });
  });

  describe('getMyAllScores', () => {
    it('should return all my scores across lounges', async () => {
      const mockScores = [mockFanScore];
      mockFanScoreService.getUserAllScores.mockResolvedValue(mockScores);

      const result = await controller.getMyAllScores({
        user: { id: mockUser.id },
      });

      expect(result).toEqual(mockScores);
      expect(mockFanScoreService.getUserAllScores).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('getUserLoungeScore', () => {
    it('should return specific user score for lounge', async () => {
      mockFanScoreService.getUserScore.mockResolvedValue(mockFanScore);

      const result = await controller.getUserLoungeScore(mockUser.id, mockLounge.id);

      expect(result).toEqual(mockFanScore);
      expect(mockFanScoreService.getUserScore).toHaveBeenCalledWith(mockUser.id, mockLounge.id);
    });

    it('should return null if score does not exist', async () => {
      mockFanScoreService.getUserScore.mockResolvedValue(null);

      const result = await controller.getUserLoungeScore('non-existent', mockLounge.id);

      expect(result).toBeNull();
    });
  });

  describe('getMyBadges', () => {
    const mockBadges = [
      {
        id: 'badge-1',
        userId: mockUser.id,
        loungeId: mockLounge.id,
        type: BadgeType.TOP_FAN,
        name: '톱 팬',
        awardedAt: new Date(),
      },
    ];

    it('should return my badges', async () => {
      mockFanScoreService.getUserBadges.mockResolvedValue(mockBadges);

      const result = await controller.getMyBadges({ user: { id: mockUser.id } });

      expect(result.badges).toEqual(mockBadges);
      expect(result.totalCount).toBe(1);
    });

    it('should filter badges by loungeId', async () => {
      mockFanScoreService.getUserBadges.mockResolvedValue(mockBadges);

      await controller.getMyBadges({ user: { id: mockUser.id } }, mockLounge.id);

      expect(mockFanScoreService.getUserBadges).toHaveBeenCalledWith(mockUser.id, mockLounge.id);
    });
  });

  describe('getUserBadges', () => {
    const mockBadges = [
      {
        id: 'badge-1',
        userId: mockUser.id,
        type: BadgeType.SUPER_FAN,
        name: '슈퍼팬',
        awardedAt: new Date(),
      },
    ];

    it('should return user badges', async () => {
      mockFanScoreService.getUserBadges.mockResolvedValue(mockBadges);

      const result = await controller.getUserBadges(mockUser.id);

      expect(result.badges).toEqual(mockBadges);
      expect(result.totalCount).toBe(1);
    });

    it('should filter by loungeId', async () => {
      mockFanScoreService.getUserBadges.mockResolvedValue([]);

      await controller.getUserBadges(mockUser.id, mockLounge.id);

      expect(mockFanScoreService.getUserBadges).toHaveBeenCalledWith(mockUser.id, mockLounge.id);
    });
  });
});
