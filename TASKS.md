# Claude Code 태스크 목록 - 팬덤 라운지 MVP

> 각 태스크를 순서대로 Claude Code에 전달하세요.
> 태스크 완료 후 다음 태스크로 진행합니다.

---

## 📋 태스크 체크리스트

| #   | 태스크                  | 예상 시간 | 의존성 | 상태                       |
| --- | ----------------------- | --------- | ------ | -------------------------- |
| 1   | 프로젝트 초기 설정      | 30분      | -      | ✅ 완료                    |
| 2   | DB 스키마 설계          | 1시간     | #1     | ✅ 완료 (기존 스키마 적용) |
| 3   | 인증 시스템 (Backend)   | 2시간     | #2     | ✅ 완료                    |
| 4   | 인증 시스템 (Frontend)  | 2시간     | #3     | ✅ 완료                    |
| 5   | 라운지 CRUD (Backend)   | 2시간     | #3     | ✅ 완료                    |
| 6   | 라운지 UI (Frontend)    | 2시간     | #4, #5 | 대기                       |
| 7   | 게시물 시스템 (Backend) | 2시간     | #5     | 대기                       |
| 8   | 게시물 UI (Frontend)    | 3시간     | #6, #7 | 대기                       |
| 9   | 댓글 시스템             | 1.5시간   | #7     | 대기                       |
| 10  | 미디어 업로드           | 2시간     | #7     | 대기                       |
| 11  | 추천/비추천 시스템      | 1시간     | #7     | 대기                       |
| 12  | 검색 기능               | 1.5시간   | #5, #7 | 대기                       |
| 13  | 알림 시스템             | 2시간     | #9     | 대기                       |
| 14  | 관리자 기능             | 2시간     | All    | 대기                       |
| 15  | 배포 설정               | 1시간     | All    | 대기                       |

**총 예상 시간: 약 24시간**

---

## TASK 1: 프로젝트 초기 설정

### 프롬프트

```
팬덤 커뮤니티 플랫폼 "팬덤 라운지" 프로젝트를 초기 설정해줘.

기술 스택:
- Monorepo: Turborepo + pnpm
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS
- Backend: NestJS, TypeScript, Prisma
- 공유 패키지: @fandom/shared (타입, 유틸)

구조:
fandom-lounge/
├── apps/
│   ├── web/          # Next.js
│   └── api/          # NestJS
├── packages/
│   └── shared/       # 공유 타입
├── turbo.json
├── pnpm-workspace.yaml
└── package.json

설정 사항:
1. TypeScript strict 모드
2. ESLint + Prettier 설정
3. Husky + lint-staged (커밋 전 린트)
4. apps/web에 shadcn/ui 초기화
5. apps/api에 Prisma 초기화
6. 로컬 개발용 docker-compose.yml (PostgreSQL, Redis)
7. 환경변수 템플릿 (.env.example)

.claude/rules.md 파일의 규칙을 따라서 설정해줘.
```

### 완료 기준

- [ ] `pnpm install` 성공
- [ ] `pnpm dev` 실행 시 웹/API 동시 실행
- [ ] `docker-compose up -d`로 DB/Redis 실행
- [ ] TypeScript 컴파일 에러 없음

---

## TASK 2: DB 스키마 설계

### 프롬프트

