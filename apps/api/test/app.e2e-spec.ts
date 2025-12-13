/**
 * E2E Tests - 실제 HTTP 요청과 DB를 통한 통합 테스트
 *
 * 이 테스트는 실제 애플리케이션 흐름을 검증합니다:
 * - HTTP 요청 → Controller → Service → Prisma → DB
 * - JWT 인증 플로우
 * - 실제 데이터 생성/조회/수정/삭제
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// 테스트용 환경변수 로드
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  'postgresql://neondb_owner:npg_DmjH7QhvFIY0@ep-lingering-sky-a1duxuoc.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret-for-e2e-testing';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-e2e-testing';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_ROUNDS = '4';

describe('Fandom Lounge E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // 테스트 데이터
  const testUser = {
    email: 'e2e-test@example.com',
    password: 'TestPassword123!',
    nickname: 'E2ETestUser',
  };

  let accessToken: string;
  let refreshToken: string;
  let userId: string;
  let loungeId: string;
  let loungeSlug: string;
  let postId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 실제 앱과 동일한 설정 적용
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    await app.init();

    prisma = app.get(PrismaService);

    // 테스트 전 기존 테스트 데이터 정리
    await cleanupTestData();
  });

  afterAll(async () => {
    // 테스트 후 데이터 정리
    if (prisma) {
      await cleanupTestData();
    }
    if (app) {
      await app.close();
    }
  });

  async function cleanupTestData() {
    if (!prisma) return;

    try {
      // 테스트 유저의 모든 관련 데이터 삭제
      const testUserRecord = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      if (testUserRecord) {
        // 순서대로 삭제 (외래키 제약조건 고려)
        await prisma.vote.deleteMany({ where: { userId: testUserRecord.id } });
        await prisma.comment.deleteMany({ where: { authorId: testUserRecord.id } });
        await prisma.post.deleteMany({ where: { authorId: testUserRecord.id } });
        await prisma.notification.deleteMany({ where: { userId: testUserRecord.id } });
        await prisma.loungeManager.deleteMany({ where: { userId: testUserRecord.id } });
        await prisma.loungeMember.deleteMany({ where: { userId: testUserRecord.id } });
        await prisma.lounge.deleteMany({ where: { creatorId: testUserRecord.id } });
        await prisma.refreshToken.deleteMany({ where: { userId: testUserRecord.id } });
        await prisma.user.delete({ where: { id: testUserRecord.id } });
      }
    } catch {
      // 데이터가 없으면 무시
    }
  }

  describe('Health Check', () => {
    it('GET /api/health - 헬스체크 성공', async () => {
      const response = await request(app.getHttpServer()).get('/api/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status', 'ok');
    });
  });

  describe('Auth Flow - 회원가입 → 로그인 → 토큰 갱신', () => {
    it('POST /api/auth/register - 회원가입 성공', async () => {
      const response = await request(app.getHttpServer()).post('/api/auth/register').send(testUser);

      // 디버깅용 - 실패시 응답 확인
      if (response.status !== 201) {
        console.log('Register failed:', response.status, response.body);
      }

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email', testUser.email);
      expect(response.body.data).toHaveProperty('nickname', testUser.nickname);
      expect(response.body.data).not.toHaveProperty('password'); // 비밀번호 노출 금지

      userId = response.body.data.id;
    });

    it('POST /api/auth/register - 중복 이메일로 가입 실패', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    it('POST /api/auth/login - 로그인 성공', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');

      accessToken = response.body.data.tokens.accessToken;
      refreshToken = response.body.data.tokens.refreshToken;
    });

    it('POST /api/auth/login - 잘못된 비밀번호로 로그인 실패', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('POST /api/auth/refresh - 토큰 갱신 성공', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.user).toHaveProperty('id');

      // 새 토큰으로 업데이트
      accessToken = response.body.data.tokens.accessToken;
      refreshToken = response.body.data.tokens.refreshToken;
    });

    it('GET /api/auth/me - 내 정보 조회', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', userId);
      expect(response.body.data).toHaveProperty('email', testUser.email);
    });

    it('GET /api/auth/me - 토큰 없이 요청 실패', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });
  });

  describe('Lounge - 라운지 생성 및 관리 (인증 필요)', () => {
    const testLounge = {
      name: 'E2E 테스트 라운지',
      description: 'E2E 테스트를 위한 라운지입니다',
    };

    it('POST /api/lounges - 인증 없이 라운지 생성 실패', async () => {
      await request(app.getHttpServer()).post('/api/lounges').send(testLounge).expect(401);
    });

    it('POST /api/lounges - 인증 후 라운지 생성 성공', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/lounges')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testLounge)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name', testLounge.name);
      expect(response.body.data).toHaveProperty('slug');
      expect(response.body.data).toHaveProperty('creatorId', userId);

      loungeId = response.body.data.id;
      loungeSlug = response.body.data.slug;
    });

    it('GET /api/lounges/:slug - 라운지 조회 (공개)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/lounges/${loungeSlug}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', testLounge.name);
    });

    it('GET /api/lounges - 라운지 목록 조회', async () => {
      const response = await request(app.getHttpServer()).get('/api/lounges').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it('GET /api/lounges/my - 내 라운지 목록 조회', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/lounges/my')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Post - 게시글 작성 (인증 + 라운지 멤버십 필요)', () => {
    const testPost = {
      type: 'TEXT',
      title: 'E2E 테스트 게시글',
      content: '이것은 E2E 테스트 게시글입니다.',
    };

    it('POST /api/lounges/:id/posts - 게시글 작성 성공', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/lounges/${loungeId}/posts`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testPost)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('title', testPost.title);
      expect(response.body.data).toHaveProperty('authorId', userId);
      expect(response.body.data).toHaveProperty('loungeId', loungeId);

      postId = response.body.data.id;
    });

    it('GET /api/posts/:id - 게시글 조회', async () => {
      const response = await request(app.getHttpServer()).get(`/api/posts/${postId}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('title', testPost.title);
    });

    it('GET /api/lounges/:id/posts - 라운지 게시글 목록', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/lounges/${loungeId}/posts`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });
  });

  describe('Comment - 댓글 작성', () => {
    const testComment = {
      content: 'E2E 테스트 댓글입니다.',
    };

    it('POST /api/posts/:id/comments - 댓글 작성 성공', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testComment)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('content', testComment.content);
    });

    it('GET /api/posts/:id/comments - 댓글 목록 조회', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/posts/${postId}/comments`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });
  });

  describe('Vote - 투표', () => {
    it('POST /api/posts/:id/vote - 게시글 추천', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/posts/${postId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: 'UPVOTE' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('upvoteCount');
      expect(response.body.data.upvoteCount).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/posts/:id/vote - 같은 투표 재클릭시 취소', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/posts/${postId}/vote`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ type: 'UPVOTE' })
        .expect(201);

      expect(response.body.success).toBe(true);
      // 투표 취소되어 0이 됨
      expect(response.body.data.upvoteCount).toBe(0);
    });
  });

  describe('Notification - 알림', () => {
    it('GET /api/notifications - 알림 목록 조회', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
    });

    it('GET /api/notifications/unread-count - 읽지 않은 알림 개수', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('count');
      expect(typeof response.body.data.count).toBe('number');
    });
  });

  describe('Search - 검색', () => {
    it('GET /api/search - 검색 결과', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: 'E2E' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // 검색 응답은 data.results 안에 lounges, posts가 있음
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data.results).toHaveProperty('lounges');
      expect(response.body.data.results).toHaveProperty('posts');
    });
  });

  describe('Error Handling - 에러 처리', () => {
    it('존재하지 않는 라운지 조회시 404', async () => {
      await request(app.getHttpServer()).get('/api/lounges/non-existent-slug-12345').expect(404);
    });

    it('존재하지 않는 게시글 조회시 404', async () => {
      await request(app.getHttpServer())
        .get('/api/posts/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('잘못된 요청 바디로 400', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'invalid-email' }) // nickname, password 누락
        .expect(400);
    });
  });

  describe('Auth Logout', () => {
    it('POST /api/auth/logout - 로그아웃 성공', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
