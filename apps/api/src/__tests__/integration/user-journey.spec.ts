/**
 * User Journey Integration Tests
 *
 * 이 테스트는 실제 사용자 시나리오를 시뮬레이션합니다:
 * 1. 회원가입 -> 로그인
 * 2. 라운지 생성 -> 게시글 작성
 * 3. 다른 사용자의 상호작용 (댓글, 투표)
 * 4. 알림 수신 및 확인
 * 5. 빈 데이터 케이스 처리
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../auth/auth.service';
import { UserService } from '../../user/user.service';
import { LoungeService } from '../../lounge/lounge.service';
import { PostService } from '../../post/post.service';
import { CommentService } from '../../comment/comment.service';
import { VoteService } from '../../vote/vote.service';
import { NotificationService } from '../../notification/notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { EmailService } from '../../email/email.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole, AuthProvider, PostType } from '@prisma/client';
import { VoteTypeEnum } from '../../vote/dto';
import { LoungeSortBy } from '../../lounge/dto/lounge-list-query.dto';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('User Journey Integration Tests', () => {
  // Mock Data
  const mockUsers = {
    user1: {
      id: 'user-1',
      email: 'user1@example.com',
      password: '$2b$12$hashedPassword1',
      nickname: 'User1',
      profileImage: null,
      bio: null,
      role: UserRole.USER,
      provider: AuthProvider.LOCAL,
      providerId: null,
      isActive: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    user2: {
      id: 'user-2',
      email: 'user2@example.com',
      password: '$2b$12$hashedPassword2',
      nickname: 'User2',
      profileImage: null,
      bio: null,
      role: UserRole.USER,
      provider: AuthProvider.LOCAL,
      providerId: null,
      isActive: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  };

  const mockLounge = {
    id: 'lounge-1',
    name: '테스트 라운지',
    slug: 'test-lounge',
    description: '테스트 라운지입니다',
    coverImage: null,
    icon: null,
    isOfficial: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    _count: { members: 1, posts: 0 },
  };

  const mockPost = {
    id: 'post-1',
    title: '첫 번째 게시글',
    content: '게시글 내용입니다',
    authorId: 'user-1',
    loungeId: 'lounge-1',
    isAnonymous: false,
    isPinned: false,
    viewCount: 0,
    upvoteCount: 0,
    downvoteCount: 0,
    commentCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockComment = {
    id: 'comment-1',
    content: '댓글 내용입니다',
    postId: 'post-1',
    authorId: 'user-2',
    parentId: null,
    isAnonymous: false,
    upvoteCount: 0,
    downvoteCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  // Mock Services
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    emailVerificationToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    lounge: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    loungeMember: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    loungeManager: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    loungeBan: {
      findUnique: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    postTag: {
      createMany: jest.fn(),
    },
    comment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    vote: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((operations: unknown[] | ((tx: unknown) => unknown)) => {
      if (Array.isArray(operations)) {
        return Promise.all(operations);
      }
      return (operations as (tx: unknown) => unknown)(mockPrismaService);
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn().mockReturnValue({ sub: 'user-1' }),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string | number> = {
        BCRYPT_ROUNDS: 12,
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_REFRESH_EXPIRES_IN: '7d',
        JWT_ACCESS_EXPIRES_IN: '15m',
      };
      return config[key];
    }),
  };

  const mockEmailService = {
    sendEmailVerification: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  };

  let authService: AuthService;
  let loungeService: LoungeService;
  let postService: PostService;
  let commentService: CommentService;
  let voteService: VoteService;
  let notificationService: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UserService,
        LoungeService,
        PostService,
        CommentService,
        VoteService,
        NotificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    loungeService = module.get<LoungeService>(LoungeService);
    postService = module.get<PostService>(PostService);
    commentService = module.get<CommentService>(CommentService);
    voteService = module.get<VoteService>(VoteService);
    notificationService = module.get<NotificationService>(NotificationService);

    jest.clearAllMocks();
  });

  describe('Scenario 1: 회원가입 및 로그인 흐름', () => {
    it('신규 사용자가 회원가입 후 로그인할 수 있어야 함', async () => {
      // 회원가입 - 이메일/닉네임 중복 체크
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // email not exists
        .mockResolvedValueOnce(null); // nickname not exists

      mockPrismaService.user.create.mockResolvedValue(mockUsers.user1);

      const registerResult = await authService.register({
        email: 'user1@example.com',
        password: 'password123',
        nickname: 'User1',
      });

      expect(registerResult.email).toBe('user1@example.com');
      expect(mockPrismaService.user.create).toHaveBeenCalled();

      // 로그인
      mockPrismaService.user.findUnique.mockResolvedValue(mockUsers.user1);
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'token-1',
        token: 'refresh-token',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      // bcrypt.compare를 mock
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const loginResult = await authService.login({
        email: 'user1@example.com',
        password: 'password123',
      });

      expect(loginResult.user.id).toBe('user-1');
      expect(loginResult.tokens.accessToken).toBeDefined();
    });

    it('이미 존재하는 이메일로 가입 시도 시 에러 발생', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUsers.user1);

      await expect(
        authService.register({
          email: 'user1@example.com',
          password: 'password123',
          nickname: 'NewUser',
        })
      ).rejects.toThrow();
    });

    it('잘못된 비밀번호로 로그인 시도 시 에러 발생', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUsers.user1);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'user1@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow();
    });
  });

  describe('Scenario 2: 라운지 생성 및 게시글 작성', () => {
    it('로그인한 사용자가 라운지를 생성할 수 있어야 함', async () => {
      mockPrismaService.lounge.findFirst.mockResolvedValue(null); // slug not exists
      mockPrismaService.lounge.create.mockResolvedValue(mockLounge);
      mockPrismaService.loungeManager.create.mockResolvedValue({
        userId: 'user-1',
        loungeId: 'lounge-1',
        role: 'OWNER',
      });
      mockPrismaService.loungeMember.create.mockResolvedValue({
        userId: 'user-1',
        loungeId: 'lounge-1',
      });

      const result = await loungeService.create('user-1', {
        name: '테스트 라운지',
        slug: 'test-lounge',
        description: '테스트 라운지입니다',
      });

      expect(result.name).toBe('테스트 라운지');
      expect(result.slug).toBe('test-lounge');
    });

    it('라운지 내에 게시글을 작성할 수 있어야 함', async () => {
      mockPrismaService.loungeMember.findUnique.mockResolvedValue({
        userId: 'user-1',
        loungeId: 'lounge-1',
      });
      mockPrismaService.loungeBan.findUnique.mockResolvedValue(null);
      mockPrismaService.post.create.mockResolvedValue({
        ...mockPost,
        author: mockUsers.user1,
        lounge: mockLounge,
      });

      const result = await postService.create('lounge-1', 'user-1', {
        type: PostType.TEXT,
        title: '첫 번째 게시글',
        content: '게시글 내용입니다',
      });

      expect(result.title).toBe('첫 번째 게시글');
    });

    it('라운지 멤버가 아닌 사용자는 게시글 작성 불가', async () => {
      mockPrismaService.loungeMember.findUnique.mockResolvedValue(null);

      await expect(
        postService.create('lounge-1', 'user-2', {
          type: PostType.TEXT,
          title: '게시글',
          content: '내용',
        })
      ).rejects.toThrow();
    });
  });

  describe('Scenario 3: 다른 사용자의 상호작용', () => {
    it('다른 사용자가 게시글에 댓글을 달 수 있어야 함', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({
        ...mockPost,
        author: mockUsers.user1,
        lounge: mockLounge,
      });
      mockPrismaService.loungeBan.findUnique.mockResolvedValue(null);
      mockPrismaService.comment.create.mockResolvedValue({
        ...mockComment,
        author: mockUsers.user2,
      });
      mockPrismaService.post.update.mockResolvedValue({
        ...mockPost,
        commentCount: 1,
      });
      mockPrismaService.notification.create.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        type: 'COMMENT',
        message: 'User2님이 댓글을 남겼습니다',
      });

      const result = await commentService.create('post-1', 'user-2', {
        content: '댓글 내용입니다',
      });

      expect(result.content).toBe('댓글 내용입니다');
    });

    it('다른 사용자가 게시글에 추천을 할 수 있어야 함', async () => {
      // 첫 번째 findUnique: 게시글 존재 확인, 두 번째: getPostVoteStatus에서 업데이트된 카운트 조회
      mockPrismaService.post.findUnique
        .mockResolvedValueOnce({
          ...mockPost,
          author: mockUsers.user1,
          upvoteCount: 0,
        })
        .mockResolvedValueOnce({
          upvoteCount: 1,
          downvoteCount: 0,
        });
      mockPrismaService.vote.findFirst
        .mockResolvedValueOnce(null) // 기존 투표 없음
        .mockResolvedValueOnce({ type: 'UPVOTE' }); // getPostVoteStatus에서 유저 투표 조회
      mockPrismaService.vote.create.mockResolvedValue({
        id: 'vote-1',
        userId: 'user-2',
        postId: 'post-1',
        commentId: null,
        type: 'UPVOTE',
      });
      mockPrismaService.post.update.mockResolvedValue({
        ...mockPost,
        upvoteCount: 1,
      });

      const result = await voteService.votePost('post-1', 'user-2', VoteTypeEnum.UPVOTE);

      expect(result.upvoteCount).toBe(1);
    });
  });

  describe('Scenario 4: 알림 시스템', () => {
    it('댓글 알림을 받고 확인할 수 있어야 함', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'COMMENT',
          message: 'User2님이 댓글을 남겼습니다',
          referenceId: 'post-1',
          referenceType: 'post',
          isRead: false,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.notification.findMany.mockResolvedValue(mockNotifications);
      mockPrismaService.notification.count.mockResolvedValue(1);

      const result = await notificationService.findAll('user-1', { page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('COMMENT');
      expect(result.items[0].isRead).toBe(false);
    });

    it('읽지 않은 알림 개수를 조회할 수 있어야 함', async () => {
      mockPrismaService.notification.count.mockResolvedValue(5);

      const count = await notificationService.getUnreadCount('user-1');

      expect(count).toBe(5);
    });

    it('알림을 읽음 처리할 수 있어야 함', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 1 });

      const result = await notificationService.markAsRead('notif-1', 'user-1');

      expect(result.count).toBe(1);
    });

    it('모든 알림을 읽음 처리할 수 있어야 함', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await notificationService.markAllAsRead('user-1');

      expect(result.count).toBe(5);
    });
  });

  describe('Scenario 5: 빈 데이터 케이스', () => {
    it('라운지가 없을 때 빈 목록 반환', async () => {
      mockPrismaService.lounge.findMany.mockResolvedValue([]);
      mockPrismaService.lounge.count.mockResolvedValue(0);

      const result = await loungeService.findAll({
        page: 1,
        limit: 20,
        sortBy: LoungeSortBy.POPULAR,
      });

      expect(result.items).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('게시글이 없을 때 빈 목록 반환', async () => {
      mockPrismaService.post.findMany.mockResolvedValue([]);
      mockPrismaService.post.count.mockResolvedValue(0);

      const result = await postService.findAll('lounge-1', { page: 1, limit: 20 });

      expect(result.items).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('댓글이 없을 때 빈 목록 반환', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.comment.findMany.mockResolvedValue([]);
      mockPrismaService.comment.count.mockResolvedValue(0);

      const result = await commentService.getComments('post-1', { page: 1, limit: 20 });

      expect(result.items).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('알림이 없을 때 빈 목록 반환', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.notification.count.mockResolvedValue(0);

      const result = await notificationService.findAll('user-1', { page: 1, limit: 20 });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('읽지 않은 알림이 없을 때 0 반환', async () => {
      mockPrismaService.notification.count.mockResolvedValue(0);

      const count = await notificationService.getUnreadCount('user-1');

      expect(count).toBe(0);
    });
  });

  describe('Scenario 6: 에러 핸들링', () => {
    it('존재하지 않는 라운지에 가입 시도 시 에러', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(null);

      await expect(loungeService.join('user-1', 'non-existent-lounge')).rejects.toThrow();
    });

    it('존재하지 않는 게시글 조회 시 에러', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(postService.findById('non-existent-post')).rejects.toThrow();
    });

    it('이미 가입한 라운지에 재가입 시도 시 에러', async () => {
      mockPrismaService.lounge.findUnique.mockResolvedValue(mockLounge);
      mockPrismaService.loungeMember.findUnique.mockResolvedValue({
        userId: 'user-1',
        loungeId: 'lounge-1',
      });

      await expect(loungeService.join('user-1', 'lounge-1')).rejects.toThrow();
    });

    it('본인이 아닌 사용자의 게시글 삭제 시도 시 에러', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({
        ...mockPost,
        authorId: 'user-1',
        lounge: mockLounge,
      });
      mockPrismaService.loungeManager.findFirst.mockResolvedValue(null);

      await expect(postService.delete('user-2', 'post-1')).rejects.toThrow();
    });
  });

  describe('Scenario 7: 투표 상태 변경', () => {
    it('추천 후 비추천으로 변경 가능', async () => {
      mockPrismaService.post.findUnique
        .mockResolvedValueOnce({
          ...mockPost,
          authorId: 'user-1',
          upvoteCount: 1,
          downvoteCount: 0,
        })
        .mockResolvedValueOnce({
          ...mockPost,
          authorId: 'user-1',
          upvoteCount: 0,
          downvoteCount: 1,
        });

      // 기존 추천 투표 존재
      mockPrismaService.vote.findFirst
        .mockResolvedValueOnce({
          id: 'vote-1',
          userId: 'user-2',
          postId: 'post-1',
          type: 'UPVOTE',
        })
        .mockResolvedValueOnce({
          id: 'vote-1',
          userId: 'user-2',
          postId: 'post-1',
          type: 'DOWNVOTE',
        });

      mockPrismaService.vote.update.mockResolvedValue({
        id: 'vote-1',
        userId: 'user-2',
        postId: 'post-1',
        type: 'DOWNVOTE',
      });

      mockPrismaService.post.update.mockResolvedValue({
        ...mockPost,
        upvoteCount: 0,
        downvoteCount: 1,
      });

      const result = await voteService.votePost('post-1', 'user-2', VoteTypeEnum.DOWNVOTE);

      expect(result.downvoteCount).toBe(1);
    });

    it('같은 투표 다시 클릭 시 취소', async () => {
      mockPrismaService.post.findUnique
        .mockResolvedValueOnce({
          ...mockPost,
          authorId: 'user-1',
          upvoteCount: 1,
        })
        .mockResolvedValueOnce({
          ...mockPost,
          authorId: 'user-1',
          upvoteCount: 0,
        });

      mockPrismaService.vote.findFirst
        .mockResolvedValueOnce({
          id: 'vote-1',
          userId: 'user-2',
          postId: 'post-1',
          type: 'UPVOTE',
        })
        .mockResolvedValueOnce(null);

      mockPrismaService.vote.delete.mockResolvedValue({
        id: 'vote-1',
      });

      mockPrismaService.post.update.mockResolvedValue({
        ...mockPost,
        upvoteCount: 0,
      });

      const result = await voteService.votePost('post-1', 'user-2', VoteTypeEnum.UPVOTE);

      expect(result.upvoteCount).toBe(0);
    });
  });

  describe('Scenario 8: 인기 라운지 및 검색', () => {
    it('인기 라운지 목록 조회', async () => {
      const popularLounges = [
        { ...mockLounge, _count: { members: 100, posts: 50 } },
        { ...mockLounge, id: 'lounge-2', name: '인기 라운지', _count: { members: 80, posts: 40 } },
      ];

      mockPrismaService.lounge.findMany.mockResolvedValue(popularLounges);

      const result = await loungeService.findPopular(5);

      expect(result).toHaveLength(2);
    });

    it('라운지 검색 기능', async () => {
      mockPrismaService.lounge.findMany.mockResolvedValue([mockLounge]);
      mockPrismaService.lounge.count.mockResolvedValue(1);

      const result = await loungeService.findAll({
        page: 1,
        limit: 20,
        sortBy: LoungeSortBy.POPULAR,
        q: '테스트',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toContain('테스트');
    });
  });

  describe('Scenario 9: API 응답 형식 검증', () => {
    it('라운지 목록 응답에 필수 필드가 포함되어야 함', async () => {
      mockPrismaService.lounge.findMany.mockResolvedValue([
        {
          ...mockLounge,
          _count: { members: 10, posts: 5 },
        },
      ]);
      mockPrismaService.lounge.count.mockResolvedValue(1);

      const result = await loungeService.findAll({
        page: 1,
        limit: 20,
        sortBy: LoungeSortBy.POPULAR,
      });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('total');
      expect(result.meta).toHaveProperty('page');
      expect(result.meta).toHaveProperty('limit');
      expect(result.meta).toHaveProperty('totalPages');

      if (result.items.length > 0) {
        expect(result.items[0]).toHaveProperty('id');
        expect(result.items[0]).toHaveProperty('name');
        expect(result.items[0]).toHaveProperty('slug');
      }
    });

    it('알림 목록 응답에 필수 필드가 포함되어야 함', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'COMMENT',
          message: '새 댓글이 있습니다',
          referenceId: 'post-1',
          referenceType: 'post',
          isRead: false,
          createdAt: new Date(),
        },
      ]);
      mockPrismaService.notification.count.mockResolvedValue(1);

      const result = await notificationService.findAll('user-1', { page: 1, limit: 20 });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');

      if (result.items.length > 0) {
        expect(result.items[0]).toHaveProperty('id');
        expect(result.items[0]).toHaveProperty('type');
        expect(result.items[0]).toHaveProperty('message');
        expect(result.items[0]).toHaveProperty('isRead');
      }
    });
  });
});