```
Prisma 스키마를 설계해줘. apps/api/prisma/schema.prisma

필요한 모델:

1. User (사용자)
   - id, email, password, nickname, profileImage
   - provider (LOCAL, KAKAO, GOOGLE)
   - role (USER, ADMIN)
   - isActive, createdAt, updatedAt, deletedAt

2. Lounge (라운지 - 커뮤니티)
   - id, name, slug (URL용), description
   - coverImage, icon
   - isOfficial (공식 인증 여부)
   - creatorId (생성자)
   - memberCount (캐시용)
   - postCount (캐시용)
   - isActive, createdAt, updatedAt

3. LoungeManager (라운지 매니저)
   - userId, loungeId
   - role (OWNER, MANAGER)
   - createdAt

4. LoungeMember (라운지 멤버)
   - userId, loungeId
   - joinedAt

5. Post (게시물)
   - id, loungeId, authorId
   - type (TEXT, IMAGE, VIDEO, CLIP, FANART)
   - title (nullable), content
   - isAnonymous
   - viewCount, upvoteCount, downvoteCount, commentCount
   - isPinned, isNotice
   - createdAt, updatedAt, deletedAt

6. PostMedia (게시물 미디어)
   - id, postId
   - type (IMAGE, VIDEO)
   - url, thumbnailUrl
   - width, height, duration
   - order

7. PostTag (게시물 태그)
   - id, postId, tag

8. ClipInfo (클립 정보 - Post와 1:1)
   - postId
   - sourceUrl, platform (YOUTUBE, TWITCH)
   - startTime, endTime
   - creatorName

9. Comment (댓글)
   - id, postId, authorId
   - parentId (대댓글)
   - content, isAnonymous
   - upvoteCount, downvoteCount
   - createdAt, updatedAt, deletedAt

10. Vote (추천/비추천)
    - userId, postId (or commentId)
    - type (UPVOTE, DOWNVOTE)
    - createdAt

11. Notification (알림)
    - id, userId
    - type (COMMENT, REPLY, VOTE, MENTION)
    - referenceId, referenceType
    - message, isRead
    - createdAt

규칙:
- Soft delete 적용 (deletedAt)
- 적절한 인덱스 추가
- 관계 설정 명확히
- @@map으로 테이블명은 snake_case

스키마 작성 후:
- npx prisma generate
- npx prisma db push (개발용)
```

### 완료 기준

- [ ] 스키마 문법 에러 없음
- [ ] `prisma generate` 성공
- [ ] 관계 설정 정확

---

## TASK 3: 인증 시스템 (Backend)

### 프롬프트

```
NestJS 인증 시스템을 구현해줘.

기능:
1. 회원가입 (이메일)
   - POST /auth/register
   - email, password, nickname 검증
   - 비밀번호 bcrypt 해싱

2. 로그인
   - POST /auth/login
   - JWT Access Token (15분) + Refresh Token (7일)
   - Refresh Token은 Redis에 저장

3. 토큰 갱신
   - POST /auth/refresh
   - Refresh Token으로 새 Access Token 발급

4. 로그아웃
   - POST /auth/logout
   - Redis에서 Refresh Token 삭제

5. 소셜 로그인 (카카오, 구글)
   - GET /auth/kakao
   - GET /auth/kakao/callback
   - GET /auth/google
   - GET /auth/google/callback
   - 기존 이메일 있으면 연동, 없으면 새 계정

6. 내 정보 조회
   - GET /auth/me
   - 인증 필요

구현 사항:
- JwtAuthGuard (인증 가드)
- OptionalAuthGuard (선택적 인증)
- CurrentUser 데코레이터
- Passport 전략 (Local, JWT, Kakao, Google)

Zod 스키마 (packages/shared에 정의):
- RegisterSchema
- LoginSchema
- TokenResponseSchema

에러 코드:
- AUTH_INVALID_CREDENTIALS
- AUTH_EMAIL_EXISTS
- AUTH_TOKEN_EXPIRED
- AUTH_REFRESH_TOKEN_INVALID
```

### 완료 기준

- [ ] 회원가입/로그인 테스트 통과
- [ ] JWT 발급 및 검증 동작
- [ ] Refresh Token 갱신 동작
- [ ] Guards 정상 동작

---

## TASK 4: 인증 시스템 (Frontend)

### 프롬프트

