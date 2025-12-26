import { Test, TestingModule } from '@nestjs/testing';
import { CreatorPickService } from './creator-pick.service';
import { PrismaService } from '../prisma/prisma.service';
import { FanScoreService } from '../fan-score/fan-score.service';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { UserRole, PostType } from '@prisma/client';

describe('CreatorPickService', () => {
  let service: CreatorPickService;

  const mockUser = {
    id: 'creator-1',
    role: UserRole.CREATOR,
  };

  const mockLounge = {
    id: 'lounge-1',
    creatorId: mockUser.id,
  };

  const mockPost = {
    id: 'post-1',
    loungeId: mockLounge.id,
    authorId: 'author-1',
    title: 'Test Post',
    content: 'Test content',
    type: PostType.TEXT,
    upvoteCount: 10,
    commentCount: 5,
    createdAt: new Date(),
    author: {
      id: 'author-1',
      nickname: 'Author',
      profileImage: null,
    },
  };

  const mockPick = {
    id: 'pick-1',
    loungeId: mockLounge.id,
    postId: mockPost.id,
    pickedBy: mockUser.id,
    comment: '정말 좋은 게시글입니다!',
    createdAt: new Date(),
  };

  const mockPrismaService = {
    lounge: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    loungeManager: {
      findUnique: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
    },
    creatorPick: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockFanScoreService = {
    awardBadge: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorPickService,
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

    service = module.get<CreatorPickService>(CreatorPickService);

    jest.clearAllMocks();
  });

  describe('createPick', () => {
    it('should create a creator pick', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.creatorPick.findUnique.mockResolvedValue(null);
      mockPrismaService.creatorPick.create.mockResolvedValue(mockPick);

      const result = await service.createPick(mockLounge.id, mockUser.id, {
        postId: mockPost.id,
        comment: '정말 좋은 게시글입니다!',
      });

      expect(result).toEqual(mockPick);
      expect(mockFanScoreService.awardBadge).toHaveBeenCalled();
    });

    it('should throw NotFoundException if lounge not found', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(null);

      await expect(
        service.createPick('non-existent', mockUser.id, { postId: mockPost.id })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not creator', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue({
        ...mockLounge,
        creatorId: 'other-user',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: UserRole.USER,
      });
      mockPrismaService.loungeManager.findUnique.mockResolvedValue(null);

      await expect(
        service.createPick(mockLounge.id, mockUser.id, { postId: mockPost.id })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if post not found', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(
        service.createPick(mockLounge.id, mockUser.id, { postId: 'non-existent' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if post is from different lounge', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.post.findUnique.mockResolvedValue({
        ...mockPost,
        loungeId: 'other-lounge',
      });

      await expect(
        service.createPick(mockLounge.id, mockUser.id, { postId: mockPost.id })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if post already picked', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.creatorPick.findUnique.mockResolvedValue(mockPick);

      await expect(
        service.createPick(mockLounge.id, mockUser.id, { postId: mockPost.id })
      ).rejects.toThrow(ConflictException);
    });

    it('should not award badge if author is the creator', async () => {
      const creatorPost = { ...mockPost, authorId: mockUser.id };
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.post.findUnique.mockResolvedValue(creatorPost);
      mockPrismaService.creatorPick.findUnique.mockResolvedValue(null);
      mockPrismaService.creatorPick.create.mockResolvedValue(mockPick);

      await service.createPick(mockLounge.id, mockUser.id, {
        postId: mockPost.id,
      });

      expect(mockFanScoreService.awardBadge).not.toHaveBeenCalled();
    });
  });

  describe('updatePick', () => {
    it('should update pick comment', async () => {
      const updatedPick = { ...mockPick, comment: 'Updated comment' };
      mockPrismaService.creatorPick.findUnique.mockResolvedValue(mockPick);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.creatorPick.update.mockResolvedValue(updatedPick);

      const result = await service.updatePick(mockPick.id, mockUser.id, {
        comment: 'Updated comment',
      });

      expect(result.comment).toBe('Updated comment');
    });

    it('should throw NotFoundException if pick not found', async () => {
      mockPrismaService.creatorPick.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePick('non-existent', mockUser.id, { comment: 'Test' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not picker', async () => {
      mockPrismaService.creatorPick.findUnique.mockResolvedValue(mockPick);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'other-user',
        role: UserRole.USER,
      });

      await expect(
        service.updatePick(mockPick.id, 'other-user', { comment: 'Test' })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deletePick', () => {
    it('should delete pick', async () => {
      mockPrismaService.creatorPick.findUnique.mockResolvedValue(mockPick);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.creatorPick.delete.mockResolvedValue(mockPick);

      await service.deletePick(mockPick.id, mockUser.id);

      expect(mockPrismaService.creatorPick.delete).toHaveBeenCalledWith({
        where: { id: mockPick.id },
      });
    });

    it('should throw NotFoundException if pick not found', async () => {
      mockPrismaService.creatorPick.findUnique.mockResolvedValue(null);

      await expect(service.deletePick('non-existent', mockUser.id)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException if not picker', async () => {
      mockPrismaService.creatorPick.findUnique.mockResolvedValue(mockPick);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'other-user',
        role: UserRole.USER,
      });

      await expect(service.deletePick(mockPick.id, 'other-user')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should allow admin to delete any pick', async () => {
      mockPrismaService.creatorPick.findUnique.mockResolvedValue(mockPick);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'admin-user',
        role: UserRole.ADMIN,
      });
      mockPrismaService.creatorPick.delete.mockResolvedValue(mockPick);

      await service.deletePick(mockPick.id, 'admin-user');

      expect(mockPrismaService.creatorPick.delete).toHaveBeenCalled();
    });
  });

  describe('getPicksByLounge', () => {
    it('should return picks list', async () => {
      mockPrismaService.creatorPick.findMany.mockResolvedValue([{ ...mockPick, post: mockPost }]);
      mockPrismaService.creatorPick.count.mockResolvedValue(1);

      const result = await service.getPicksByLounge(mockLounge.id);

      expect(result.picks).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });

    it('should handle pagination', async () => {
      mockPrismaService.creatorPick.findMany.mockResolvedValue([]);
      mockPrismaService.creatorPick.count.mockResolvedValue(0);

      await service.getPicksByLounge(mockLounge.id, 2, 10);

      expect(mockPrismaService.creatorPick.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });
  });

  describe('getPickByPost', () => {
    it('should return pick for post', async () => {
      mockPrismaService.creatorPick.findUnique.mockResolvedValue(mockPick);

      const result = await service.getPickByPost(mockPost.id);

      expect(result).toEqual(mockPick);
    });

    it('should return null if not picked', async () => {
      mockPrismaService.creatorPick.findUnique.mockResolvedValue(null);

      const result = await service.getPickByPost(mockPost.id);

      expect(result).toBeNull();
    });
  });

  describe('getPick', () => {
    it('should return pick with post details', async () => {
      mockPrismaService.creatorPick.findUnique.mockResolvedValue({
        ...mockPick,
        post: mockPost,
      });

      const result = await service.getPick(mockPick.id);

      expect(result.id).toBe(mockPick.id);
      expect(result.post.id).toBe(mockPost.id);
    });

    it('should throw NotFoundException if pick not found', async () => {
      mockPrismaService.creatorPick.findUnique.mockResolvedValue(null);

      await expect(service.getPick('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
