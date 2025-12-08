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
- **Database**: PostgreSQL (Neon)
- **Cache**: Redis (Upstash)
- **Storage**: Cloudflare R2 (S3 호환)
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
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL=
```

### Backend (.env)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=
JWT_REFRESH_SECRET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_ENDPOINT=
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## 참고 문서

- [Next.js App Router](https://nextjs.org/docs/app)
- [NestJS](https://docs.nestjs.com/)
- [Prisma](https://www.prisma.io/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query)