```
Next.js 인증 UI와 상태 관리를 구현해줘.

페이지:
1. /login - 로그인 페이지
   - 이메일/비밀번호 폼
   - 소셜 로그인 버튼 (카카오, 구글)
   - 회원가입 링크

2. /register - 회원가입 페이지
   - 이메일, 비밀번호, 비밀번호 확인, 닉네임
   - 실시간 유효성 검사
   - 이용약관 동의

컴포넌트:
- LoginForm
- RegisterForm
- SocialLoginButtons
- AuthLayout (auth 페이지 공통 레이아웃)

상태 관리 (Zustand - stores/authStore.ts):
- user: User | null
- isAuthenticated: boolean
- isLoading: boolean
- login(email, password): Promise<void>
- register(data): Promise<void>
- logout(): Promise<void>
- refreshToken(): Promise<void>

API 클라이언트 (lib/api.ts):
- Axios 인스턴스
- 인터셉터로 토큰 자동 첨부
- 401 시 자동 토큰 갱신
- 갱신 실패 시 로그아웃

훅:
- useAuth() - authStore 사용
- useRequireAuth() - 미인증시 리다이렉트

토큰 저장:
- Access Token: 메모리 (Zustand)
- Refresh Token: httpOnly 쿠키 (보안)

미들웨어:
- middleware.ts에서 보호 경로 체크
```

### 완료 기준

- [ ] 로그인/회원가입 폼 동작
- [ ] 토큰 자동 갱신 동작
- [ ] 보호 라우트 리다이렉트 동작

---

## TASK 5: 라운지 CRUD (Backend)

### 프롬프트

```
라운지(커뮤니티) API를 구현해줘.

엔드포인트:
1. GET /lounges
   - 라운지 목록 (페이지네이션)
   - 정렬: popular(인기순), recent(최신순), name(이름순)
   - 검색: ?q=검색어

2. GET /lounges/:slug
   - 라운지 상세 (slug로 조회)
   - 매니저 목록 포함

3. POST /lounges
   - 라운지 생성 (인증 필수)
   - name, slug(자동생성 가능), description
   - 생성자는 자동으로 OWNER
   - 유저당 생성 제한: 2개

4. PATCH /lounges/:id
   - 라운지 수정 (OWNER/MANAGER만)
   - name, description, coverImage, icon

5. DELETE /lounges/:id
   - 라운지 삭제 (OWNER만)
   - Soft delete

6. POST /lounges/:id/join
   - 라운지 가입

7. DELETE /lounges/:id/leave
   - 라운지 탈퇴

8. POST /lounges/:id/managers
   - 매니저 추가 (OWNER만)

9. DELETE /lounges/:id/managers/:userId
   - 매니저 삭제 (OWNER만)

서비스 로직:
- slug 중복 체크
- memberCount, postCount 업데이트 (트랜잭션)
- 캐싱: 인기 라운지 목록 (Redis, 5분)

DTO:
- CreateLoungeDto
- UpdateLoungeDto
- LoungeResponseDto
- LoungeListQueryDto
```

### 완료 기준

- [ ] CRUD API 동작
- [ ] 권한 검사 동작
- [ ] 페이지네이션 동작

---

## TASK 6: 라운지 UI (Frontend)

### 프롬프트

```
라운지 관련 UI를 구현해줘.

페이지:
1. / (홈)
   - 인기 라운지 목록
   - 최신 라운지 목록
   - 라운지 검색
   - 라운지 생성 버튼

2. /lounge/[slug]
   - 라운지 메인 (게시물 목록은 다음 태스크)
   - 라운지 정보 헤더 (이름, 설명, 멤버수)
   - 가입/탈퇴 버튼
   - 게시물 작성 버튼

3. /lounge/create
   - 라운지 생성 폼
   - 이름, 설명 입력
   - slug 자동 생성 (이름 기반)

4. /lounge/[slug]/settings (OWNER/MANAGER만)
   - 라운지 설정
   - 정보 수정
   - 매니저 관리
   - 라운지 삭제

컴포넌트:
- LoungeCard (라운지 카드)
- LoungeHeader (라운지 상세 헤더)
- LoungeList (라운지 목록)
- LoungeCreateForm
- LoungeSettingsForm
- ManagerList

레이아웃:
- MainLayout (헤더, 사이드바, 푸터)
- Header (로고, 검색, 유저 메뉴)
- Sidebar (내 라운지 목록)
- MobileNav (모바일 하단 네비게이션)

반응형:
- 모바일: 카드 1열, 하단 네비게이션
- 태블릿: 카드 2열
- 데스크탑: 카드 3-4열, 사이드바
```

### 완료 기준

- [ ] 홈 페이지 라운지 목록 표시
- [ ] 라운지 생성/수정 폼 동작
- [ ] 반응형 레이아웃 동작

