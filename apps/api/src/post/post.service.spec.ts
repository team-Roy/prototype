import { Test, TestingModule } from '@nestjs/testing';
import { PostService } from './post.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PostType } from '@prisma/client';
import { PostSortBy } from './dto';

describe('PostService', () => {
  let service: PostService;

  const mockPost = {
    id: 'post-1',
    loungeId: 'lounge-1',
    authorId: 'user-1',
    type: PostType.TEXT,
    title: '테스트 게시물',
    content: '테스트 내용입니다.',
    isAnonymous: false,
    isPinned: false,
    isNotice: false,
    viewCount: 0,
    upvoteCount: 0,
    downvoteCount: 0,
    commentCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    author: {
      id: 'user-1',
      nickname: 'testuser',
      profileImage: null,
    },
    tags: [{ tag: 'test' }],
    media: [],
    _count: { comments: 0 },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockPrismaService: any = {
    post: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    postTag: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    lounge: {
      update: jest.fn(),
    },
    loungeMember: {
      findUnique: jest.fn(),
    },
    loungeBan: {
      findUnique: jest.fn(),
    },
    loungeManager: {
      findUnique: jest.fn(),
    },
    vote: {
      findUnique: jest.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: jest.fn((fn: any) => fn(mockPrismaService)),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    exists: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<PostService>(PostService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated posts', async () => {
      mockPrismaService.post.findMany.mockResolvedValue([mockPost]);
      mockPrismaService.post.count.mockResolvedValue(1);

      const result = await service.findAll('lounge-1', {
        sortBy: PostSortBy.RECENT,
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by type', async () => {
      mockPrismaService.post.findMany.mockResolvedValue([mockPost]);
      mockPrismaService.post.count.mockResolvedValue(1);

      await service.findAll('lounge-1', {
        type: PostType.TEXT,
        sortBy: PostSortBy.RECENT,
        page: 1,
        limit: 20,
      });

      expect(mockPrismaService.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: PostType.TEXT,
          }),
        })
      );
    });

    it('should sort by different criteria', async () => {
      mockPrismaService.post.findMany.mockResolvedValue([mockPost]);
      mockPrismaService.post.count.mockResolvedValue(1);

      await service.findAll('lounge-1', {
        sortBy: PostSortBy.POPULAR,
        page: 1,
        limit: 20,
      });

      expect(mockPrismaService.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: expect.arrayContaining([
            { isPinned: 'desc' },
            { isNotice: 'desc' },
            { upvoteCount: 'desc' },
          ]),
        })
      );
    });
  });

  describe('findById', () => {
    it('should return post with user vote info', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({
        ...mockPost,
        lounge: { id: 'lounge-1', name: '테스트', slug: 'test' },
        clipInfo: null,
      });
      mockRedisService.exists.mockResolvedValue(1);
      mockPrismaService.vote.findUnique.mockResolvedValue({ type: 'UPVOTE' });

      const result = await service.findById('post-1', 'user-1', '127.0.0.1');

      expect(result.userVote).toBe('UPVOTE');
    });

    it('should throw NotFoundException when post not found', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should increment view count for new viewer', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({
        ...mockPost,
        lounge: { id: 'lounge-1', name: '테스트', slug: 'test' },
        clipInfo: null,
      });
      mockRedisService.exists.mockResolvedValue(0);
      mockPrismaService.post.update.mockResolvedValue({});

      await service.findById('post-1', 'user-1', '127.0.0.1');

      expect(mockRedisService.set).toHaveBeenCalled();
      expect(mockPrismaService.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { viewCount: { increment: 1 } },
        })
      );
    });
  });

  describe('create', () => {
    const createDto = {
      type: PostType.TEXT,
      title: '새 게시물',
      content: '새 게시물 내용',
      tags: ['tag1', 'tag2'],
    };

    it('should create post successfully', async () => {
      mockPrismaService.loungeMember.findUnique.mockResolvedValue({ userId: 'user-1' });
      mockPrismaService.loungeBan.findUnique.mockResolvedValue(null);
      mockPrismaService.post.create.mockResolvedValue({
        ...mockPost,
        title: createDto.title,
        content: createDto.content,
      });
      mockPrismaService.postTag.createMany.mockResolvedValue({});
      mockPrismaService.lounge.update.mockResolvedValue({});

      const result = await service.create('lounge-1', 'user-1', createDto);

      expect(result.title).toBe(createDto.title);
    });

    it('should throw ForbiddenException when not a member', async () => {
      mockPrismaService.loungeMember.findUnique.mockResolvedValue(null);

      await expect(service.create('lounge-1', 'user-1', createDto)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw ForbiddenException when user is banned', async () => {
      mockPrismaService.loungeMember.findUnique.mockResolvedValue({ userId: 'user-1' });
      mockPrismaService.loungeBan.findUnique.mockResolvedValue({
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(service.create('lounge-1', 'user-1', createDto)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      title: '수정된 제목',
      content: '수정된 내용',
    };

    it('should update post successfully', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.post.update.mockResolvedValue({
        ...mockPost,
        ...updateDto,
      });

      const result = await service.update('post-1', 'user-1', updateDto);

      expect(result.title).toBe(updateDto.title);
    });

    it('should throw NotFoundException when post not found', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', 'user-1', updateDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when not author', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);

      await expect(service.update('post-1', 'user-2', updateDto)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw BadRequestException when updating anonymous post', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({
        ...mockPost,
        isAnonymous: true,
      });

      await expect(service.update('post-1', 'user-1', updateDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('delete', () => {
    it('should delete post as author', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({
        ...mockPost,
        lounge: { managers: [] },
      });
      mockPrismaService.post.update.mockResolvedValue({});
      mockPrismaService.lounge.update.mockResolvedValue({});

      const result = await service.delete('post-1', 'user-1');

      expect(result.message).toContain('삭제되었습니다');
    });

    it('should delete post as manager', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({
        ...mockPost,
        authorId: 'user-2',
        lounge: { managers: [{ userId: 'user-1' }] },
      });
      mockPrismaService.post.update.mockResolvedValue({});
      mockPrismaService.lounge.update.mockResolvedValue({});

      const result = await service.delete('post-1', 'user-1');

      expect(result.message).toContain('삭제되었습니다');
    });

    it('should throw ForbiddenException when not author or manager', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({
        ...mockPost,
        lounge: { managers: [] },
      });

      await expect(service.delete('post-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('pin', () => {
    it('should toggle pin status', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({
        ...mockPost,
        lounge: { managers: [{ userId: 'user-1' }] },
      });
      mockPrismaService.post.update.mockResolvedValue({});

      const result = await service.pin('post-1', 'user-1');

      expect(result.message).toContain('고정');
    });

    it('should throw ForbiddenException when not manager', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({
        ...mockPost,
        lounge: { managers: [] },
      });

      await expect(service.pin('post-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('setNotice', () => {
    it('should toggle notice status', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({
        ...mockPost,
        lounge: { managers: [{ userId: 'user-1' }] },
      });
      mockPrismaService.post.update.mockResolvedValue({});

      const result = await service.setNotice('post-1', 'user-1');

      expect(result.message).toContain('공지');
    });
  });
});
