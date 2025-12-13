import { Test, TestingModule } from '@nestjs/testing';
import { CommentService } from './comment.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CommentSortBy } from './dto';

describe('CommentService', () => {
  let service: CommentService;

  const mockComment = {
    id: 'comment-1',
    postId: 'post-1',
    authorId: 'user-1',
    content: '테스트 댓글입니다.',
    isAnonymous: false,
    parentId: null,
    upvoteCount: 0,
    downvoteCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    author: {
      id: 'user-1',
      nickname: 'testuser',
      profileImage: null,
    },
    replies: [],
  };

  const mockPost = {
    id: 'post-1',
    loungeId: 'lounge-1',
    authorId: 'user-2',
    lounge: {
      id: 'lounge-1',
      managers: [],
    },
    author: {
      id: 'user-2',
      nickname: 'postauthor',
    },
  };

  const mockPrismaService = {
    comment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    loungeBan: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((arr) => Promise.all(arr)),
  };

  const mockNotificationService = {
    createCommentNotification: jest.fn(),
    createReplyNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);

    jest.clearAllMocks();
  });

  describe('getComments', () => {
    it('should return paginated comments', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.comment.findMany.mockResolvedValue([mockComment]);
      mockPrismaService.comment.count.mockResolvedValue(1);

      const result = await service.getComments('post-1', {
        sortBy: CommentSortBy.RECENT,
        page: 1,
        limit: 50,
      });

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should throw NotFoundException when post not found', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(
        service.getComments('nonexistent', { sortBy: CommentSortBy.RECENT })
      ).rejects.toThrow(NotFoundException);
    });

    it('should show deleted content message for deleted comments', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.comment.findMany.mockResolvedValue([
        { ...mockComment, deletedAt: new Date() },
      ]);
      mockPrismaService.comment.count.mockResolvedValue(1);

      const result = await service.getComments('post-1', {
        sortBy: CommentSortBy.RECENT,
      });

      expect(result.items[0].content).toBe('삭제된 댓글입니다');
      expect(result.items[0].isDeleted).toBe(true);
    });
  });

  describe('create', () => {
    const createDto = {
      content: '새 댓글입니다.',
      isAnonymous: false,
    };

    it('should create comment successfully', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.loungeBan.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({ nickname: 'testuser' });
      mockPrismaService.$transaction.mockResolvedValue([
        { ...mockComment, content: createDto.content },
        {},
      ]);

      const result = await service.create('post-1', 'user-1', createDto);

      expect(result.content).toBe(createDto.content);
      expect(mockNotificationService.createCommentNotification).toHaveBeenCalled();
    });

    it('should throw NotFoundException when post not found', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(service.create('nonexistent', 'user-1', createDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when user is banned', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.loungeBan.findUnique.mockResolvedValue({
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(service.create('post-1', 'user-1', createDto)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should create reply successfully', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.loungeBan.findUnique.mockResolvedValue(null);
      mockPrismaService.comment.findUnique.mockResolvedValue({
        ...mockComment,
        authorId: 'user-2',
        author: { id: 'user-2', nickname: 'other' },
      });
      mockPrismaService.user.findUnique.mockResolvedValue({ nickname: 'testuser' });
      mockPrismaService.$transaction.mockResolvedValue([
        { ...mockComment, parentId: 'comment-1', content: createDto.content },
        {},
      ]);

      const result = await service.create('post-1', 'user-1', {
        ...createDto,
        parentId: 'comment-1',
      });

      expect(result.parentId).toBe('comment-1');
      expect(mockNotificationService.createReplyNotification).toHaveBeenCalled();
    });

    it('should throw BadRequestException for nested replies', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.loungeBan.findUnique.mockResolvedValue(null);
      mockPrismaService.comment.findUnique.mockResolvedValue({
        ...mockComment,
        parentId: 'parent-comment',
      });

      await expect(
        service.create('post-1', 'user-1', {
          ...createDto,
          parentId: 'comment-1',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const updateDto = {
      content: '수정된 댓글입니다.',
    };

    it('should update comment successfully', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue(mockComment);
      mockPrismaService.comment.update.mockResolvedValue({
        ...mockComment,
        content: updateDto.content,
      });

      const result = await service.update('comment-1', 'user-1', updateDto);

      expect(result.content).toBe(updateDto.content);
    });

    it('should throw NotFoundException when comment not found', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', 'user-1', updateDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException when comment is deleted', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue({
        ...mockComment,
        deletedAt: new Date(),
      });

      await expect(service.update('comment-1', 'user-1', updateDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw ForbiddenException when not author', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue(mockComment);

      await expect(service.update('comment-1', 'user-2', updateDto)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw BadRequestException for anonymous comment', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue({
        ...mockComment,
        isAnonymous: true,
      });

      await expect(service.update('comment-1', 'user-1', updateDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('delete', () => {
    it('should delete comment as author', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue({
        ...mockComment,
        post: mockPost,
      });
      mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.delete('comment-1', 'user-1');

      expect(result.success).toBe(true);
    });

    it('should delete comment as manager', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue({
        ...mockComment,
        authorId: 'user-2',
        post: {
          ...mockPost,
          lounge: { managers: [{ userId: 'user-1' }] },
        },
      });
      mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.delete('comment-1', 'user-1');

      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when comment not found', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when already deleted', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue({
        ...mockComment,
        deletedAt: new Date(),
        post: mockPost,
      });

      await expect(service.delete('comment-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when not author or manager', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue({
        ...mockComment,
        authorId: 'user-2',
        post: mockPost,
      });

      await expect(service.delete('comment-1', 'user-3')).rejects.toThrow(ForbiddenException);
    });
  });
});