---

## TASK 7: 게시물 시스템 (Backend)

### 프롬프트

```
게시물 API를 구현해줘.

엔드포인트:
1. GET /lounges/:loungeId/posts
   - 게시물 목록 (페이지네이션)
   - 정렬: recent, popular, comments
   - 필터: type (TEXT, IMAGE, VIDEO, CLIP, FANART)
   - 태그 필터: ?tag=태그

2. GET /posts/:id
   - 게시물 상세
   - 조회수 증가 (Redis로 디바운스)
   - 미디어, 태그, 클립정보 포함

3. POST /lounges/:loungeId/posts
   - 게시물 작성 (인증 필수)
   - type, title, content, tags
   - isAnonymous 옵션

4. PATCH /posts/:id
   - 게시물 수정 (작성자만)
   - 익명 게시물은 수정 불가? (정책 결정)

5. DELETE /posts/:id
   - 게시물 삭제 (작성자 또는 매니저)
   - Soft delete

6. POST /posts/:id/pin
   - 게시물 고정 (매니저만)

7. POST /posts/:id/notice
   - 공지로 설정 (매니저만)

서비스 로직:
- 게시물 수 업데이트 (라운지)
- 조회수 처리 (IP + 유저 기반, Redis 24시간)
- 인기 게시물 계산 (추천수 * 2 + 댓글수)

DTO:
- CreatePostDto
- UpdatePostDto
- PostResponseDto
- PostListQueryDto
```

### 완료 기준

- [ ] CRUD API 동작
- [ ] 필터/정렬 동작
- [ ] 조회수 중복 방지

---

## TASK 8: 게시물 UI (Frontend)

### 프롬프트

```
게시물 관련 UI를 구현해줘.

라운지 페이지 내 게시물:
- 탭: 전체 / 인기 / 이미지 / 클립 / 팬아트
- 무한 스크롤 또는 페이지네이션
- 게시물 카드 목록

게시물 카드 (PostCard):
- 제목 (없으면 내용 미리보기)
- 작성자 (익명이면 "익명")
- 이미지 썸네일 (있으면)
- 추천수, 댓글수, 조회수
- 작성 시간 (상대 시간)

게시물 상세 페이지 (/post/[id]):
- 제목, 내용
- 미디어 갤러리 (이미지 여러장 슬라이드)
- 클립 정보 (YouTube 임베드)
- 태그
- 추천/비추천 버튼
- 댓글 (다음 태스크)
- 공유 버튼

게시물 작성 페이지 (/lounge/[slug]/write):
- 타입 선택: 일반글 / 이미지 / 클립 / 팬아트
- 제목 (선택)
- 내용 (에디터)
- 이미지 업로드 (드래그앤드롭)
- 클립 URL 입력 (YouTube 파싱)
- 태그 입력
- 익명 체크박스
- 미리보기

컴포넌트:
- PostCard
- PostList
- PostDetail
- PostForm
- MediaUploader
- ClipInput (YouTube URL 파싱)
- TagInput
- ImageGallery
- YouTubeEmbed

에디터:
- 간단한 텍스트 에디터 (textarea 또는 간단한 WYSIWYG)
- 마크다운 지원 고려
```

### 완료 기준

- [ ] 게시물 목록/상세 표시
- [ ] 게시물 작성 폼 동작
- [ ] 이미지 업로드 UI 동작

---

## TASK 9: 댓글 시스템

### 프롬프트

```
댓글 시스템을 구현해줘.

Backend API:
1. GET /posts/:postId/comments
   - 댓글 목록 (대댓글 포함)
   - 정렬: recent, popular

2. POST /posts/:postId/comments
   - 댓글 작성
   - content, isAnonymous
   - parentId (대댓글)

3. PATCH /comments/:id
   - 댓글 수정 (작성자만)

4. DELETE /comments/:id
   - 댓글 삭제 (작성자 또는 매니저)

Frontend:
- CommentList 컴포넌트
- CommentItem (대댓글 들여쓰기)
- CommentForm
- 익명 옵션
- 추천/비추천 버튼

로직:
- 대댓글 1단계까지만 (대대댓글 X)
- 삭제된 댓글: "삭제된 댓글입니다" 표시
- 댓글 수 업데이트 (게시물)
```

