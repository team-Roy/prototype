# Claude Code Rules - 팬덤 플랫폼 프로젝트

> 이 파일을 프로젝트 루트의 `.claude/rules.md`에 배치하세요.

## 프로젝트 개요

- **프로젝트명**: 팬덤 라운지 (Fandom Lounge)
- **목적**: 소규모 버튜버/크리에이터 팬덤 커뮤니티 플랫폼
- **개발자**: 1인 개발 (Roy)
- **목표 사용자**: 1,000명+ 동시 접속 대응

---

## 기술 스택 (반드시 준수)

### Frontend

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **State**: Zustand (클라이언트), TanStack Query (서버)
- **Forms**: React Hook Form + Zod
- **UI Components**: shadcn/ui 기반 커스텀

### Backend

- **Framework**: NestJS
- **Language**: TypeScript (strict mode)
- **ORM**: Prisma
- **Database**: PostgreSQL (AWS RDS)
- **Cache**: Redis (AWS ElastiCache Valkey) - fallback 모드 사용 중
- **Storage**: AWS S3
- **Auth**: JWT + Refresh Token

### 공통

- **Package Manager**: pnpm
- **Monorepo**: Turborepo
- **Validation**: Zod (프론트/백 공유)

---

## 코딩 컨벤션

### 네이밍

```
// 파일명
components/        → PascalCase.tsx (PostCard.tsx)
hooks/            → camelCase.ts (useAuth.ts)
utils/            → camelCase.ts (formatDate.ts)
API endpoints     → kebab-case (/api/lounges/:id/posts)

// 변수/함수
변수              → camelCase
상수              → UPPER_SNAKE_CASE
컴포넌트          → PascalCase
타입/인터페이스    → PascalCase (접두사 I 사용 안함)
Enum             → PascalCase (값은 UPPER_SNAKE_CASE)
```

### TypeScript

```typescript
// ✅ 좋은 예
interface User {
  id: string;
  email: string;
  nickname: string;
  createdAt: Date;
}

// ❌ 나쁜 예
interface IUser { ... }  // I 접두사 사용 금지
type user = { ... }      // 소문자 금지
```

### 컴포넌트 구조

```typescript
// 순서: imports → types → component → exports

// 1. External imports
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal imports
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

// 3. Types
interface Props {
  loungeId: string;
  onSuccess?: () => void;
}

// 4. Component
export function PostForm({ loungeId, onSuccess }: Props) {
  // hooks first
  const { user } = useAuth();
  const [content, setContent] = useState('');

  // handlers
  const handleSubmit = async () => { ... };

  // render
  return ( ... );
}
```

### API Response 형식

```typescript
// 성공 응답
{
  success: true,
  data: { ... },
  meta?: {
    page: number;
    limit: number;
    total: number;
  }
}

// 에러 응답
{
  success: false,
  error: {
    code: string;      // "LOUNGE_NOT_FOUND"
    message: string;   // 사용자에게 표시할 메시지
  }
}
```

---

## 디렉토리 구조 규칙

### Frontend (apps/web)

```
app/
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── layout.tsx
├── (main)/
│   ├── page.tsx                    # 홈 (라운지 목록)
│   ├── lounge/
│   │   ├── [id]/
│   │   │   ├── page.tsx           # 라운지 메인
│   │   │   └── settings/page.tsx  # 라운지 설정
│   │   └── create/page.tsx        # 라운지 생성
│   ├── post/
│   │   └── [id]/page.tsx          # 게시물 상세
│   └── layout.tsx
└── layout.tsx                      # 루트 레이아웃

components/
├── ui/                # shadcn/ui 기반 원자 컴포넌트
├── features/          # 기능별 컴포넌트
│   ├── lounge/
│   ├── post/
│   └── comment/
├── layouts/           # 레이아웃 컴포넌트
└── shared/            # 공용 컴포넌트
```

### Backend (apps/api)

```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   └── guards/
├── user/
├── lounge/
├── post/
├── comment/
├── media/
├── notification/
└── common/
    ├── decorators/
    ├── filters/
    ├── interceptors/
    └── pipes/
```

---

## 데이터베이스 규칙

### Prisma Schema 컨벤션

```prisma
// 모델명: PascalCase, 단수형
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  nickname  String

  // 관계 필드는 모델 아래에
  posts     Post[]
  comments  Comment[]

  // 시간 필드는 마지막에
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?  // Soft delete

  @@map("users")  // 테이블명은 snake_case, 복수형
}

// 중간 테이블
model LoungeManager {
  userId    String
  loungeId  String
  role      ManagerRole @default(MANAGER)

  user      User    @relation(fields: [userId], references: [id])
  lounge    Lounge  @relation(fields: [loungeId], references: [id])

  @@id([userId, loungeId])
  @@map("lounge_managers")
}
```

