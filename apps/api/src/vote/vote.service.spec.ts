import { Test, TestingModule } from '@nestjs/testing';
import { VoteService } from './vote.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotFoundException } from '@nestjs/common';
import { VoteType } from '@prisma/client';
import { VoteTypeEnum } from './dto';

describe('VoteService', () => {
  let service: VoteService;

  const mockPost = {
    id: 'post-1',
    authorId: 'user-2',
    upvoteCount: 5,
    downvoteCount: 2,
  };

  const mockComment = {
    id: 'comment-1',
    authorId: 'user-2',
    upvoteCount: 3,
    downvoteCount: 1,
  };

  const mockPrismaService = {
    post: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    comment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    vote: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((arr) => Promise.all(arr)),
  };

  const mockNotificationService = {
    createVoteNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoteService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<VoteService>(VoteService);

    jest.clearAllMocks();
  });

  describe('votePost', () => {
    it('should create new upvote', async () => {
      mockPrismaService.post.findUnique
        .mockResolvedValueOnce(mockPost)
        .mockResolvedValueOnce({ upvoteCount: 6, downvoteCount: 2 });
      mockPrismaService.vote.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ type: VoteType.UPVOTE });
      mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.votePost('post-1', 'user-1', VoteTypeEnum.UPVOTE);

      expect(result.upvoteCount).toBe(6);
      expect(result.userVote).toBe(VoteType.UPVOTE);
      expect(mockNotificationService.createVoteNotification).toHaveBeenCalled();
    });

    it('should create new downvote', async () => {
      mockPrismaService.post.findUnique
        .mockResolvedValueOnce(mockPost)
        .mockResolvedValueOnce({ upvoteCount: 5, downvoteCount: 3 });
      mockPrismaService.vote.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ type: VoteType.DOWNVOTE });
      mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.votePost('post-1', 'user-1', VoteTypeEnum.DOWNVOTE);

      expect(result.downvoteCount).toBe(3);
      expect(result.userVote).toBe(VoteType.DOWNVOTE);
    });

    it('should toggle off existing same type vote', async () => {
      mockPrismaService.post.findUnique
        .mockResolvedValueOnce(mockPost)
        .mockResolvedValueOnce({ upvoteCount: 4, downvoteCount: 2 });
      mockPrismaService.vote.findFirst
        .mockResolvedValueOnce({ id: 'vote-1', type: VoteType.UPVOTE })
        .mockResolvedValueOnce(null);
      mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.votePost('post-1', 'user-1', VoteTypeEnum.UPVOTE);

      expect(result.upvoteCount).toBe(4);
      expect(result.userVote).toBeNull();
    });

    it('should change vote type', async () => {
      mockPrismaService.post.findUnique
        .mockResolvedValueOnce(mockPost)
        .mockResolvedValueOnce({ upvoteCount: 4, downvoteCount: 3 });
      mockPrismaService.vote.findFirst
        .mockResolvedValueOnce({ id: 'vote-1', type: VoteType.UPVOTE })
        .mockResolvedValueOnce({ type: VoteType.DOWNVOTE });
      mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.votePost('post-1', 'user-1', VoteTypeEnum.DOWNVOTE);

      expect(result.upvoteCount).toBe(4);
      expect(result.downvoteCount).toBe(3);
      expect(result.userVote).toBe(VoteType.DOWNVOTE);
    });

    it('should throw NotFoundException when post not found', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(service.votePost('nonexistent', 'user-1', VoteTypeEnum.UPVOTE)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('voteComment', () => {
    it('should create new upvote on comment', async () => {
      mockPrismaService.comment.findUnique
        .mockResolvedValueOnce(mockComment)
        .mockResolvedValueOnce({ upvoteCount: 4, downvoteCount: 1 });
      mockPrismaService.vote.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ type: VoteType.UPVOTE });
      mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.voteComment('comment-1', 'user-1', VoteTypeEnum.UPVOTE);

      expect(result.upvoteCount).toBe(4);
      expect(result.userVote).toBe(VoteType.UPVOTE);
    });

    it('should throw NotFoundException when comment not found', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue(null);

      await expect(
        service.voteComment('nonexistent', 'user-1', VoteTypeEnum.UPVOTE)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPostVoteStatus', () => {
    it('should return vote status with user vote', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({
        upvoteCount: 10,
        downvoteCount: 2,
      });
      mockPrismaService.vote.findFirst.mockResolvedValue({ type: VoteType.UPVOTE });

      const result = await service.getPostVoteStatus('post-1', 'user-1');

      expect(result.upvoteCount).toBe(10);
      expect(result.downvoteCount).toBe(2);
      expect(result.userVote).toBe(VoteType.UPVOTE);
    });

    it('should return null userVote when not voted', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({
        upvoteCount: 10,
        downvoteCount: 2,
      });
      mockPrismaService.vote.findFirst.mockResolvedValue(null);

      const result = await service.getPostVoteStatus('post-1', 'user-1');

      expect(result.userVote).toBeNull();
    });

    it('should throw NotFoundException when post not found', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(service.getPostVoteStatus('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getCommentVoteStatus', () => {
    it('should return vote status with user vote', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue({
        upvoteCount: 5,
        downvoteCount: 1,
      });
      mockPrismaService.vote.findFirst.mockResolvedValue({ type: VoteType.DOWNVOTE });

      const result = await service.getCommentVoteStatus('comment-1', 'user-1');

      expect(result.upvoteCount).toBe(5);
      expect(result.downvoteCount).toBe(1);
      expect(result.userVote).toBe(VoteType.DOWNVOTE);
    });

    it('should throw NotFoundException when comment not found', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue(null);

      await expect(service.getCommentVoteStatus('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