### 완료 기준

- [ ] 댓글 CRUD 동작
- [ ] 대댓글 동작
- [ ] 실시간 댓글 수 반영

---

## TASK 10: 미디어 업로드

### 프롬프트

```
Cloudflare R2를 이용한 미디어 업로드 시스템을 구현해줘.

Backend:
1. POST /media/presigned-url
   - Presigned URL 발급
   - 파일 타입, 크기 검증
   - 허용: jpg, png, gif, webp, mp4, webm
   - 최대 크기: 이미지 10MB, 영상 100MB

2. POST /media/complete
   - 업로드 완료 처리
   - DB에 미디어 정보 저장
   - 썸네일 URL 생성 (이미지)

Frontend:
- MediaUploader 컴포넌트
- 드래그앤드롭 지원
- 업로드 진행률 표시
- 미리보기
- 다중 업로드 (최대 10개)

이미지 처리:
- 클라이언트에서 리사이즈 (최대 1920px)
- WebP 변환 고려
- EXIF 방향 보정

R2 설정:
- 버킷: fandom-lounge-media
- 퍼블릭 액세스 설정
- CORS 설정
```

### 완료 기준

- [ ] Presigned URL 발급 동작
- [ ] 파일 업로드 동작
- [ ] 이미지 미리보기 동작

---

## TASK 11: 추천/비추천 시스템

### 프롬프트

```
추천/비추천 시스템을 구현해줘.

Backend API:
1. POST /posts/:id/vote
   - body: { type: 'UPVOTE' | 'DOWNVOTE' }
   - 토글: 같은 타입 다시 누르면 취소
   - 반대 타입 누르면 변경

2. POST /comments/:id/vote
   - 동일한 로직

응답:
- { upvoteCount, downvoteCount, userVote: 'UPVOTE' | 'DOWNVOTE' | null }

Frontend:
- VoteButtons 컴포넌트
- 추천/비추천 버튼 + 카운트
- 내 투표 상태 표시 (색상 변경)
- 낙관적 업데이트

로직:
- 익명 게시물에도 투표 가능
- 본인 게시물에 투표 가능/불가능? (정책 결정)
- Rate limiting: 분당 30회
```

### 완료 기준

- [ ] 투표 토글 동작
- [ ] 카운트 실시간 반영
- [ ] 낙관적 업데이트 동작

---

## TASK 12: 검색 기능

### 프롬프트

```
검색 기능을 구현해줘.

Backend API:
1. GET /search
   - ?q=검색어&type=lounge|post|all
   - 라운지: 이름, 설명 검색
   - 게시물: 제목, 내용 검색
   - 태그 검색: #태그명

2. GET /search/tags
   - 인기 태그 목록
   - ?q=태그검색 (자동완성용)

검색 로직:
- PostgreSQL Full-text search
- 한글 형태소 분석 (pg_bigm 또는 기본)
- 검색어 하이라이팅

Frontend:
- 헤더 검색바
- 검색 결과 페이지 (/search?q=검색어)
- 탭: 전체 / 라운지 / 게시물
- 태그 자동완성
- 최근 검색어 (로컬스토리지)

컴포넌트:
- SearchBar
- SearchResults
- TagAutocomplete
- RecentSearches
```

### 완료 기준

- [ ] 라운지/게시물 검색 동작
- [ ] 태그 자동완성 동작
- [ ] 검색 결과 표시

---

## TASK 13: 알림 시스템

### 프롬프트

```
알림 시스템을 구현해줘.

Backend:
1. GET /notifications
   - 내 알림 목록 (페이지네이션)
   - 안읽은 알림 우선

2. POST /notifications/:id/read
   - 알림 읽음 처리

3. POST /notifications/read-all
   - 전체 읽음 처리

4. GET /notifications/unread-count
   - 안읽은 알림 수 (헤더용)

알림 생성 트리거:
- 내 게시물에 댓글
- 내 댓글에 대댓글
- 내 게시물에 추천 (10개 단위)
- 멘션 (@닉네임)

알림 서비스:
- NotificationService.create()
- 이벤트 기반 (NestJS EventEmitter)

Frontend:
- NotificationDropdown (헤더)
- NotificationList
- 알림 클릭 시 해당 페이지로 이동
- 안읽은 알림 뱃지

실시간 (선택):
- 초기에는 Polling (30초)
- 이후 SSE 또는 WebSocket 추가
```