### 인덱스 규칙

```prisma
// 자주 조회되는 필드에 인덱스
@@index([loungeId, createdAt(sort: Desc)])  // 복합 인덱스
@@index([authorId])                          // FK 인덱스
```

---

## API 설계 규칙

### RESTful 엔드포인트

```
GET    /lounges              # 라운지 목록
POST   /lounges              # 라운지 생성
GET    /lounges/:id          # 라운지 상세
PATCH  /lounges/:id          # 라운지 수정
DELETE /lounges/:id          # 라운지 삭제

GET    /lounges/:id/posts    # 라운지의 게시물 목록
POST   /lounges/:id/posts    # 게시물 작성

GET    /posts/:id            # 게시물 상세
PATCH  /posts/:id            # 게시물 수정
DELETE /posts/:id            # 게시물 삭제
POST   /posts/:id/vote       # 추천/비추천
```

### Pagination

```typescript
// Query Parameters
?page=1&limit=20&sort=createdAt&order=desc

// Response
{
  data: [...],
  meta: {
    page: 1,
    limit: 20,
    total: 150,
    totalPages: 8
  }
}
```

---

## 보안 규칙

### 필수 보안 사항

1. **인증**: JWT Access Token (15분) + Refresh Token (7일)
2. **비밀번호**: bcrypt (rounds: 12)
3. **Rate Limiting**:
   - 일반 API: 100 req/min
   - 로그인: 5 req/min
   - 글쓰기: 10 req/min
4. **Input Validation**: 모든 입력에 Zod 검증
5. **XSS**: DOMPurify로 HTML sanitize
6. **CORS**: 허용된 도메인만

### 민감 데이터

```typescript
// 응답에서 제외할 필드
const userSelect = {
  id: true,
  email: true,
  nickname: true,
  // password: false (기본 제외)
};
```

---

## 성능 최적화 규칙

### Frontend

1. **이미지**: next/image 필수 사용, WebP 변환
2. **코드 분할**: dynamic import 활용
3. **캐싱**: TanStack Query staleTime 설정
4. **번들**: 불필요한 라이브러리 제거

### Backend

1. **DB 쿼리**: N+1 방지 (include/select 사용)
2. **Redis 캐싱**:
   - 라운지 정보: 5분
   - 인기 게시물: 1분
   - 유저 세션: 7일
3. **Pagination**: 필수 (기본 20개)

---

## 테스트 규칙

### 필수 테스트

```typescript
// API는 최소한 Happy Path 테스트
describe('POST /lounges', () => {
  it('should create a lounge', async () => { ... });
  it('should fail without auth', async () => { ... });
  it('should validate input', async () => { ... });
});
```

---

## Git 컨벤션

### 브랜치

```
main           # 프로덕션
develop        # 개발 통합
feature/*      # 기능 개발
fix/*          # 버그 수정
```

### 커밋 메시지

```
feat: 라운지 생성 기능 추가
fix: 게시물 삭제 권한 버그 수정
refactor: PostService 리팩토링
docs: API 문서 업데이트
chore: 의존성 업데이트
```

---

## Claude Code 작업 시 주의사항

### 항상 해야 할 것

1. 기존 코드 스타일과 일관성 유지
2. TypeScript strict 모드 준수
3. 에러 핸들링 포함
4. 주석은 "왜"에 집중 (무엇은 코드가 설명)
5. 한 파일 = 한 책임

### 하지 말아야 할 것

1. any 타입 사용 금지 (불가피하면 주석 필수)
2. console.log 남기지 않기 (logger 사용)
3. 하드코딩된 값 (환경변수/상수로)
4. 테스트 없이 복잡한 로직 작성

### 태스크 완료 기준

1. 컴파일 에러 없음
2. 린트 에러 없음
3. 기존 테스트 통과
4. 새 기능에 대한 기본 테스트 작성

---

## 환경 변수

### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=https://api.fandom-lounge.com
```

### Backend (.env) - EC2 서버

```
# App
NODE_ENV=production
PORT=3001
APP_URL=https://fandom-lounge.vercel.app
API_URL=https://api.fandom-lounge.com

# Database (AWS RDS)
DATABASE_URL=postgresql://postgres:***@fandom-lounge-db.cfweqkg4axxx.ap-northeast-2.rds.amazonaws.com:5432/postgres?sslmode=require

# Redis (AWS ElastiCache Valkey)
REDIS_URL=redis://fandom-lounge-cache-irtmsn.serverless.apn2.cache.amazonaws.com:6379