### 완료 기준

- [ ] 알림 생성 동작
- [ ] 알림 목록 표시
- [ ] 읽음 처리 동작

---

## TASK 14: 관리자 기능

### 프롬프트

```
관리자/매니저 기능을 구현해줘.

라운지 매니저 기능:
1. 게시물 관리
   - 삭제/블라인드 처리
   - 공지로 설정
   - 고정

2. 댓글 관리
   - 삭제

3. 유저 관리 (라운지 내)
   - 차단 (loungeId + userId)
   - 차단 해제

4. 라운지 설정
   - 정보 수정
   - 규칙 설정 (마크다운)
   - 매니저 추가/삭제 (OWNER만)

플랫폼 관리자 (ADMIN):
1. GET /admin/lounges - 전체 라운지 관리
2. GET /admin/users - 전체 유저 관리
3. POST /admin/lounges/:id/verify - 공식 인증
4. 신고 처리

Frontend:
- /lounge/[slug]/manage - 라운지 관리 페이지
- /admin - 플랫폼 관리자 대시보드 (기본만)

컴포넌트:
- ManagePostList
- ManageCommentList
- BannedUserList
- LoungeRulesEditor
```

### 완료 기준

- [ ] 매니저 기능 동작
- [ ] 차단 기능 동작
- [ ] 권한 검사 정확

---

## TASK 15: 배포 설정

### 프롬프트

```
프로덕션 배포 설정을 해줘.

Frontend (Vercel):
1. vercel.json 설정
2. 환경변수 설정 가이드
3. 빌드 명령어 확인

Backend (Railway):
1. Dockerfile
2. railway.json 또는 설정 가이드
3. 환경변수 설정 가이드
4. 헬스체크 엔드포인트

Database (Neon):
1. 연결 문자열 설정
2. Connection pooling 설정
3. Prisma migrate deploy 스크립트

Redis (Upstash):
1. 연결 설정

Storage (Cloudflare R2):
1. 버킷 생성 가이드
2. CORS 설정
3. 퍼블릭 액세스 설정

CI/CD (GitHub Actions):
1. 린트 체크
2. 타입 체크
3. 테스트 (있으면)
4. 자동 배포 트리거

모니터링:
- 에러 로깅 (Sentry 연동 준비)
- 헬스체크

문서:
- 배포 체크리스트
- 환경변수 전체 목록
```

### 완료 기준

- [ ] 로컬에서 프로덕션 빌드 성공
- [ ] Docker 이미지 빌드 성공
- [ ] 배포 가이드 문서 완성

---

## 🚀 빠른 시작 가이드

### 1. 프로젝트 클론 후 Claude Code 실행

```bash
# 프로젝트 디렉토리 생성
mkdir fandom-lounge && cd fandom-lounge

# Claude Code 실행
claude

# TASK 1 프롬프트 복사-붙여넣기
```

### 2. 태스크 진행 팁

1. **한 번에 하나씩**: 태스크 완료 확인 후 다음으로
2. **에러 발생 시**: 에러 메시지 전체를 Claude Code에 전달
3. **수정 필요 시**: 구체적으로 어떤 부분이 문제인지 설명
4. **테스트**: 각 태스크 후 수동 테스트로 동작 확인

### 3. 예상 소요 시간

- **집중 개발**: 3-4일 (하루 6-8시간)
- **파트타임**: 1-2주

---

## ⚠️ 주의사항

1. **환경변수**: 실제 값은 .env에만, 절대 커밋하지 않기
2. **API 키**: 소셜 로그인은 각 플랫폼에서 앱 등록 필요
3. **도메인**: 배포 전 도메인 준비 (Vercel 무료 도메인 가능)
4. **테스트 계정**: 카카오/구글 테스트 계정 준비