# JWT
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=fandom-lounge-media

# CORS
CORS_ORIGIN=https://fandom-lounge.vercel.app,http://localhost:3000
```

---

## 인프라 구성 (AWS)

### 현재 배포 환경

| 서비스         | 리소스                 | 상태                         |
| -------------- | ---------------------- | ---------------------------- |
| **Frontend**   | Vercel                 | ✅ 운영 중                   |
| **API Server** | AWS EC2 (t2.micro)     | ✅ 운영 중                   |
| **Database**   | AWS RDS PostgreSQL     | ✅ 운영 중                   |
| **Cache**      | AWS ElastiCache Valkey | ⚠️ 연결 실패 (fallback 모드) |
| **Storage**    | AWS S3                 | ✅ 운영 중                   |
| **SSL**        | Caddy (Let's Encrypt)  | ✅ 자동 갱신                 |
| **CI/CD**      | GitHub Actions         | ✅ 자동 배포                 |
| **보안**       | fail2ban               | ✅ SSH 보호                  |

### 엔드포인트

- **API**: https://api.fandom-lounge.com
- **Frontend**: https://fandom-lounge.vercel.app (또는 Vercel preview URL)

### EC2 서버 정보

- **Public IP**: 43.200.179.28
- **SSH Key**: `~/Downloads/fandom-lounge-key.pem`
- **App Directory**: `/home/ec2-user/app`
- **PM2 Process**: `fandom-api`
- **Caddy Config**: `/home/ec2-user/Caddyfile`

### 도메인 (가비아)

- **fandom-lounge.com**: 메인 도메인
- **api.fandom-lounge.com**: API 서버 (A 레코드 → EC2 IP)

---

## 완료된 작업

### AWS 마이그레이션 (2024.12.14)

- [x] Neon DB → AWS RDS PostgreSQL 마이그레이션
- [x] Railway → AWS EC2 마이그레이션
- [x] Cloudflare R2 → AWS S3 전환
- [x] GitHub Actions CI/CD 구성
- [x] Caddy로 자동 HTTPS 설정
- [x] fail2ban 설치 (SSH 보호)
- [x] 도메인 연결 (api.fandom-lounge.com)

### 기능 개선

- [x] 라운지 탈퇴 실패 시 에러 팝업 표시
- [x] 매니저 관리 기능 (임명/해제) 구현
- [x] 로그인/회원가입 페이지에 홈 링크 추가 (로고 클릭)
- [x] CORS 설정 - 모든 vercel.app 도메인 허용
- [x] 다크 모드 구현
- [x] 모바일 반응형 개선
- [x] 게시물 이미지/영상 업로드 (MediaUploader 컴포넌트)

---

## TODO: 앞으로 해야 할 작업

### 우선순위 높음

- [ ] **이메일 서비스 구현 (AWS SES)**
  - 도메인 인증 필요 (fandom-lounge.com)
  - 가비아 DNS에 DKIM/SPF 레코드 추가
  - SES 샌드박스 해제 요청
- [ ] **비밀번호 찾기/초기화 기능**
  - 이메일로 초기화 링크 발송
  - 토큰 기반 비밀번호 재설정
- [ ] **회원가입 이메일 인증**
  - 인증 이메일 발송
  - 이메일 미인증 시 기능 제한

### 우선순위 중간

- [ ] **ElastiCache Valkey 연결 수정**
  - 보안 그룹 설정 확인 (EC2 → ElastiCache)
  - 현재 fallback 모드로 동작 중
- [ ] **프로필 수정 기능**
  - 프로필 이미지 업로드 UI 추가
  - 닉네임 변경 기능
  - 비밀번호 변경 기능
- [ ] **라운지 아이콘/커버 이미지 업로드 UI**
  - API는 구현됨, 설정 페이지에 업로드 UI 추가 필요
- [ ] **알림 기능 개선**
- [ ] **검색 기능 개선**

### 우선순위 낮음

- [ ] **소셜 로그인** (카카오, 구글)
- [ ] **성능 최적화**
- [ ] **테스트 커버리지 확대**

---

## 삭제 완료된 서비스

- ~~Neon DB~~ (PostgreSQL) → AWS RDS로 이전
- ~~Railway~~ (API 서버) → AWS EC2로 이전
- ~~Upstash~~ (Redis) → AWS ElastiCache로 이전

---

## 참고 문서

- [Next.js App Router](https://nextjs.org/docs/app)
- [NestJS](https://docs.nestjs.com/)
- [Prisma](https://www.prisma.io/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query)
- [AWS SES](https://docs.aws.amazon.com/ses/)
- [Caddy](https://caddyserver.com/docs/)
